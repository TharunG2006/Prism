import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Plus, ShieldCheck, UserMinus, Trash2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function GroupSettingsModal({ isOpen, onClose, group, currentUser, onGroupUpdated, onGroupDeleted }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const isAdmin = group?.admins?.includes(currentUser.id);

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchUsers();
    }
  }, [isOpen, isAdmin]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=`, {
        headers: { 'x-auth-token': token }
      });
      // Filter out users already in the group
      setUsers(res.data.filter(u => !group.participants.includes(u.username)));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleInvite = async (username) => {
    setLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const token = localStorage.getItem('prism_token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${group._id}/invites`, 
        { username },
        { headers: { 'x-auth-token': token } }
      );
      setInviteSuccess(`Invitation sent to ${username}`);
    } catch (err) {
      setInviteError(err.response?.data?.msg || 'Error sending invite');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (username) => {
    if (!window.confirm(`Are you sure you want to promote ${username} to Admin?`)) return;
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${group._id}/admins`, 
        { username },
        { headers: { 'x-auth-token': token } }
      );
      onGroupUpdated(res.data);
    } catch (err) {
      console.error('Error promoting admin:', err);
    }
  };

  const handleRemove = async (username) => {
    const isSelf = username === currentUser.id;
    const msg = isSelf ? "Are you sure you want to leave this group?" : `Are you sure you want to remove ${username}?`;
    if (!window.confirm(msg)) return;
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${group._id}/members/${username}`, {
        headers: { 'x-auth-token': token }
      });
      if (isSelf) {
        onGroupDeleted(group._id); // We left, so group goes away for us
      } else {
        onGroupUpdated(res.data.group);
      }
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this group for everyone? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem('prism_token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${group._id}`, {
        headers: { 'x-auth-token': token }
      });
      onGroupDeleted(group._id);
    } catch (err) {
      console.error('Error deleting group:', err);
      const errorMsg = err.response?.data?.msg || err.message || 'Unknown error occurred';
      alert(`CRITICAL ERROR: Protocol decommission failed. [${errorMsg}]`);
    }
  };

  if (!group) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="theme-bg-card shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <div className="p-6 border-b theme-border flex items-center justify-between bg-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black theme-text uppercase tracking-widest">{group.name} Settings</h2>
                  <p className="text-[10px] theme-text-muted font-bold uppercase tracking-tighter">Protocol Management</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors">
                <X size={20} className="theme-text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Members Section */}
              <section>
                <h3 className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em] mb-4">Participants ({group.participants.length})</h3>
                <div className="space-y-2">
                  {group.participants.map(username => {
                    const userIsAdmin = group.admins.includes(username);
                    const isSelf = username === currentUser.id;
                    const canRemove = isAdmin || isSelf; // Admin can remove anyone except creator maybe handled by backend, self can leave
                    
                    return (
                      <div key={username} className="flex items-center justify-between p-3 rounded-xl border theme-border theme-bg-secondary">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${username}`}
                            className="w-8 h-8 rounded-lg"
                            alt=""
                          />
                          <div>
                            <p className="text-xs font-bold theme-text flex items-center gap-2">
                              @{username} {isSelf && <span className="text-[9px] bg-indigo-500/20 text-indigo-500 px-1 rounded uppercase">You</span>}
                            </p>
                            {userIsAdmin ? (
                              <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                <Shield size={10} /> Admin
                              </p>
                            ) : (
                              <p className="text-[9px] theme-text-muted uppercase tracking-tighter mt-0.5">Member</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isAdmin && !userIsAdmin && (
                            <button onClick={() => handlePromote(username)} title="Promote to Admin" className="p-1.5 hover:bg-indigo-500/10 text-indigo-500 rounded-lg transition-colors">
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          {canRemove && (
                            <button onClick={() => handleRemove(username)} title={isSelf ? "Leave Group" : "Remove User"} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Invite Section (Admin Only) */}
              {isAdmin && (
                <section>
                  <h3 className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em] mb-4">Invite New Members</h3>
                  <div className="relative mb-3">
                    <input
                      className="prism-input w-full pl-9 py-2 text-xs"
                      placeholder="Search users to invite..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  
                  {inviteSuccess && <p className="text-xs text-green-500 mb-2 font-bold">{inviteSuccess}</p>}
                  {inviteError && <p className="text-xs text-red-500 mb-2 font-bold">{inviteError}</p>}
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).map(user => (
                      <div key={user.username} className="p-3 rounded-xl border theme-border theme-bg-secondary flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`} className="w-8 h-8 rounded-lg" alt="" />
                          <p className="text-xs font-bold theme-text">@{user.username}</p>
                        </div>
                        <button 
                          disabled={loading}
                          onClick={() => handleInvite(user.username)}
                          className="px-3 py-1.5 bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30 rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-[10px] theme-text-muted uppercase text-center w-full my-4">No eligible participants found.</p>}
                  </div>
                </section>
              )}

            </div>

            {isAdmin && (
              <div className="p-6 border-t theme-border bg-red-500/5">
                <button
                  onClick={handleDeleteGroup}
                  className="w-full py-3 flex items-center justify-center gap-2 font-black tracking-[0.2em] text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors text-xs"
                >
                  <ShieldAlert size={16} />
                  DELETE ENTIRE PROTOCOL
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
