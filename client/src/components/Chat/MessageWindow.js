import React, { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, MoreVertical, ShieldCheck, Lock, Hash, ArrowLeft, Info, Trash2, Download, FileText, Image as ImageIcon } from 'lucide-react'
import { encryptMessage, decryptMessage, encryptFile, decryptFile, encryptSessionKey, encryptMessageForGroup, importPublicKey } from '@/lib/crypto'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import GroupSettingsModal from './GroupSettingsModal'

export default function MessageWindow({ recipient, currentUser, privateKey, socket, onGroupsChanged }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false)
  const [status, setStatus] = useState(recipient.status || 'offline')
  const scrollRef = useRef()
  const fileInputRef = useRef()

  // Deterministic Conversation ID or Group ID
  const isGroup = recipient.type === 'group';
  const partnerId = recipient._id || recipient.username;
  const conversationId = isGroup ? recipient._id : [currentUser.id.toLowerCase(), partnerId.toLowerCase()].sort().join('_');

  // 1. Fetch History
  useEffect(() => {
    const fetchHistory = async () => {
      if (!privateKey) return
      setLoading(true)
      try {
        const token = localStorage.getItem('prism_token')
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${conversationId}`, {
          headers: { 'x-auth-token': token }
        })
        
        // Populate messages with raw encrypted data first
        setMessages(res.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
      } catch (err) {
        console.error('Failed to load history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [conversationId, privateKey])

  // 2. Decrypt History
  const myLowerId = currentUser?.id?.toLowerCase();

  // Count how many messages still need decryption.
  // Using this as a dep means: the effect fires when new undecrypted messages arrive
  // OR when privateKey becomes available (auto-unlock after history already loaded).
  const pendingCount = messages.filter(m => !m.text || m.text === '__FAILED__').length;

  useEffect(() => {
    const decryptAll = async () => {
      if (!messages.length || !privateKey || !myLowerId) return;
      if (pendingCount === 0) return; // nothing to decrypt

      const decrypted = await Promise.all(messages.map(async (msg) => {
        // Skip file messages (handled via download)
        if (msg.fileType && msg.fileType !== 'text') return msg;
        // Skip already successfully decrypted
        if (msg.text && msg.text !== '__FAILED__') return msg;

        try {
          const isSender = msg.senderId?.toLowerCase() === myLowerId;
          let text = '';

          if (msg.groupKeys && msg.groupKeys.length > 0) {
            const myKeyEntry = msg.groupKeys.find(k => k.userId?.toLowerCase() === myLowerId);
            if (myKeyEntry) {
              text = await decryptMessage(
                { ...msg, encryptedKey: myKeyEntry.encryptedKey },
                privateKey,
                isSender
              );
            } else {
              text = '__FAILED__';
            }
          } else {
            text = await decryptMessage(msg, privateKey, isSender);
          }

          return { ...msg, text };
        } catch (err) {
          console.error(`[DEC] ${msg._id}: ${err.message}`);
          return { ...msg, text: '__FAILED__' };
        }
      }));

      const hasChanged = decrypted.some((msg, i) => msg.text !== messages[i].text);
      if (hasChanged) setMessages(decrypted);
    };

    decryptAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, privateKey, myLowerId]);


  // 3. Socket Connection & Receiving
  useEffect(() => {
    if (!socket || !privateKey) return
    
    socket.emit('join_conversation', conversationId);
    
    const handleReceive = async (data) => {
      // Logic for deterministic room check or groupId check
      const isMyConversation = data.conversationId === conversationId || data.groupId === conversationId;
      if (!isMyConversation) return;

      try {
        const isSender = data.senderId?.toLowerCase() === myLowerId;
        let text = '';
        
        if (data.fileType === 'text' || !data.fileType) {
           if (data.groupKeys && data.groupKeys.length > 0) {
             const keyEntry = data.groupKeys.find(k => k.userId?.toLowerCase() === myLowerId);
             if (keyEntry) {
                text = await decryptMessage({ ...data, encryptedKey: keyEntry.encryptedKey }, privateKey, isSender);
             } else {
                text = '__FAILED__';
             }
           } else {
             text = await decryptMessage(data, privateKey, isSender);
           }
        }
        
        setMessages(prev => {
          const exists = prev.some(m => (m._id && data._id && m._id === data._id) || (m.clientId && data.clientId && m.clientId === data.clientId));
          if (exists) {
            return prev.map(m => (m.clientId === data.clientId || m._id === data._id) ? { ...m, ...data, text, status: 'delivered' } : m);
          }
          return [...prev, { ...data, text, status: 'delivered' }];
        });
      } catch (err) {
        console.error("[SOCKET] Decryption error:", err);
        setMessages(prev => [...prev, { ...data, text: '__FAILED__', status: 'delivered' }]);
      }
    }

    socket.on('receive_message', handleReceive);
    return () => socket.off('receive_message', handleReceive);
  }, [socket, privateKey, conversationId, myLowerId]);

  // Update status when recipient prop changes (e.g. switching conversations)
  useEffect(() => {
     setStatus(recipient.status || 'offline');
  }, [recipient]);

  // Listen for real-time status changes for the current recipient
  useEffect(() => {
    if (!socket || isGroup) return;

    const handleStatusChange = (data) => {
      const recipientName = recipient.username || recipient.name;
      if (data.userId === recipientName || data.userId === recipient._id) {
        console.log(`[MSG_WINDOW] Status update for ${recipientName}: ${data.status}`);
        setStatus(data.status);
      }
    };

    socket.on('user_status_changed', handleStatusChange);
    return () => socket.off('user_status_changed', handleStatusChange);
  }, [socket, recipient, isGroup]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !privateKey) return;

    const msgClientId = Math.random().toString(36).substr(2, 9) + Date.now();
    const tempMsg = {
      text: input,
      senderId: currentUser.id,
      clientId: msgClientId,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, tempMsg]);
    const currentInput = input;
    setInput('');

    try {
      let payload;
      if (isGroup) {
        // Fetch all member public keys
        const membersRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/users/public-keys`, {
          usernames: recipient.participants
        });
        const publicKeys = membersRes.data;

        // Encrypt message for group
        const { encryptedContent, iv, sessionKey, signature } = await encryptMessageForGroup(currentInput, privateKey);
        
        // Encrypt AES key for each participant (Multi-cast)
        const groupKeys = await Promise.all(
          recipient.participants.map(async (username) => {
            const pubKey = publicKeys[username];
            if (!pubKey) return null;
            const encryptedKey = await encryptSessionKey(sessionKey, pubKey);
            return { userId: username, encryptedKey };
          })
        );

        payload = {
          groupId: recipient._id,
          senderId: currentUser.id,
          encryptedContent,
          iv,
          groupKeys: groupKeys.filter(k => k !== null),
          signature,
          clientId: msgClientId,
          fileType: 'text'
        };
      } else {
        // 1-on-1 Encryption
        // Import public keys first (String PEM -> CryptoKey)
        const recipientPubKey = await importPublicKey(recipient.publicKey);
        const myPubKey = await importPublicKey(currentUser.publicKey);

        const res = await encryptMessage(currentInput, recipientPubKey, myPubKey);
        payload = {
          ...res,
          recipientId: partnerId,
          senderId: currentUser.id,
          clientId: msgClientId,
          fileType: 'text'
        };
      }
      
      socket.emit('send_message', payload);
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => m.clientId === msgClientId ? { ...m, status: 'error' } : m));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !privateKey) return;

    setUploading(true);
    const msgClientId = Math.random().toString(36).substr(2, 9) + Date.now();
    
    try {
      setMessages(prev => [...prev, {
        senderId: currentUser.id,
        clientId: msgClientId,
        timestamp: new Date().toISOString(),
        fileType: file.type.startsWith('image/') ? 'image' : 'file',
        fileName: file.name,
        fileSize: file.size,
        status: 'uploading'
      }]);

      const arrayBuffer = await file.arrayBuffer();
      
      let uploadPayload;
      if (isGroup) {
         // Group file support is similar but needs Multi-cast keys
         const membersRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/users/public-keys`, { usernames: recipient.participants });
         const publicKeys = membersRes.data;

         const { encryptedBlob, iv, sessionKey } = await encryptFile(arrayBuffer, null, privateKey, true); // True for group
         
         const groupKeys = await Promise.all(
            recipient.participants.map(async (userName) => {
               const pubKey = publicKeys[userName];
               if (!pubKey) return null;
               const encryptedKey = await encryptSessionKey(sessionKey, pubKey);
               return { userId: userName, encryptedKey };
            })
         );

         // Upload blob to Cloudinary (it's encrypted)
         const formData = new FormData();
         formData.append('file', encryptedBlob);
         const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/upload`, formData, { headers: { 'x-auth-token': localStorage.getItem('prism_token') } });

         uploadPayload = {
            groupId: recipient._id,
            senderId: currentUser.id,
            fileUrl: uploadRes.data.fileUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileType: file.type.startsWith('image/') ? 'image' : 'file',
            groupKeys: groupKeys.filter(k => k !== null),
            iv,
            clientId: msgClientId
         };
      } else {
         // Standard 1-on-1 File Enc
         const recipientPubKey = await importPublicKey(recipient.publicKey);
         const myPubKey = await importPublicKey(currentUser.publicKey);

         const res = await encryptFile(arrayBuffer, recipientPubKey, myPubKey);
         const formData = new FormData();
         formData.append('file', res.encryptedBlob);
         const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/upload`, formData, { headers: { 'x-auth-token': localStorage.getItem('prism_token') } });

         uploadPayload = {
            recipientId: partnerId,
            senderId: currentUser.id,
            fileUrl: uploadRes.data.fileUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileType: file.type.startsWith('image/') ? 'image' : 'file',
            encryptedKey: res.encryptedKey,
            senderEncryptedKey: res.senderEncryptedKey,
            iv: res.iv,
            clientId: msgClientId
         };
      }

      socket.emit('send_message', uploadPayload);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (msg) => {
    try {
      const response = await fetch(msg.fileUrl);
      const encryptedData = await response.arrayBuffer();
      
      let sessionKey;
      if (msg.groupKeys && msg.groupKeys.length > 0) {
        const keyEntry = msg.groupKeys.find(k => k.userId?.toLowerCase() === myLowerId);
        sessionKey = keyEntry ? keyEntry.encryptedKey : null;
      } else {
        const amISender = msg.senderId?.toLowerCase() === myLowerId;
        sessionKey = amISender ? msg.senderEncryptedKey : msg.encryptedKey;
      }

      if (!sessionKey) throw new Error("Decryption key not found in payload");

      const decrypted = await decryptFile(encryptedData, sessionKey, msg.iv, privateKey);
      const blob = new Blob([decrypted], { type: msg.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = msg.fileName;
      a.click();
    } catch (err) {
      alert("Decryption failed. Security link broken.");
    }
  };

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleDeleteHistory = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this E2EE message history? This action is irreversible.")) return;
    try {
      const token = localStorage.getItem('prism_token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${conversationId}`, {
        headers: { 'x-auth-token': token }
      });
      setMessages([]);
      setMenuOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete chat history");
    }
  };

  return (
    <div className="flex flex-col h-full theme-bg relative z-10">
      <header className="p-5 flex items-center justify-between sticky top-0 z-20 theme-bg-secondary" style={{ borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
              <img src={recipient.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${recipient.name || recipient.username}`} className="w-12 h-12 rounded-2xl shadow-inner" />
              {!isGroup && <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ border: '2px solid var(--bg-primary)' }}></div>}
          </div>
          <div>
            <h2 className="theme-text font-black tracking-tight flex items-center gap-2 uppercase">
              {recipient.name || recipient.username}
              <ShieldCheck className="text-indigo-400" size={16} />
            </h2>
            <div className="text-[10px] font-bold uppercase tracking-widest theme-text-muted flex items-center gap-2">
               {isGroup ? `${recipient.participants.length} PROTOCOL MEMBERS` : (status === 'online' ? 'ACTIVE LINK' : 'OFFLINE')}
               <span className="opacity-20">|</span>
               <span className="flex items-center gap-1"><Lock size={8} /> {isGroup ? 'MULTICAST E2EE' : '1:1 E2EE'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
            <button onClick={() => isGroup ? setGroupSettingsOpen(true) : setInfoOpen(!infoOpen)} className={`w-10 h-10 flex items-center justify-center transition-colors border rounded-xl ${infoOpen ? 'theme-bg-accent border-indigo-500' : 'theme-text-muted hover:bg-white/5 border-white/5'}`}>
               <Info size={20} />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className={`w-10 h-10 flex items-center justify-center transition-colors border rounded-xl ${menuOpen ? 'theme-bg-accent border-indigo-500' : 'theme-text-muted hover:bg-white/5 border-white/5'}`}>
                 <MoreVertical size={20} />
              </button>
              
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-12 w-56 theme-bg-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                      <button 
                        onClick={handleDeleteHistory}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors uppercase tracking-wider"
                      >
                        <Trash2 size={16} /> Clear Chat History
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
        </div>
      </header>

      <AnimatePresence>
        {infoOpen && !isGroup && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="theme-bg-secondary border-b border-white/5 overflow-hidden z-10 relative"
          >
            <div className="p-6 max-w-4xl mx-auto flex items-start gap-8">
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest mb-4 flex items-center gap-2"><Lock size={14}/> E2EE Protocol Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase opacity-50 font-bold mb-1">Target Identity</p>
                    <p className="text-sm font-mono opacity-80 bg-black/20 p-2 rounded truncate select-all">{recipient.username}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-50 font-bold mb-1">Public Key Fingerprint (Base64)</p>
                    <p className="text-xs font-mono opacity-80 bg-black/20 p-2 rounded truncate select-all">{recipient.publicKey?.substring(0, 64)}...</p>
                  </div>
                </div>
              </div>
              <div className="w-48 space-y-4 pt-8">
                <div className="flex items-center gap-3 opacity-60">
                  <ShieldCheck className="text-emerald-400" /> 
                  <span className="text-[10px] font-bold uppercase tracking-wider">Perfect Forward Secrecy</span>
                </div>
                <div className="flex items-center gap-3 opacity-60">
                  <Lock className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">RSA-OAEP 2048</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
             <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Restoring Encryption History...</p>
          </div>
        ) : messages.map((msg, i) => {
           const isMine = msg.senderId?.toLowerCase() === myLowerId;
           const isFailed = msg.text === '__FAILED__';
           return (
           <motion.div 
             initial={{ opacity: 0, y: 10 }} 
             animate={{ opacity: 1, y: 0 }} 
             key={i} 
             className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
           >
              <div className="max-w-[80%] md:max-w-[60%] space-y-1">
                {isGroup && !isMine && (
                  <p className="text-[9px] font-black theme-text-muted uppercase tracking-widest ml-1 mb-1">@{msg.senderId}</p>
                )}
                <div className={`p-4 rounded-2xl shadow-xl ${
                  isMine 
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-tr-none' 
                    : 'theme-bg-card rounded-tl-none border border-white/5'
                }`}>
                  {msg.fileType === 'image' ? (
                    <div className="relative group cursor-pointer" onClick={() => handleDownloadFile(msg)}>
                       <img src={msg.fileUrl} className="rounded-xl max-h-60 w-full object-cover blur-md group-hover:blur-0 transition-all duration-500" />
                       <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity bg-black/40 rounded-xl">
                          <Lock className="text-white/40" size={32} />
                       </div>
                    </div>
                  ) : msg.fileType === 'file' ? (
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <FileText className="text-indigo-400" />
                      <div className="flex-1 min-w-0">
                         <p className="text-xs font-bold truncate">{msg.fileName}</p>
                         <p className="text-[9px] opacity-60 uppercase font-black">{(msg.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => handleDownloadFile(msg)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Download size={16} /></button>
                    </div>
                  ) : isFailed || !msg.text ? (
                    <div className="flex flex-col gap-1 opacity-70">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <Lock size={12} /> Security Link Broken
                      </p>
                      <p className="text-[10px] italic leading-tight">
                        This message was encrypted with a destroyed or older public key limit. Neither server nor client can decrypt it. E2EE mathematically guarantees this historical message remains locked forever.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  )}
                  {msg.status === 'uploading' && <p className="text-[9px] italic opacity-60 mt-2 animate-pulse">Encrypting & Syncing...</p>}
                </div>
                <div className={`flex items-center gap-2 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                   <span className="text-[8px] font-bold theme-text-muted">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   {isMine && <ShieldCheck size={10} className={msg.status === 'delivered' ? "text-indigo-400" : "opacity-30"} />}
                </div>
              </div>
           </motion.div>
           );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 theme-bg-secondary border-t border-white/5 backdrop-blur-xl">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-center gap-3">
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <div className="flex-1 relative flex items-center">
             <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-4 p-2 theme-text-muted hover:text-indigo-400 transition-colors">
                <Paperclip size={20} />
             </button>
             <input 
               className="prism-input w-full pl-14 pr-12 py-4 text-sm font-medium"
               placeholder={isGroup ? `Message Group @${recipient.name}...` : `Secure message to @${recipient.username}...`}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               disabled={!privateKey || uploading}
             />
             <div className="absolute right-4 text-indigo-500/30 font-black text-[10px] tracking-widest">E2EE</div>
          </div>
          <button type="submit" disabled={!input.trim() || uploading} className="prism-button !p-4 aspect-square disabled:opacity-50">
             <Send size={24} />
          </button>
        </form>
      </div>

      <GroupSettingsModal 
        isOpen={groupSettingsOpen}
        onClose={() => setGroupSettingsOpen(false)}
        group={recipient}
        currentUser={currentUser}
        onGroupUpdated={(updatedGrp) => {
           alert("Group updated! Reloading to apply changes...");
           window.location.reload();
        }}
        onGroupDeleted={() => {
           if (onGroupsChanged) onGroupsChanged();
           alert("PROTOCOL OFFLINE: This group has been permanently decommissioned.");
           window.location.href = '/chat';
        }}
      />
    </div>
  )
}
