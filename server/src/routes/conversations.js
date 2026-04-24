const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');

// @route   GET api/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // MongoDB makes querying mid-array easy
    const conversations = await Conversation.find({ 
      participants: req.user.id 
    }).sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/conversations
// @desc    Create or get a conversation
// @access  Private
router.post('/', auth, async (req, res) => {
  const { participantId, type = 'private', name } = req.body;

  try {
    // For this implementation, we simply create a new conversation ID
    const newConv = await Conversation.create({
      type,
      participants: type === 'private' ? [req.user.id, participantId] : req.body.participants,
      name: type === 'group' ? name : undefined
    });

    res.json(newConv);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
