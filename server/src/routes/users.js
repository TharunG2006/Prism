const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/users/search
// @desc    Search users by username (partial match)
// @access  Private
router.get('/search', auth, async (req, res) => {
  const query = req.query.q;
  try {
    const users = await User.searchByUsername(query);
    
    // Filter out the current user and return formatted results
    const results = users
      .filter(u => u.username !== req.user.id)
      .map(u => ({
        _id: u.username,
        username: u.username,
        publicKey: u.publicKey,
        status: u.status || 'offline'
      }));

    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:username/public-key
// @desc    Get user's public key
// @access  Private
router.get('/:username/public-key', auth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ publicKey: user.publicKey });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
