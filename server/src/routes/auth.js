const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { sendVerificationCode, generateVerificationCode } = require('../services/email');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user (does NOT issue token - must verify first)
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, publicKey, encryptedPrivateKey, salt, email, phone } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    // Check if username exists
    let user = await User.findByUsername(username);
    if (user) {
      return res.status(400).json({ msg: 'Username already taken' });
    }

    // Check if email exists
    let emailUser = await User.findByEmail(email);
    if (emailUser) {
      return res.status(400).json({ msg: 'Email already registered' });
    }

    // Generate 6-digit code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const newUser = await User.create({
      username,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      publicKey,
      encryptedPrivateKey,
      salt,
      verificationToken: verificationCode,
      codeExpiry,
      status: 'offline'
    });

    // Send the code via email
    await sendVerificationCode(email, verificationCode);

    // Do NOT issue a JWT token here - user must verify first
    res.json({ 
      msg: 'Verification code sent to your email',
      requiresVerification: true,
      username: newUser.username
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/verify
// @desc    Verify email with 6-digit code
// @access  Public
router.post('/verify', async (req, res) => {
  const { username, code } = req.body;
  try {
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ msg: 'Email already verified' });
    }

    // Check code expiry
    if (new Date() > new Date(user.codeExpiry)) {
      return res.status(400).json({ msg: 'Verification code expired. Please register again.' });
    }

    // Check code match
    if (user.verificationToken !== code) {
      return res.status(400).json({ msg: 'Invalid verification code' });
    }

    // Mark as verified
    await User.verifyEmail(username, code);

    // NOW issue the JWT token
    const payload = { user: { id: user.username } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user.username, 
            username: user.username,
            publicKey: user.publicKey,
            encryptedPrivateKey: user.encryptedPrivateKey,
            salt: user.salt,
            isVerified: true,
            vaultedUsers: user.vaultedUsers || []
          } 
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: 'Verification failed' });
  }
});

// @route   POST api/auth/resend-code
// @desc    Resend verification code
// @access  Public
router.post('/resend-code', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'Already verified' });

    const newCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await User.updateVerificationCode(username, newCode, codeExpiry);
    await sendVerificationCode(user.email, newCode);

    res.json({ msg: 'New verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token (only if verified)
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Block login if not verified
    if (!user.isVerified) {
      return res.status(403).json({ msg: 'Please verify your email first', requiresVerification: true, username: user.username });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    await User.updateStatus(username, 'online');

    const payload = { user: { id: user.username } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user.username, 
            username: user.username,
            publicKey: user.publicKey,
            encryptedPrivateKey: user.encryptedPrivateKey,
            salt: user.salt,
            isVerified: user.isVerified,
            vaultedUsers: user.vaultedUsers || []
          } 
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/vault-setup
// @desc    Setup vault PIN
// @access  Private
router.post('/vault-setup', auth, async (req, res) => {
  const { pin } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    await User.setupVaultPin(req.user.id, pinHash);
    res.json({ msg: 'Vault PIN configured successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/vault-unlock
// @desc    Verify vault PIN
// @access  Private
router.post('/vault-unlock', auth, async (req, res) => {
  const { pin } = req.body;
  try {
    const pinHash = await User.getVaultPinHash(req.user.id);
    if (!pinHash) {
      return res.status(400).json({ msg: 'Vault PIN not configured' });
    }
    const isMatch = await bcrypt.compare(pin, pinHash);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Incorrect Vault PIN' });
    }
    res.json({ msg: 'Vault unlocked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/vault-status
// @desc    Check if vault PIN is configured
// @access  Private
router.get('/vault-status', auth, async (req, res) => {
  try {
    const pinHash = await User.getVaultPinHash(req.user.id);
    res.json({ isConfigured: !!pinHash });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

const { webcrypto: cryptoNode } = require('crypto');

// @route   POST api/auth/emergency-fix
// @desc    Emergency script to force-reset an account's crypto keys directly from the live DB connection
// @access  Public
router.post('/emergency-fix', async (req, res) => {
  const { username, newPassword } = req.body;
  try {
    const user = await User.findByUsername(username);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Generate new RSA keys
    const RSA_PARAMS = {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    };
    
    const keyPair = await cryptoNode.subtle.generateKey(RSA_PARAMS, true, ["encrypt", "decrypt"]);
    const exportedPubKey = await cryptoNode.subtle.exportKey("spki", keyPair.publicKey);
    const pubKeyBody = btoa(String.fromCharCode(...new Uint8Array(exportedPubKey)));
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${pubKeyBody.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;

    // Derive Master Key
    const salt = cryptoNode.randomUUID();
    const enc = new TextEncoder();
    const passwordKey = await cryptoNode.subtle.importKey("raw", enc.encode(newPassword), "PBKDF2", false, ["deriveKey"]);

    const masterKey = await cryptoNode.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // Encrypt Private Key
    const exportedPrivKey = await cryptoNode.subtle.exportKey("pkcs8", keyPair.privateKey);
    const iv = cryptoNode.getRandomValues(new Uint8Array(12));
    const encrypted = await cryptoNode.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, exportedPrivKey);

    const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedPrivateKey = `${encryptedData}:${ivBase64}`;

    const bcryptSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, bcryptSalt);



    user.passwordHash = passwordHash;
    user.publicKey = publicKeyPem;
    user.encryptedPrivateKey = encryptedPrivateKey;
    user.salt = salt;
    await user.save();

    res.json({ msg: `Successfully reset keys for ${username}. You can now login with the new password.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
