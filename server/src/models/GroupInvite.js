const mongoose = require('mongoose');

const groupInviteSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  groupId: {
    type: String
  },
  groupName: {
    type: String,
  },
  sender: {
    type: String, // username
    required: true
  },
  receiver: {
    type: String, // username
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroupInvite', groupInviteSchema);
