const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String, 
    required: true,
    index: true,
  },
  senderId: {
    type: String, 
    required: true,
  },
  recipientId: String, // Used for DM metadata tracking
  encryptedContent: String,
  encryptedKey: String,
  senderEncryptedKey: String,
  iv: String,
  signature: String,
  clientId: {
    type: String,
    sparse: true,
  },
  fileName: String,
  fileUrl: String,
  fileSize: Number,
  mimeType: String,
  fileType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
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

// DM Metadata tracking schema
const conversationMetaSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  partnerId: { type: String, required: true },
  lastTimestamp: Date,
}, { timestamps: true });

const ConversationMeta = mongoose.model('ConversationMeta', conversationMetaSchema);

// MIDDLEWARE: Automatically update DM metadata when a message is saved
messageSchema.post('save', async function(doc) {
  const senderId = doc.senderId;
  const recipientId = doc.recipientId;

  // Only track for DMs (where recipientId is present)
  if (senderId && recipientId) {
    try {
      await Promise.all([
        ConversationMeta.findOneAndUpdate(
          { userId: senderId, partnerId: recipientId },
          { lastTimestamp: new Date() },
          { upsert: true }
        ),
        ConversationMeta.findOneAndUpdate(
          { userId: recipientId, partnerId: senderId },
          { lastTimestamp: new Date() },
          { upsert: true }
        )
      ]);
    } catch (err) {
      console.error('[META_SYNC] Failed to update DM metadata:', err.message);
    }
  }
});

// STATICS
messageSchema.statics.getRecentConversations = async function(userId) {
  return await ConversationMeta.find({ 
    userId: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  }).sort({ lastTimestamp: -1 });
};

messageSchema.statics.getByConversation = async function(conversationId, limit = 50, userId = null) {
  const query = { conversationId };
  if (userId) {
    query.deletedFor = { $ne: userId.toLowerCase() };
  }
  return await this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

messageSchema.statics.deleteByConversation = async function(conversationId, userId) {
  if (!userId) return;
  await this.updateMany(
    { conversationId },
    { $addToSet: { deletedFor: userId.toLowerCase() } }
  );
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
