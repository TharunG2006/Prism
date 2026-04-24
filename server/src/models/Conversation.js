const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
  },
  participants: [{
    type: String, // Matching usernames for now
  }],
  name: String,
  createdBy: {
    type: String,
    required: true
  },
  admins: [{
    type: String
  }],
  description: String,
  avatar: String,
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
});

const Conversation = mongoose.model('Conversation', conversationSchema);

const conversationModel = {
  create: async (convData) => {
    return await Conversation.create(convData);
  },

  findById: async (id) => {
    return await Conversation.findById(id);
  },
  
  find: async (query) => {
    return await Conversation.find(query);
  },

  findByIdAndDelete: async (id) => {
    return await Conversation.findByIdAndDelete(id);
  },

  deleteOne: async (query) => {
    return await Conversation.deleteOne(query);
  }
};

module.exports = conversationModel;
