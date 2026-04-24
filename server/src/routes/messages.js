const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

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
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for chat files
});

// @route   POST api/messages/upload
// @desc    Upload an encrypted file for a message
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const { filename, mimeType, size } = req.body;
    
    // Create a secure folder name
    const folderName = `prism_messages/${req.user.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: folderName },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ msg: 'File upload failed' });
        }

        res.json({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          fileName: filename,
          fileSize: parseInt(size) || req.file.size,
          mimeType: mimeType || 'application/octet-stream'
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/messages/conversations
// @desc    Get list of recent conversation partners
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const showVaulted = req.query.vaulted === 'true';
    const user = await User.findByUsername(req.user.id);
    const vaultedUsers = user ? (user.vaultedUsers || []) : [];

    const meta = await Message.getRecentConversations(req.user.id);
    
    // 1. Fetch DMs
    const dmPartners = await Promise.all(meta.filter(m => {
      const isVaulted = vaultedUsers.includes(m.partnerId);
      return showVaulted ? isVaulted : !isVaulted;
    }).map(async (m) => {
      const partner = await User.findByUsername(m.partnerId);
      if (partner) {
        return {
          _id: partner.username,
          username: partner.username,
          type: 'private',
          publicKey: partner.publicKey,
          status: partner.status || 'offline',
          lastTimestamp: m.lastTimestamp
        };
      }
      return null;
    }));

    // 2. Fetch Groups only if not in vaulted view (groups aren't vaulted yet)
    let joinedGroups = [];
    if (!showVaulted) {
      const groups = await Conversation.find({ participants: req.user.id, type: 'group' });
      joinedGroups = groups.map(g => ({
        ...g.toObject ? g.toObject() : g,
        username: g.name, // compatibility
        status: 'online', // groups are conceptually "online"
        lastTimestamp: g.updatedAt
      }));
    }

    // Combine and Sort
    const conversations = [...dmPartners.filter(Boolean), ...joinedGroups].sort((a, b) => 
      new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    );

    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/messages/:conversationId
// @desc    Get message history for a conversation
// @access  Private
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const cid = req.params.conversationId.toLowerCase();
    console.log(`[API] Fetching history for: ${cid}`);
    const messages = await Message.getByConversation(cid, 500, req.user.id);
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/messages/:conversationId
// @desc    Soft-delete all messages in a conversation for the user
// @access  Private
router.delete('/:conversationId', auth, async (req, res) => {
  try {
    await Message.deleteByConversation(req.params.conversationId.toLowerCase(), req.user.id);
    res.json({ msg: 'Conversation deleted for user' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
