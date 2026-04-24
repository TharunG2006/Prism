import { useEffect, useState } from 'react'
import axios from 'axios'
import { Search, Plus, MessageCircle, Users, Settings, LogOut, ShieldCheck, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import ThemeToggle from '../ThemeToggle'

export default function Sidebar({ onSelectUser, selectedUser, currentUser, socket, privateKey, onLogout, onTabChange, vaultedUsers = [], onToggleVault, refreshSignal }) {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [recentChats, setRecentChats] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({}) // { username: count }
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chats')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const router = useRouter()

  const filteredRecentChats = recentChats.filter(chat => 
    !vaultedUsers.includes(chat.username) && 
    chat.type !== 'group'
  )

  // Deduplication helper
  const deduplicatedRecentChats = (chats) => {
    const seen = new Set();
    return chats.filter(chat => {
      const id = chat._id || chat.username;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  const finalRecentChats = deduplicatedRecentChats(recentChats);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('prism_token')
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/conversations`, {
          headers: { 'x-auth-token': token }
        })
        setRecentChats(res.data)
      } catch (err) {
        console.error('Error fetching conversations:', err)
      }
    }
    fetchConversations()
  }, [vaultedUsers, refreshSignal])

  useEffect(() => {
    if (!socket || !privateKey) return

    const handleReceive = async (data) => {
      console.log("[SIDEBAR] Received message for recent list:", data.senderId)
      
      // Check if this sender is already in recent chats
      setRecentChats(prev => {
        const exists = prev.find(c => (c._id || c.username) === data.senderId)
        if (exists) {
          // Move to top and update timestamp
          return [
            { ...exists, lastTimestamp: data.timestamp },
            ...prev.filter(c => (c._id || c.username) !== data.senderId)
          ]
        } else {
          fetchNewPartner(data.senderId)
          return prev
        }
      })
    }

    socket.on('receive_message', handleReceive)
    
    // Fallback for notifications if user is not in the specific conversation room
    const handleNotification = (data) => {
      console.log("[SIDEBAR] Received notification alert from:", data.senderId)
      if (selectedUser?.username !== data.senderId) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }))
        
        if (typeof window !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification(`New message from ${data.senderId}`, {
            body: 'Incoming encrypted message',
            icon: '/favicon.ico'
          });
        }
      }
    }
    socket.on('receive_notification', handleNotification)

    return () => {
      socket.off('receive_message', handleReceive)
      socket.off('receive_notification', handleNotification)
    }
  }, [socket, privateKey, selectedUser])

  useEffect(() => {
    if (!socket) return
    
    // Handle initial list of who is already online
    const handleOnlineUsers = (onlineList) => {
      console.log("[SIDEBAR] Online users received:", onlineList)
      setRecentChats(prev => prev.map(u => ({
        ...u,
        status: onlineList.includes(u.username) ? 'online' : (u.status || 'offline')
      })))
      setSearchResults(prev => prev.map(u => ({
        ...u,
        status: onlineList.includes(u.username) ? 'online' : (u.status || 'offline')
      })))
    }

    // Handle real-time status changes
    const handleStatusChange = (data) => {
      console.log("[SIDEBAR] Status Change:", data)
      const { userId, status } = data
      setRecentChats(prev => prev.map(u => 
        (u.username === userId || u._id === userId) ? { ...u, status } : u
      ))
      setSearchResults(prev => prev.map(u => 
        (u.username === userId || u._id === userId) ? { ...u, status } : u
      ))
    }

    socket.on('online_users', handleOnlineUsers)
    socket.on('user_status_changed', handleStatusChange)
    return () => {
      socket.off('online_users', handleOnlineUsers)
      socket.off('user_status_changed', handleStatusChange)
    }
  }, [socket])

  const fetchNewPartner = async (username) => {
    try {
      const token = localStorage.getItem('prism_token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${username}`, {
        headers: { 'x-auth-token': token }
      })
      const newUser = res.data.find(u => u.username === username)
      if (newUser) {
        setRecentChats(prev => [
          { ...newUser, lastTimestamp: new Date().toISOString() },
          ...prev.filter(c => c.username !== newUser.username)
        ])
      }
    } catch (err) {
      console.error("Failed to fetch new partner info")
    }
  }

  useEffect(() => {
    const handleSearch = async () => {
      if (search.length < 1) {
        setSearchResults([])
        return
      }
      setLoading(true)
      try {
        const token = localStorage.getItem('prism_token')
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${search}`, {
          headers: { 'x-auth-token': token }
        })
        setSearchResults(res.data)
      } catch (err) {
        console.error('Search failed')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(handleSearch, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleLogout = () => {
    if (onLogout) onLogout()
  }

  // Clear unread count when a user is selected
  useEffect(() => {
    if (selectedUser?.username) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedUser.username]: 0
      }))
    }
  }, [selectedUser?.username])

  return (
    <div className="w-[340px] h-full flex flex-col relative z-20 theme-bg" style={{ borderRight: '1px solid var(--border-color)' }}>
      {/* Profile Header */}
      <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
            {currentUser.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest theme-text uppercase">{currentUser.username}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${socket?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
              <span className="text-[10px] font-bold theme-text-muted uppercase tracking-tighter">
                {socket?.connected ? 'Secure Link Active' : 'Link Interrupted'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 theme-text-muted hover:text-red-400 transition-colors">
          <LogOut size={18} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-4 flex gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => { setActiveTab('chats'); onTabChange && onTabChange('chats'); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors ${activeTab === 'chats' ? 'theme-bg-hover theme-text' : 'theme-text-muted hover:opacity-80'}`} style={activeTab === 'chats' ? { border: '1px solid var(--border-strong)' } : { border: '1px solid transparent' }}>Chats</button>
        <button onClick={() => { setActiveTab('groups'); onTabChange && onTabChange('groups'); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors ${activeTab === 'groups' ? 'theme-bg-hover theme-text' : 'theme-text-muted hover:opacity-80'}`} style={activeTab === 'groups' ? { border: '1px solid var(--border-strong)' } : { border: '1px solid transparent' }}>Groups</button>
        <button onClick={() => { setActiveTab('vault'); onTabChange && onTabChange('vault'); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors ${activeTab === 'vault' ? 'theme-bg-hover theme-text' : 'theme-text-muted hover:opacity-80'}`} style={activeTab === 'vault' ? { border: '1px solid var(--border-strong)' } : { border: '1px solid transparent' }}>Vault</button>
      </div>

      {/* Search Area */}
      <div className="p-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted group-focus-within:text-indigo-400 transition-colors" size={16} />
          <input 
            className="prism-input w-full pl-10 text-xs py-2.5" 
            placeholder="Search decentralized identity..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {activeTab === 'chats' ? (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {search.length > 0 ? (
              <div className="space-y-4">
                 <p className="px-3 text-[9px] font-black theme-text-muted uppercase tracking-[0.3em] mt-4">Found Identities</p>
                 <div className="space-y-1">
                    {searchResults.filter(u => !vaultedUsers.includes(u.username)).map(user => (
                    <UserItem 
                      key={user._id} 
                      user={user} 
                      onClick={() => { 
                        onSelectUser(user); 
                        setSearch('');
                        setRecentChats(prev => {
                          const exists = prev.find(c => c._id === user._id || c._id === user.username);
                          if (exists) return prev;
                          return [{ ...user, lastTimestamp: new Date().toISOString() }, ...prev];
                        });
                      }} 
                      onVault={() => onToggleVault && onToggleVault(user.username)}
                      isVaulted={false}
                      unreadCount={unreadCounts[user.username] || 0}
                    />
                    ))}
                 </div>
              </div>
            ) : filteredRecentChats.length > 0 ? (
              <div className="space-y-4">
                <p className="px-3 text-[9px] font-black theme-text-muted uppercase tracking-[0.3em] mt-4">Recent Decrypted</p>
                <div className="space-y-1">
                  {deduplicatedRecentChats(filteredRecentChats).map(chat => (
                    <UserItem 
                      key={chat._id || chat.username} 
                      user={chat} 
                      onClick={() => onSelectUser(chat)} 
                      isRecent 
                      onVault={() => onToggleVault && onToggleVault(chat.username)}
                      isVaulted={false}
                      unreadCount={unreadCounts[chat.username] || 0}
                    />
                  ))}
                </div>
              </div>
            ) : !loading && (
              <div className="p-10 text-center opacity-20">
                <MessageCircle className="mx-auto mb-4" size={32} />
                <p className="text-[10px] font-bold tracking-widest uppercase">No Recent Chats</p>
              </div>
            )}
          </>
        ) : activeTab === 'groups' ? (
          <div className="space-y-4">
             <p className="px-3 text-[9px] font-black theme-text-muted uppercase tracking-[0.3em] mt-4">Active Protocol Links</p>
             <div className="space-y-1">
                {finalRecentChats.filter(c => c.type === 'group').map(group => (
                  <UserItem 
                    key={group._id} 
                    user={group} 
                    onClick={() => onSelectUser(group)}
                  />
                ))}
                {finalRecentChats.filter(c => c.type === 'group').length === 0 && (
                  <div className="p-10 text-center opacity-20">
                    <Users className="mx-auto mb-4" size={32} />
                    <p className="text-[10px] font-bold tracking-widest uppercase">No Joined Groups</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="p-10 text-center opacity-20 mt-10">
            <ShieldCheck className="mx-auto mb-4" size={32} />
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2">Secure File Vault</p>
            <p className="text-[9px] tracking-widest uppercase">Security Services Active</p>
            <p className="text-[9px] tracking-widest mt-1 uppercase">End-to-End Encryption Enabled</p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-6 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <button onClick={() => document.querySelector('input[placeholder="Search decentralized identity..."]')?.focus()} className="prism-button w-full py-2.5 text-xs flex items-center justify-center gap-2">
            <Plus size={16} /> New Conversation
        </button>
        <div className="flex gap-2">
            <button onClick={() => setSettingsOpen(true)} className="flex-1 p-2 rounded-lg flex items-center justify-center theme-text-muted transition-colors hover:text-indigo-400" style={{ background: 'var(--bg-hover)' }}>
                <Settings size={18} />
            </button>
            <ThemeToggle />
            <button onClick={() => { setActiveTab('groups'); onTabChange && onTabChange('groups'); }} className="flex-1 p-2 rounded-lg flex items-center justify-center theme-text-muted transition-colors hover:text-indigo-400" style={{ background: 'var(--bg-hover)' }}>
                <Users size={18} />
            </button>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal 
            currentUser={currentUser} 
            onClose={() => setSettingsOpen(false)} 
            onLogout={handleLogout} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function UserItem({ user, onClick, isRecent, onVault, isVaulted, unreadCount }) {
    const isGroup = user.type === 'group';
    const displayName = isGroup ? user.name : user.username;
    const initial = displayName ? displayName[0] : '?';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group cursor-pointer ${unreadCount > 0 ? 'bg-indigo-600/5' : ''}`}
            style={{ 
              border: unreadCount > 0 ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid transparent',
              boxShadow: unreadCount > 0 ? '0 0 15px rgba(79, 70, 229, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={(e) => { 
                e.currentTarget.style.background = unreadCount > 0 ? 'rgba(79, 70, 229, 0.05)' : 'transparent'; 
                e.currentTarget.style.borderColor = unreadCount > 0 ? 'rgba(79, 70, 229, 0.4)' : 'transparent';
            }}
        >
            <div className="relative">
                <div className={`w-12 h-12 rounded-xl theme-bg-card flex items-center justify-center theme-text-secondary font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors uppercase shadow-inner ${unreadCount > 0 ? 'ring-2 ring-indigo-500/50' : ''}`}>
                    {isGroup ? <Hash size={20} /> : initial}
                </div>
                {!isGroup && (
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full transition-colors duration-500 ${user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-500'}`} style={{ border: '2px solid var(--bg-primary)' }}></div>
                )}
            </div>
            <div className="flex-1 text-left">
                <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-bold text-sm tracking-tight ${unreadCount > 0 ? 'text-indigo-400' : 'theme-text'}`}>{displayName}</h3>
                    {unreadCount > 0 ? (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-indigo-600/40"
                      >
                        {unreadCount}
                      </motion.div>
                    ) : (
                      <span className="text-[9px] theme-text-muted font-bold opacity-50 uppercase">
                          {isGroup ? 'Protocol' : (isRecent ? 'RECENT' : 'VAULT')}
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <ShieldCheck size={10} className={(isGroup || user.status === 'online') ? 'text-emerald-500' : 'text-slate-500'} />
                    <p className={`text-[9px] font-bold truncate w-32 uppercase tracking-tighter ${unreadCount > 0 ? 'text-indigo-400/80 animate-pulse' : 'theme-text-muted'}`}>
                        {unreadCount > 0 ? 'New Secure Message' : (isGroup ? 'Multi-Link Active' : (user.status || 'OFFLINE'))}
                    </p>
                </div>
            </div>
            {!isGroup && (
              <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onVault && onVault(user.username); }}
                    className={`p-2 rounded-lg transition-colors ${isVaulted ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'theme-text-muted hover:text-indigo-500'}`}
                    title={isVaulted ? "Move to General" : "Move to Vault"}
                  >
                    <ShieldCheck size={16} />
                  </button>
              </div>
            )}
        </motion.div>
    )
}

function SettingsModal({ currentUser, onClose, onLogout }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm theme-bg rounded-2xl shadow-2xl relative overflow-hidden"
        style={{ border: '1px solid var(--border-color)' }}
      >
        <div className="p-6 theme-bg-secondary flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-black theme-text tracking-tight flex items-center gap-2"><Settings size={18}/> Settings</h2>
          <button onClick={onClose} className="theme-text-muted hover:text-rose-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-600/20">
              {currentUser?.username?.[0]?.toUpperCase()}
            </div>
            <div className="text-center">
              <h3 className="font-bold theme-text uppercase tracking-widest">{currentUser?.username}</h3>
              <p className="text-[10px] theme-text-muted mt-1 uppercase tracking-widest flex items-center gap-1 justify-center"><ShieldCheck size={12} className="text-emerald-500"/> E2EE Keys Secured</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="p-3 rounded-lg flex justify-between items-center cursor-pointer" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <span className="text-xs font-bold theme-text">Theme</span>
              <ThemeToggle />
            </div>
            <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <span className="text-xs font-bold theme-text">Notifications</span>
              <span className="text-[9px] uppercase tracking-widest theme-text-muted">Enabled</span>
            </div>
            <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <span className="text-xs font-bold theme-text">Backup Keys</span>
              <span className="text-[9px] uppercase tracking-widest theme-text-muted">Encrypted</span>
            </div>
          </div>
          
          <button 
            onClick={() => { onClose(); onLogout(); }} 
            className="w-full p-3 rounded-xl bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Disconnect & Logout
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
