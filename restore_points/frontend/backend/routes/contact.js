const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Alias email for contact form
const aliasEmail = 'tcaibiznes@gmail.com';

// Configure transporter (use a real SMTP service in production)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or another provider
  auth: {
    user: 'your.alias@email.com', // your email
    pass: 'your-app-password' // app password or real password
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, message, honeypot } = req.body;
  // Simple honeypot spam protection
  if (honeypot && honeypot.trim() !== '') {
    return res.status(429).send('Spam detected');
  }
  try {
    await transporter.sendMail({
      from: email,
      to: aliasEmail,
      subject: `Contact Form Submission from ${name}`,
      text: message
    });
    res.status(200).send('Message sent');
  } catch (err) {
    res.status(500).send('Error sending message');
  }
});

module.exports = router;
