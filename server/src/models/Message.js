const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String, // String for now to match current logic, or ObjectId if we refactor more
    required: true,
    index: true,
  },
  senderId: {
    type: String, // Matching username for now as per current logic
    required: true,
  },
  encryptedContent: String,
  encryptedKey: String,
  senderEncryptedKey: String,
  iv: String,
  signature: String,
  clientId: {
    type: String,
    sparse: true,
  },
  // File sharing fields
  fileName: String,
  fileUrl: String,
  fileSize: Number,
  mimeType: String,
  fileType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  // Multi-cast group encryption
  groupKeys: [{
    userId: String,
    encryptedKey: String
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  deletedFor: [{
    type: String,
    index: true
  }],
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Message = mongoose.model('Message', messageSchema);

// Conversation Meta schema to track recent chats (replacing SK logic in Dynamo)
const conversationMetaSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  partnerId: { type: String, required: true },
  lastTimestamp: Date,
}, { timestamps: true });

const ConversationMeta = mongoose.model('ConversationMeta', conversationMetaSchema);

const messageModel = {
  create: async (msgData) => {
    const message = await Message.create(msgData);
    
    // Update/Create Conversation Metadata for both participants
    // Use senderId as-is (original case) to match User.findByUsername
    const senderId = msgData.senderId;
    // Determine the partner from the conversationId
    const parts = msgData.conversationId.split('_');
    // We need original-cased partner. Since conversationId is lowercased,
    // we can't rely on it. Store both directions using senderId and derive partner.
    // The partnerId must be passed explicitly in msgData.
    const recipientId = msgData.recipientId;

    if (senderId && recipientId) {
      await Promise.all([
        ConversationMeta.findOneAndUpdate(
          { userId: senderId, partnerId: recipientId },
          { lastTimestamp: new Date() },
          { upsert: true, returnDocument: 'after' }
        ),
        ConversationMeta.findOneAndUpdate(
          { userId: recipientId, partnerId: senderId },
          { lastTimestamp: new Date() },
          { upsert: true, returnDocument: 'after' }
        )
      ]);
    }

    return message;
  },

  getRecentConversations: async (userId) => {
    return await ConversationMeta.find({ 
      userId: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).sort({ lastTimestamp: -1 });
  },

  getByConversation: async (conversationId, limit = 50, userId = null) => {
    const query = { conversationId };
    if (userId) {
      query.deletedFor = { $ne: userId.toLowerCase() };
    }
    return await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
  },

  deleteByConversation: async (conversationId, userId) => {
    if (!userId) return;
    
    // Find messages in conversation that don't already have user in deletedFor
    await Message.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId.toLowerCase() } }
    );
  }
};

module.exports = messageModel;
