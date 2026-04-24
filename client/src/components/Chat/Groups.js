import { Users, Plus, Hash, ShieldCheck, Search, MessageSquare, ArrowRight, Check, X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react';
import axios from 'axios';
import CreateGroupModal from './CreateGroupModal';

export default function Groups({ onSelectGroup, currentUser, refreshSignal, onGroupsChanged }) {
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [refreshSignal]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations`, {
        headers: { 'x-auth-token': token }
      });
      setGroups(res.data.filter(c => c.type === 'group'));
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const token = localStorage.getItem('prism_token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/invites/pending`, {
        headers: { 'x-auth-token': token }
      });
      setInvites(res.data);
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const handleInviteAction = async (invite, action) => {
    try {
      const token = localStorage.getItem('prism_token');
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/invites/${invite._id}`, { action }, { headers: { 'x-auth-token': token } });
      setInvites(invites.filter(i => i._id !== invite._id));
      if (action === 'accept') {
        fetchGroups();
      }
      if (onGroupsChanged) onGroupsChanged();
    } catch (err) {
      console.error('Error updating invite:', err);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setGroups([newGroup, ...groups]);
    onSelectGroup(newGroup);
  };

  const handleDeleteGroup = async (e, groupId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this group protocol? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('prism_token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${groupId}`, {
        headers: { 'x-auth-token': token }
      });
      setGroups(groups.filter(g => g._id !== groupId));
    } catch (err) {
      console.error('Error deleting group:', err);
      alert(err.response?.data?.msg || 'Error deleting group');
    }
  };

  return (
    <div className="h-full w-full flex flex-col theme-bg relative">
      <header className="p-6 flex items-center justify-between theme-bg-secondary sticky top-0 z-20" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h2 className="text-lg font-black theme-text uppercase tracking-widest flex items-center gap-2">
            <Users className="text-indigo-500" />
            Decentralized Groups
          </h2>
          <p className="text-[10px] uppercase tracking-widest theme-text-muted font-bold mt-1">Encrypted Multi-Link Comms</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="prism-button px-4 py-2 flex items-center gap-2 text-[10px]"
        >
          <Plus size={14} /> NEW GROUP
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : groups.length === 0 && invites.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center"
          >
            <div className="w-24 h-24 mx-auto bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-[-10px_-10px_30px_#ffffff,10px_10px_30px_#d1d9e6] dark:shadow-[-10px_-10px_30px_#18191c,10px_10px_30px_#0a0b0e]">
              <Hash className="w-12 h-12 text-indigo-500" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3">
              No Active Groups
            </h3>
            
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-loose mb-8">
              You are not currently part of any decentralized group protocols. Initialize a new one to start multi-cast encrypted communication.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="prism-button px-8 py-4 flex items-center gap-3 text-xs"
            >
              <Plus size={18} /> CREATE FIRST GROUP
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8">
            {invites.length > 0 && (
              <div>
                <h3 className="text-xs font-black theme-text uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-500" />
                  Pending Invitations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {invites.map(invite => (
                    <div key={invite._id} className="theme-bg-card border theme-border rounded-xl p-4 flex flex-col justify-between" style={{ border: '1px solid var(--border-color)' }}>
                      <div>
                        <p className="text-sm font-black theme-text uppercase tracking-wider">{invite.groupName}</p>
                        <p className="text-[10px] theme-text-muted uppercase tracking-widest mt-1 opacity-70">Invited by: @{invite.sender}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t theme-border border-white/5">
                        <button onClick={() => handleInviteAction(invite, 'accept')} className="flex-1 py-2 rounded bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors text-[10px] font-black tracking-widest uppercase gap-1">
                          <Check size={12} /> Accept
                        </button>
                        <button onClick={() => handleInviteAction(invite, 'reject')} className="flex-1 py-2 rounded bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors text-[10px] font-black tracking-widest uppercase gap-1">
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {groups.length > 0 && (
              <div>
                {invites.length > 0 && (
                  <h3 className="text-xs font-black theme-text uppercase tracking-[0.2em] mb-4 mt-2">
                    Active Protocols
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <motion.div
                key={group._id}
                layoutId={group._id}
                whileHover={{ y: -5 }}
                onClick={() => onSelectGroup(group)}
                className="prism-card p-6 cursor-pointer group hover:bg-indigo-500/5 transition-all duration-300"
                style={{ border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <img 
                      src={group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.name}`} 
                      className="w-14 h-14 rounded-2xl shadow-xl"
                      alt={group.name}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-lg flex items-center justify-center border-2 border-[var(--bg-card)]">
                      <ShieldCheck size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="text-[10px] theme-text-muted font-bold uppercase tracking-tighter bg-white/5 px-2 py-1 rounded">
                    {group.participants?.length || 0} MEMBERS
                  </div>
                  {group.admins?.includes(currentUser?.username) && (
                    <button 
                      onClick={(e) => handleDeleteGroup(e, group._id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                      title="Delete Protocol"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <h4 className="text-base font-black theme-text uppercase tracking-wider mb-1 truncate">{group.name}</h4>
                <p className="text-[10px] theme-text-muted font-bold uppercase tracking-widest line-clamp-2 min-h-[30px] opacity-70">
                  {group.description || 'No mission description provided for this protocol.'}
                </p>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-indigo-500" />
                      <span className="text-[9px] font-black theme-text-muted uppercase tracking-widest">Active Link</span>
                   </div>
                   <motion.div 
                     whileHover={{ x: 5 }}
                     className="text-indigo-400"
                   >
                      <ArrowRight size={18} />
                   </motion.div>
                </div>
              </motion.div>
            ))}
                </div>
              </div>
            )}
            
            {groups.length === 0 && invites.length > 0 && (
              <div className="text-center p-8 mt-4 border border-dashed theme-border rounded-2xl bg-indigo-500/5">
                <p className="text-[10px] font-black theme-text-muted uppercase tracking-[0.2em]">No Active Groups. Accept pending invitations to begin.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <CreateGroupModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        onGroupCreated={(newGroup) => {
          handleGroupCreated(newGroup);
          if (onGroupsChanged) onGroupsChanged();
        }}
      />
    </div>
  )
}
