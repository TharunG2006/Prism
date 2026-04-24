const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const GroupInvite = require('../models/GroupInvite');

// @route   POST api/groups
// @desc    Create a new group
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, participants, description, avatar } = req.body;

  try {
    // ONLY add the creator initially as an active participant to enforce 3-Way Handshake
    const members = [req.user.id];
    
    const newGroup = await Conversation.create({
      type: 'group',
      name,
      participants: members,
      createdBy: req.user.id,
      admins: [req.user.id],
      description,
      avatar
    });

    // Fire invitations for everyone else seamlessly
    const invitePromises = participants.map(username => {
      if (username !== req.user.id) {
        return GroupInvite.create({
          group: newGroup._id,
          groupId: newGroup._id.toString(),
          groupName: newGroup.name,
          sender: req.user.id,
          receiver: username
        });
      }
      return null;
    });

    await Promise.all(invitePromises.filter(Boolean));

    res.json(newGroup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/invites/pending
// @desc    Get pending group invites for current user
// @access  Private
router.get('/invites/pending', auth, async (req, res) => {
  try {
    const invites = await GroupInvite.find({ receiver: req.user.id, status: 'pending' }).sort({ createdAt: -1 });
    res.json(invites);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/groups/invites/:inviteId
// @desc    Accept or reject a group invite
// @access  Private
router.put('/invites/:inviteId', auth, async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  try {
    const invite = await GroupInvite.findById(req.params.inviteId);
    if (!invite) return res.status(404).json({ msg: 'Invite not found' });
    if (invite.receiver !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    if (invite.status !== 'pending') return res.status(400).json({ msg: 'Invite already processed' });

    invite.status = action === 'accept' ? 'accepted' : 'rejected';
    await invite.save();

    if (action === 'accept') {
      const group = await Conversation.findById(invite.group);
      if (group && !group.participants.includes(req.user.id)) {
        group.participants.push(req.user.id);
        await group.save();
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      // BROADCAST KEY FIX: Notify EVERY participant individually to guarantee sync without refreshes
      const groupData = await Conversation.findById(invite.group);
      if (groupData) {
        groupData.participants.forEach(pId => {
          io.to(pId.toString()).emit('group_update', { groupId: invite.group.toString(), type: 'member_joined' });
        });
      }
      // Explicitly notify the joiner as well
      io.to(req.user.id).emit('group_update', { groupId: invite.group.toString(), type: 'invite_processed' });
    }

    res.json(invite);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/:id
// @desc    Get group details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group || group.type !== 'group') {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a participant
    if (!group.participants.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/groups/:id/members
// @desc    Add members to group
// @access  Private
router.put('/:id/members', auth, async (req, res) => {
  const { members } = req.body;
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // Only admins can add members
    if (!group.admins.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Only admins can add members' });
    }

    const updatedParticipants = [...new Set([...group.participants, ...members])];
    group.participants = updatedParticipants;
    await group.save();

    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id/members/:username
// @desc    Remove member from group or leave
// @access  Private
router.delete('/:id/members/:username', auth, async (req, res) => {
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    const targetUser = req.params.username;
    const isSelf = targetUser === req.user.id;
    const isAdmin = group.admins.includes(req.user.id);

    if (!isSelf && !isAdmin) {
      return res.status(401).json({ msg: 'Not authorized to remove members' });
    }

    // Cannot remove the creator
    if (targetUser === group.createdBy && !isSelf) {
      return res.status(400).json({ msg: 'Cannot remove the group creator' });
    }

    group.participants = group.participants.filter(p => p !== targetUser);
    group.admins = group.admins.filter(p => p !== targetUser);
    
    // If no participants left, delete group? For now just save.
    await group.save();

    // Identify the target user's ID for socket notification
    let targetUserId = targetUser;
    const userObj = await User.findByUsername(targetUser);
    if (userObj) {
      targetUserId = userObj._id.toString();
    }

    const io = req.app.get('socketio');
    if (io) {
      // BROADCAST KEY FIX: Notify EVERY participant (including old ones) individually
      const allNotified = [...group.participants, targetUserId]; // Include the person who just left/removed
      [...new Set(allNotified)].forEach(pId => {
        io.to(pId.toString()).emit('group_update', { groupId: req.params.id, type: 'member_left', username: targetUser });
      });
      // Specifically target for immediate removal UI
      io.to(targetUserId).emit('group_update', { groupId: req.params.id, type: 'removed' });
    }

    res.json({ msg: 'Member removed', group });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/groups/:id/invites
// @desc    Admin invites a user to the group
// @access  Private
router.post('/:id/invites', auth, async (req, res) => {
  const { username } = req.body;
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (!group.admins.includes(req.user.id)) return res.status(401).json({ msg: 'Only admins can invite' });
    if (group.participants.includes(username)) return res.status(400).json({ msg: 'User already in group' });

    const existingInvite = await GroupInvite.findOne({ group: group._id, receiver: username, status: 'pending' });
    if (existingInvite) return res.status(400).json({ msg: 'Invite already pending' });

    const invite = await GroupInvite.create({
      group: group._id,
      groupId: group._id.toString(),
      groupName: group.name,
      sender: req.user.id,
      receiver: username
    });

    // BROADCAST KEY FIX: Notify the receiver individually to show the invite instantly
    const receiverObj = await User.findByUsername(username);
    const io = req.app.get('socketio');
    if (io && receiverObj) {
      io.to(receiverObj._id.toString()).emit('group_update', { type: 'invite_received', groupId: group._id.toString() });
    }

    res.json(invite);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id
// @desc    Admin deletes group
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`[DELETE_GROUP] Attempting to decommission group: ${req.params.id} by user: ${req.user.id}`);
    const group = await Conversation.findById(req.params.id);
    if (!group) {
        console.error(`[DELETE_GROUP] Group not found: ${req.params.id}`);
        return res.status(404).json({ msg: 'Group not found' });
    }

    console.log(`[DELETE_GROUP] Group details: Name="${group.name}", Admins=[${group.admins.join(', ')}]`);

    if (!group.admins.includes(req.user.id)) {
      console.warn(`[DELETE_GROUP] Unauthorized deletion attempt by ${req.user.id}`);
      return res.status(401).json({ msg: 'Only admins can decommission the protocol link' });
    }

    console.log('[DELETE_GROUP] Authorization successful. Removing from DB...');
    
    // BROADCAST KEY FIX: Capture all participants BEFORE purging
    const participantsToNotify = [...group.participants];

    // Remove the group field from messages first (soft purge)
    await Message.updateMany({ conversationId: req.params.id }, { $unset: { conversationId: "" } });
    
    // Hard purge group
    await Conversation.findByIdAndDelete(req.params.id);
    await GroupInvite.deleteMany({ group: req.params.id });

    console.log('[DELETE_GROUP] Decommissioning complete.');

    const io = req.app.get('socketio');
    if (io) {
      // BROADCAST KEY FIX: Notify everyone who WAS in the group individually
      participantsToNotify.forEach(pId => {
        io.to(pId.toString()).emit('group_update', { groupId: req.params.id, type: 'group_deleted' });
      });
      // Fallback for safety
      io.to(req.params.id).emit('group_update', { groupId: req.params.id, type: 'group_deleted' });
    }

    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(`[DELETE_GROUP] CRITICAL FAILURE: ${err.message}`);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/groups/:id/admins
// @desc    Admin promotes a member to admin
// @access  Private
router.put('/:id/admins', auth, async (req, res) => {
  const { username } = req.body;
  try {
    const group = await Conversation.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    if (!group.admins.includes(req.user.id)) return res.status(401).json({ msg: 'Only admins can promote members' });
    if (!group.participants.includes(username)) return res.status(400).json({ msg: 'User is not a participant' });
    if (group.admins.includes(username)) return res.status(400).json({ msg: 'User is already an admin' });

    group.admins.push(username);
    await group.save();

    const io = req.app.get('socketio');
    if (io) {
      // BROADCAST KEY FIX: Notify EVERY participant individually
      group.participants.forEach(pId => {
        io.to(pId.toString()).emit('group_update', { groupId: req.params.id, type: 'admin_promoted', username });
      });
    }

    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
