const express = require('express');
const router = express.Router();

// @route   POST api/contact
// @desc    Submit a contact form message
// @access  Public
router.post('/', async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // In a production app, you would save this to a database
    // or send an email using nodemailer.
    // For now, we will log it to the console as a "Secure Transmission Received".
    console.log('--- NEW CONTACT MESSAGE RECEIVED ---');
    console.log(`From: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('------------------------------------');

    res.json({ msg: 'Message received by Prism Secure Node.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
