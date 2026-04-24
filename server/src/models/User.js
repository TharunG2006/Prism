const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  codeExpiry: Date,
  passwordHash: {
    type: String,
    required: true,
  },
  publicKey: String,
  encryptedPrivateKey: String,
  salt: String,
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline',
  },
  lastSeen: Date,
  vaultPinHash: {
    type: String,
    default: null,
  },
  vaultedUsers: [{
    type: String, // Array of usernames
  }]
}, {
  timestamps: true,
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Static methods to replace the previous dynamic ones
const User = mongoose.model('User', userSchema);

const userModel = {
  create: async (userData) => {
    return await User.create(userData);
  },
  findByUsername: async (username) => {
    return await User.findOne({ username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  },
  searchByUsername: async (query) => {
    return await User.find({ 
      username: { $regex: query, $options: 'i' },
      isVerified: true 
    });
  },
  findByEmail: async (email) => {
    return await User.findOne({ email });
  },
  verifyEmail: async (username, token) => {
    return await User.findOneAndUpdate(
      { username, verificationToken: token },
      { isVerified: true, $unset: { verificationToken: "", codeExpiry: "" } },
      { new: true }
    );
  },
  updateStatus: async (username, status) => {
    return await User.findOneAndUpdate(
      { username },
      { status, lastSeen: new Date() },
      { new: true }
    );
  },
  updateVerificationCode: async (username, code, expiry) => {
    return await User.findOneAndUpdate(
      { username },
      { verificationToken: code, codeExpiry: expiry },
      { new: true }
    );
  },
  deleteUser: async (username) => {
    return await User.findOneAndDelete({ username });
  },
  resetAllOnline: async () => {
    return await User.updateMany(
      { status: 'online' },
      { status: 'offline', lastSeen: new Date() }
    );
  },
  setupVaultPin: async (username, pinHash) => {
    return await User.findOneAndUpdate(
      { username },
      { vaultPinHash: pinHash },
      { new: true }
    );
  },
  getVaultPinHash: async (username) => {
    const user = await User.findOne({ username });
    return user ? user.vaultPinHash : null;
  },
  toggleVaultChat: async (username, partnerUsername) => {
    const user = await User.findOne({ username });
    if (!user) return null;
    
    const isVaulted = user.vaultedUsers.includes(partnerUsername);
    if (isVaulted) {
      user.vaultedUsers = user.vaultedUsers.filter(u => u !== partnerUsername);
    } else {
      user.vaultedUsers.push(partnerUsername);
    }
    await user.save();
    return !isVaulted; // Return new vaulted status
  }
};

module.exports = userModel;
