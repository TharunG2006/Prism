const Message = require('../models/Message');
const User = require('../models/User');

// Track online users to handle multiple sessions/tabs
// Key: username (canonical identity), Value: Set of socket IDs
const onlineUsers = new Map();

// Helper: mark a user fully offline
async function markUserOffline(io, username) {
  onlineUsers.delete(username);
  try {
    await User.updateStatus(username, 'offline');
    io.emit('user_status_changed', { userId: username, status: 'offline' });
    console.log(`[SOCKET] User ${username} is now fully offline`);
  } catch (err) {
    console.error(`[SOCKET] Failed to update status for ${username}:`, err);
  }
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    let currentUsername = null;  // Always store the username, not MongoDB ID
    let currentMongoId = null;   // Store MongoDB ID for room joins

    socket.on('join', async (userId) => {
      if (!userId) return;

      // Resolve the user to get both username and MongoDB ID
      const user = await User.findByUsername(userId);
      if (!user) {
        console.warn(`[SOCKET] User not found for join: ${userId}`);
        return;
      }

      currentUsername = user.username;       // e.g. "Sanjay"
      currentMongoId = user._id.toString();  // e.g. "69d61a928449fe23944f47c0"

      // Join BOTH username and MongoDB ID rooms for maximum compatibility
      socket.join(currentUsername);
      socket.join(currentMongoId);
      
      // Join rooms for all groups the user is in
      try {
        const Conversation = require('../models/Conversation');
        const userGroups = await Conversation.find({ 
          type: 'group', 
          participants: { $in: [currentUsername, currentMongoId] }
        });
        userGroups.forEach(group => {
          socket.join(group._id.toString());
          console.log(`[SOCKET] User ${currentUsername} auto-joined group room: ${group._id}`);
        });
      } catch (err) {
        console.error(`[SOCKET] Error auto-joining groups for ${currentUsername}:`, err);
      }

      // Initialize or update tracking using USERNAME as the key
      if (!onlineUsers.has(currentUsername)) {
        onlineUsers.set(currentUsername, new Set());
        // First session connecting: Update DB to 'online'
        await User.updateStatus(currentUsername, 'online');
        // Broadcast with username so clients can match
        io.emit('user_status_changed', { userId: currentUsername, status: 'online' });
        console.log(`[SOCKET] User ${currentUsername} is now ONLINE`);
      }
      onlineUsers.get(currentUsername).add(socket.id);
      
      // Send the list of ALL currently online users to this newly connected client
      // so it can show correct statuses for users who were already online
      const onlineList = Array.from(onlineUsers.keys());
      socket.emit('online_users', onlineList);
      
      console.log(`[SOCKET] User ${currentUsername} joined. Sessions: ${onlineUsers.get(currentUsername).size}. Online users: [${onlineList.join(', ')}]`);
    });

    // Explicit logout — immediately go offline regardless of other tabs
    socket.on('logout', async (userId) => {
      // Always prefer the tracked username over the argument
      const username = currentUsername || userId;
      if (!username) return;
      console.log(`[SOCKET] Explicit logout from ${username}`);
      await markUserOffline(io, username);
      currentUsername = null;
      currentMongoId = null;
    });

    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
      console.log(`[SOCKET] Socket ${socket.id} manually joined room: ${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      const { recipientId, senderId, groupId } = data;
      
      // Determine the target room
      const room = groupId || [senderId.toLowerCase(), recipientId.toLowerCase()].sort().join('_');
      
      // Ensure the sender is in the room
      socket.join(room);
      
      try {
        const messageData = {
          conversationId: room,
          senderId,
          recipientId: groupId ? undefined : recipientId,
          encryptedContent: data.encryptedContent,
          encryptedKey: data.encryptedKey,
          senderEncryptedKey: data.senderEncryptedKey,
          groupKeys: data.groupKeys, // Multicast keys
          iv: data.iv,
          signature: data.signature,
          clientId: data.clientId,
          status: 'sent',
          // File support
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          fileType: data.fileType || 'text'
        };

        const savedMsg = await Message.create(messageData);
        const msgObj = savedMsg.toObject ? savedMsg.toObject() : savedMsg;

        // Broadcast to the room
        io.to(room).emit('receive_message', {
          ...msgObj,
          text: null
        });
        
        // Notifications
        if (groupId) {
           // For groups, we could notify all participants, but that's heavy. 
           // For now, reliance is on the room broadcast.
        } else {
          io.to(recipientId).emit('receive_notification', { senderId });
        }
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      if (currentUsername && onlineUsers.has(currentUsername)) {
        const userSessions = onlineUsers.get(currentUsername);
        userSessions.delete(socket.id);
        
        if (userSessions.size === 0) {
          await markUserOffline(io, currentUsername);
        } else {
          console.log(`[SOCKET] User ${currentUsername} still has ${userSessions.size} session(s)`);
        }
      }
    });
  });
};

