import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shield, Plus, Check, UserPlus } from 'lucide-react';
import axios from 'axios';

export default function CreateGroupModal({ isOpen, onClose, currentUser, onGroupCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=`, {
        headers: { 'x-auth-token': token }
      });
      setUsers(res.data.filter(u => u.username !== currentUser.username));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const toggleUser = (username) => {
    if (selectedUsers.includes(username)) {
      setSelectedUsers(selectedUsers.filter(u => u !== username));
    } else {
      setSelectedUsers([...selectedUsers, username]);
    }
  };

  const handleCreate = async () => {
    if (!name || selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/groups`, {
        name,
        description,
        participants: selectedUsers,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`
      }, {
        headers: { 'x-auth-token': token }
      });
      onGroupCreated(res.data);
      onClose();
      // Reset
      setName('');
      setDescription('');
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="theme-bg-card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl rounded-2xl"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <div className="p-6 border-b theme-border flex items-center justify-between bg-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black theme-text uppercase tracking-widest">Create Secure Group</h2>
                  <p className="text-[10px] theme-text-muted font-bold uppercase tracking-tighter">N-Way Multicast Encryption</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-500/10 rounded-full transition-colors">
                <X size={20} className="theme-text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em] mb-2 block">Group Protocol Name</label>
                  <input
                    className="prism-input w-full"
                    placeholder="Enter group name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em] mb-2 block">Mission Parameters (Description)</label>
                  <textarea
                    className="prism-input w-full h-20 resize-none pt-3"
                    placeholder="What is this group for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em] mb-3 block">Recruit Participants ({selectedUsers.length} Selected)</label>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted" />
                  <input
                    className="prism-input w-full pl-9 py-2 text-xs"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).map(user => (
                    <div
                      key={user.username}
                      onClick={() => toggleUser(user.username)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedUsers.includes(user.username)
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : 'theme-bg-secondary theme-border hover:border-indigo-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                          className="w-8 h-8 rounded-lg"
                          alt=""
                        />
                        <div>
                          <p className="text-xs font-bold theme-text">{user.displayName || user.username}</p>
                          <p className="text-[9px] theme-text-muted uppercase tracking-tighter">@{user.username}</p>
                        </div>
                      </div>
                      {selectedUsers.includes(user.username) ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border theme-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t theme-border bg-indigo-500/5">
              <button
                disabled={loading || !name || selectedUsers.length === 0}
                onClick={handleCreate}
                className="prism-button w-full py-4 flex items-center justify-center gap-2 font-black tracking-[0.2em] disabled:opacity-50"
              >
                {loading ? 'INITIALIZING PROTOCOL...' : (
                  <>
                    <Shield size={18} />
                    INITIALIZE SECURE GROUP
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const Search = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);
