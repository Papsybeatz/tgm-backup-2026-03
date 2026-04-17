const founderAuditRoutes = require('./routes/founderAudit');
app.use('/api/founder', founderAuditRoutes);

const express = require('express');
const multer = require('multer');
const { validateUpload } = require('./utils/uploadValidation');
const mongoose = require('mongoose');
const app = express();
const lemonWebhook = require('./routes/lemonWebhook');
const teamRoutes = require('./routes/team');
const teamInvitesRoutes = require('./routes/teamInvites');
const authRoutes = require('./routes/auth');
const draftsRoutes = require('./routes/drafts');
const { agentLimiter, uploadLimiter } = require('./middleware/rateLimit');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// IMPORTANT: raw body must be BEFORE json middleware

const AgencyRequest = require('./models/AgencyRequest');

app.post('/api/agency/request', async (req, res) => {
  const { name, org, email, teamSize } = req.body;
  if (!name || !org || !email || !teamSize) {
    return res.status(400).send('Missing required fields');
  }
  try {
    const request = await AgencyRequest.create({ name, org, email, teamSize });
    res.status(200).send('Request received');
    // Auto-approve after 5 minutes
    setTimeout(async () => {
      await AgencyRequest.findByIdAndUpdate(request._id, { approved: true, approvedAt: new Date() });
      // TODO: Send email with link to /agency/pricing
      console.log(`Agency request auto-approved for ${email}`);
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error('Agency request error:', err);
    res.status(500).send('Error saving request');
  }
});

app.use('/api', lemonWebhook);
const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/team', teamInvitesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/drafts', draftsRoutes);


// Sample upload endpoint (replace with real route as needed)
const upload = multer();
app.post('/api/upload', uploadLimiter, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const result = validateUpload(file);
  if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
  // TODO: Save file, process, etc.
  res.json({ success: true, message: 'File uploaded and validated.' });
});

// Example agent endpoint (rate limited)
app.post('/api/agent/call', agentLimiter, (req, res) => {
  // ...agent logic...
  res.json({ success: true, message: 'Agent call processed.' });
});

// Add JSON middleware AFTER webhook
app.use(express.json());

app.listen(4000, () => {
  console.log('Backend running on port 4000');
});
