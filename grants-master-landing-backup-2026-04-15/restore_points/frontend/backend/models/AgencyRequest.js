const mongoose = require('mongoose');

const agencyRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  org: { type: String, required: true },
  email: { type: String, required: true },
  teamSize: { type: Number, required: true },
  requestedAt: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false },
  approvedAt: { type: Date },
});

module.exports = mongoose.model('AgencyRequest', agencyRequestSchema);
