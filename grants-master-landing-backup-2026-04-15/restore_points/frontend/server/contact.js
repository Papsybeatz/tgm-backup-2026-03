// api/contact.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, honeypot } = req.body;

  // Simple honeypot spam protection
  if (honeypot && honeypot.trim() !== '') {
    return res.status(429).json({ error: 'Spam detected' });
  }

  try {
    await sgMail.send({
      to: 'tcaibiznes@gmail.com', // your alias email
      from: 'noreply@thegrantsmaster.com', // must be a verified sender in SendGrid
      subject: `Contact Form Submission from ${name}`,
      text: message,
      replyTo: email,
    });
    res.status(200).json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending message' });
  }
}
