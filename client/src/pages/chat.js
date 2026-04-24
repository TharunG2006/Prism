import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Chat/Sidebar'
import MessageWindow from '@/components/Chat/MessageWindow'
import Vault from '@/components/Chat/Vault'
import Groups from '@/components/Chat/Groups'
import UnlockModal from '@/components/Chat/UnlockModal'
import { motion, AnimatePresence } from 'framer-motion'
import { deriveMasterKey, decryptPrivateKey } from '@/lib/crypto'
import { io } from 'socket.io-client'
import axios from 'axios'

export default function ChatPage() {
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [privateKey, setPrivateKey] = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [socket, setSocket] = useState(null)
  const [currentView, setCurrentView] = useState('chat')
  const [vaultedUsers, setVaultedUsers] = useState([])
  const [refreshSignal, setRefreshSignal] = useState(0)
  const router = useRouter()

  const triggerRefresh = () => setRefreshSignal(prev => prev + 1)

  useEffect(() => {
    const userJson = localStorage.getItem('prism_user')
    const token = localStorage.getItem('prism_token')
    if (!userJson || !token) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userJson)
    setCurrentUser(user)
    setVaultedUsers(user.vaultedUsers || [])
  }, []) // Only on mount

  // Stable Socket Connection
  useEffect(() => {
    if (!currentUser) return

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10
    })
    setSocket(newSocket)
    
    newSocket.on('connect', () => {
      // Prioritize numeric ID for identity room standardization
      const identityId = currentUser.id || currentUser._id || currentUser.username
      console.log("[SOCKET] Multi-Link Established:", identityId)
      newSocket.emit('join', identityId)
    })

    newSocket.on('disconnect', (reason) => {
      console.warn("[SOCKET] Socket Disconnected:", reason)
    })

    newSocket.on('connect_error', (err) => {
      console.error("[SOCKET] Connection error:", err)
    })

    // Listen for real-time group updates (e.g. member joins, deletion)
    newSocket.on('group_update', (data) => {
      console.log("[PROTOCOL_SYNC] Group update received:", data.type, "for group:", data.groupId)
      triggerRefresh()
      
      // If the current group was deleted, redirect and notify
      if (data.type === 'group_deleted' && selectedUser?._id === data.groupId) {
        alert("PROTOCOL OFFLINE: This group has been decommissioned by the admin.")
        setSelectedUser(null)
        router.push('/chat', undefined, { shallow: true })
      }
    })

    // Receive the list of users who are ALREADY online when we connect
    newSocket.on('online_users', (onlineList) => {
      console.log("[STATUS] Currently online users:", onlineList)
      // Update selectedUser if they are in the online list
      setSelectedUser(prev => {
        if (!prev || prev.type === 'group') return prev
        const recipientName = prev.username || prev.name
        if (onlineList.includes(recipientName)) {
          return { ...prev, status: 'online' }
        }
        return prev
      })
    })

    // Keep selectedUser status fresh for real-time changes
    newSocket.on('user_status_changed', (data) => {
      console.log("[STATUS] Real-time status change:", data.userId, "→", data.status)
      setSelectedUser(prev => {
        if (!prev || prev.type === 'group') return prev
        const recipientName = prev.username || prev.name
        if (data.userId === recipientName || data.userId === prev._id) {
          return { ...prev, status: data.status }
        }
        return prev
      })
    })

    // Safety net: explicitly tell server we're going offline when tab closes
    const handleBeforeUnload = () => {
      const userId = currentUser.username || currentUser.id
      newSocket.emit('logout', userId)
      newSocket.close()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Request Notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Check if we can auto-unlock using sessionStorage
    const attemptAutoUnlock = async () => {
      const savedPass = sessionStorage.getItem('prism_master_pass')
      if (savedPass && currentUser) {
        try {
          console.log("[AUTH] Attempting auto-unlock with saved password")
          const masterKey = await deriveMasterKey(savedPass, currentUser.salt)
          const [encryptedData, iv] = currentUser.encryptedPrivateKey.split(':')
          const key = await decryptPrivateKey(encryptedData, iv, masterKey)
          setPrivateKey(key)
          setIsUnlocked(true)
          console.log("[AUTH] Auto-unlock successful")
        } catch (err) {
          console.error("[AUTH] Auto-unlock failed", err)
        }
      }
    }
    attemptAutoUnlock()

    return () => {
      console.log("[SOCKET] Disconnecting socket")
      window.removeEventListener('beforeunload', handleBeforeUnload)
      newSocket.close()
    }
  }, [currentUser?.id]) // Only when user identity changes

  // Sync selectedUser from URL
  useEffect(() => {
    if (!router.isReady) return

    const username = router.query.u
    const groupId = router.query.g
    
    if (username && (!selectedUser || selectedUser.username !== username)) {
      const fetchPartner = async () => {
        try {
          const token = localStorage.getItem('prism_token')
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${username}`, {
            headers: { 'x-auth-token': token }
          })
          const partner = res.data.find(u => u.username === username)
          if (partner) {
            setSelectedUser(partner)
            setCurrentView('chat')
          }
        } catch (err) {
          console.error("Failed to fetch partner from URL")
        }
      }
      fetchPartner()
    } else if (groupId && (!selectedUser || selectedUser._id !== groupId)) {
      const fetchGroup = async () => {
        try {
          const token = localStorage.getItem('prism_token')
          // Fetch from the groups API directly by ID
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${groupId}`, {
            headers: { 'x-auth-token': token }
          })
          if (res.data) {
            setSelectedUser(res.data)
            setCurrentView('chat') // Ensure we show message window, not the groups manager
          }
        } catch (err) {
          console.error("Failed to fetch group from URL")
        }
      }
      fetchGroup()
    } else if (!username && !groupId && selectedUser && currentView === 'chat') {
      setSelectedUser(null)
    }
  }, [router.isReady, router.query.u, router.query.g])

  const handleSelectGroup = (group) => {
    setSelectedUser(group)
    setCurrentView('chat')
    // For groups, we might use a different URL param or just the ID
    router.push(`/chat?g=${group._id}`, undefined, { shallow: true })
    triggerRefresh()
  }

  const handleGroupsChanged = () => {
    triggerRefresh()
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setCurrentView('chat')
    if (user.type === 'group') {
      router.push(`/chat?g=${user._id}`, undefined, { shallow: true })
    } else {
      router.push(`/chat?u=${user.username}`, undefined, { shallow: true })
    }
  }

  const handleTabChange = (tab) => {
    if (tab === 'vault') {
      setCurrentView('vault')
      router.push('/chat', undefined, { shallow: true }) // clear URL
      setSelectedUser(null)
    } else if (tab === 'groups') {
      setCurrentView('groups')
      router.push('/chat', undefined, { shallow: true })
      setSelectedUser(null)
    } else if (tab === 'chats') {
      setCurrentView('chat')
    }
  }

  const handleUnlock = async (password) => {
    try {
      const masterKey = await deriveMasterKey(password, currentUser.salt)
      const [encryptedData, iv] = currentUser.encryptedPrivateKey.split(':')
      const key = await decryptPrivateKey(encryptedData, iv, masterKey)
      
      // Save to sessionStorage for tab persistence
      sessionStorage.setItem('prism_master_pass', password)
      
      setPrivateKey(key)
      setIsUnlocked(true)
    } catch (err) {
      console.log("[HANDLE_UNLOCK] Initial decryption failed, attempting auto-sync of latest keys from server...");
      try {
        const token = localStorage.getItem('prism_token');
        if (token) {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
            headers: { 'x-auth-token': token }
          });
          const freshUser = res.data;
          
          const freshMasterKey = await deriveMasterKey(password, freshUser.salt);
          const [freshEncData, freshIv] = freshUser.encryptedPrivateKey.split(':');
          const finalKey = await decryptPrivateKey(freshEncData, freshIv, freshMasterKey);
          
          localStorage.setItem('prism_user', JSON.stringify(freshUser));
          setCurrentUser(freshUser);
          sessionStorage.setItem('prism_master_pass', password);
          setPrivateKey(finalKey);
          setIsUnlocked(true);
          console.log("[HANDLE_UNLOCK] Auto-sync successful.");
          return;
        }
      } catch (syncErr) {
        console.error("[HANDLE_UNLOCK_ERROR] Auto-sync retry failed:", syncErr);
      }
      console.error("[HANDLE_UNLOCK_ERROR] Terminal Decryption failed.");
      throw err;
    }
  }

  const handleToggleVault = async (partnerUsername) => {
    try {
      const token = localStorage.getItem('prism_token')
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/vault/toggle-chat`, 
        { partnerUsername }, 
        { headers: { 'x-auth-token': token } }
      )
      
      const { isVaulted } = res.data
      let updatedList = [];
      setVaultedUsers(prev => {
        if (isVaulted) {
          updatedList = [...prev, partnerUsername];
        } else {
          updatedList = prev.filter(u => u !== partnerUsername);
        }
        
        // Update localStorage to persist across refreshes
        const userJson = localStorage.getItem('prism_user');
        if (userJson) {
          const user = JSON.parse(userJson);
          user.vaultedUsers = updatedList;
          localStorage.setItem('prism_user', JSON.stringify(user));
        }
        
        return updatedList;
      })

      // If we vaulted the current user, clear the selection
      if (isVaulted && selectedUser?.username === partnerUsername) {
        setSelectedUser(null)
        router.push('/chat', undefined, { shallow: true })
      }
    } catch (err) {
      console.error("Failed to toggle vault status", err)
    }
  }

  const handleLogout = () => {
    const userId = currentUser.username || currentUser.id
    if (socket) {
      socket.emit('logout', userId)
      socket.close()
    }
    setSocket(null)
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }

  if (!currentUser) return null

  return (
    <div className="flex h-screen overflow-hidden theme-bg relative">
      <AnimatePresence>
        {!isUnlocked && (
          <UnlockModal onUnlock={handleUnlock} currentUser={currentUser} />
        )}
      </AnimatePresence>

      <Sidebar 
        onSelectUser={handleSelectUser} 
        selectedUser={selectedUser}
        currentUser={currentUser} 
        socket={socket}
        privateKey={privateKey}
        onLogout={handleLogout}
        onTabChange={handleTabChange}
        vaultedUsers={vaultedUsers}
        onToggleVault={handleToggleVault}
        refreshSignal={refreshSignal}
      />

      <main className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          {currentView === 'vault' ? (
            <motion.div
              key="vault"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <Vault 
                currentUser={currentUser} 
                privateKey={privateKey} 
                vaultedUsers={vaultedUsers}
                onToggleVault={handleToggleVault}
                onSelectUser={handleSelectUser}
              />
            </motion.div>
          ) : currentView === 'groups' ? (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <Groups 
                onSelectGroup={handleSelectGroup} 
                currentUser={currentUser} 
                refreshSignal={refreshSignal}
                onGroupsChanged={handleGroupsChanged}
              />
            </motion.div>
          ) : selectedUser ? (
            <motion.div
              key={selectedUser._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <MessageWindow 
                recipient={selectedUser} 
                currentUser={currentUser} 
                privateKey={privateKey}
                socket={socket}
                onGroupsChanged={handleGroupsChanged}
              />
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 theme-bg-secondary">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold theme-text mb-2">Select a conversation</h1>
              <p className="theme-text-secondary max-w-sm">
                Choose a contact from the sidebar to start a secure end-to-end encrypted chat.
              </p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
