const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VaultItem = require('../models/VaultItem');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Side-channel logging for debugging
const debugLog = (msg) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}\n`;
    try {
        fs.appendFileSync(path.join(process.cwd(), 'vault_debug.log'), logLine);
    } catch (e) {}
    console.log(`[VAULT] ${msg}`);
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// @route   POST api/vault/upload
// @desc    Upload an encrypted file to the vault
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    debugLog(`Upload initiated by ${req.user.id}`);
    
    if (!req.file) {
      debugLog("ERROR: No file received in Multer");
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const { encryptedKey, iv, filename, mimeType, size } = req.body;
    debugLog(`Metadata received: ${filename} (${mimeType}), size: ${size}`);
    
    if (!encryptedKey || !iv || !filename) {
      debugLog("ERROR: Missing encryption metadata");
      return res.status(400).json({ msg: 'Missing encryption metadata' });
    }

    const user = await User.findByUsername(req.user.id);
    if (!user) {
      debugLog(`ERROR: User ${req.user.id} not found in database`);
      return res.status(404).json({ msg: 'User not found' });
    }
    debugLog(`User verified: ${user._id}`);

    const folderName = `prism_vault/${user.username.replace(/[^a-zA-Z0-9]/g, '_')}`;
    console.log("[VAULT] Starting Cloudinary stream to folder:", folderName);

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: folderName },
      async (error, result) => {
        if (error) {
          debugLog(`Cloudinary upload error: ${error.message}`);
          return res.status(500).json({ msg: 'File upload failed' });
        }

        debugLog(`Cloudinary upload success: ${result.secure_url}`);

        try {
          const vaultItem = new VaultItem({
            userId: user._id,
            filename,
            mimeType: mimeType || 'application/octet-stream',
            size: parseInt(size) || req.file.size,
            public_id: result.public_id,
            cloudinaryUrl: result.secure_url,
            encryptedKey,
            iv
          });

          await vaultItem.save();
          debugLog(`Database persistence success: ${vaultItem._id}`);
          res.json(vaultItem);
        } catch (dbError) {
          debugLog(`CRITICAL ERROR: ${dbError.message}`);
          await cloudinary.uploader.destroy(result.public_id, { resource_type: 'raw' });
          res.status(500).json({ msg: 'Failed to save file metadata' });
        }
      }
    );

    uploadStream.end(req.file.buffer);

  } catch (err) {
    debugLog(`CRITICAL ERROR: ${err.message}`);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ msg: 'File too large. Max 50MB.' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/vault
// @desc    Get all vault items for the user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const items = await VaultItem.find({ userId: user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/vault/:id
// @desc    Delete a vault item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.user.id);
    const item = await VaultItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ msg: 'File not found' });
    }

    if (item.userId.toString() !== user._id.toString()) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(item.public_id, { resource_type: 'raw' });

    // Delete from DB
    await VaultItem.findByIdAndDelete(req.params.id);

    res.json({ msg: 'File removed from Vault' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/vault/toggle-chat
// @desc    Move a chat to vault or back to general
// @access  Private
router.post('/toggle-chat', auth, async (req, res) => {
  const { partnerUsername } = req.body;
  try {
    const isNowVaulted = await User.toggleVaultChat(req.user.id, partnerUsername);
    res.json({ isVaulted: isNowVaulted, partnerUsername });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
