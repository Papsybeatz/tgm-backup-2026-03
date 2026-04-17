const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  lemonCustomerId: { type: String },
  tier: {
    type: String,
    enum: ['free', 'starter', 'pro', 'agency_starter', 'agency_unlimited'],
    default: 'free'
  },
  proActivatedAt: { type: Date },
  agencyActivatedAt: { type: Date },
  seats: { type: Number, default: 1 },
  maxSeats: { type: Number, default: 1 },
  maxWorkspaces: { type: Number, default: 1 },
  // ... add other fields as needed
});

const User = mongoose.model('User', userSchema);

module.exports = User;
