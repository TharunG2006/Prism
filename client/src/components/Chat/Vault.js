import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Upload, File as FileIcon, Download, Trash2, Lock, Unlock, Key, Type, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { encryptFile, decryptFile } from '@/lib/crypto'

export default function Vault({ currentUser, privateKey, vaultedUsers = [], onToggleVault, onSelectUser }) {
  const [isConfigured, setIsConfigured] = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [files, setFiles] = useState([])
  const [vaultedConversations, setVaultedConversations] = useState([])
  const [vaultTab, setVaultTab] = useState('files') // 'files' or 'chats'
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    checkVaultStatus()
  }, [])

  const checkVaultStatus = async () => {
    try {
      const token = localStorage.getItem('prism_token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/vault-status`, {
        headers: { 'x-auth-token': token }
      })
      setIsConfigured(res.data.isConfigured)
      setLoading(false)
    } catch (err) {
      console.error("Vault Status Error:", err)
      setError(`Failed to securely connect to vault metadata. (Status: ${err.response?.status || 'Offline'})`)
      setLoading(false)
    }
  }

  const handleSetupPin = async (e) => {
    e.preventDefault()
    if (pin.length < 4) return setError('PIN must be at least 4 characters')
    
    try {
      setLoading(true)
      const token = localStorage.getItem('prism_token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/vault-setup`, { pin }, {
        headers: { 'x-auth-token': token }
      })
      setIsConfigured(true)
      setIsUnlocked(true)
      setPin('')
      setError(null)
      fetchFiles()
      fetchVaultedChats()
    } catch (err) {
      console.error("Setup PIN Error:", err)
      setError(`Failed to set up Vault PIN: ${err.response?.data?.msg || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('prism_token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/vault-unlock`, { pin }, {
        headers: { 'x-auth-token': token }
      })
      setIsUnlocked(true)
      setPin('')
      setError(null)
      fetchFiles()
      fetchVaultedChats()
    } catch (err) {
      setError('Incorrect Vault PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('prism_token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vault`, {
        headers: { 'x-auth-token': token }
      })
      setFiles(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchVaultedChats = async () => {
    try {
      const token = localStorage.getItem('prism_token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/conversations?vaulted=true`, {
        headers: { 'x-auth-token': token }
      })
      setVaultedConversations(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUnvault = async (username) => {
    if (onToggleVault) {
      await onToggleVault(username)
      fetchVaultedChats()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB for the personal vault.')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // 1. Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // 2. Encrypt locally
      // Clean and import the SPKI public key (PEM format)
      const keyData = Uint8Array.from(
        atob(currentUser.publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '')), 
        c => c.charCodeAt(0)
      )
      
      const publicKey = await window.crypto.subtle.importKey(
        "spki",
        keyData,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
      )

      const { encryptedBlob, encryptedKey, iv } = await encryptFile(arrayBuffer, publicKey)

      // 3. Upload to server
      const formData = new FormData()
      formData.append('filename', file.name)
      formData.append('mimeType', file.type)
      formData.append('size', file.size)
      formData.append('encryptedKey', encryptedKey)
      formData.append('iv', iv)
      formData.append('file', encryptedBlob) // Append file LAST for Multer compatibility

      const token = localStorage.getItem('prism_token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/vault/upload`, formData, {
        headers: { 
          'x-auth-token': token
        },
        timeout: 60000 // 60 second timeout for large files
      })

      fetchFiles()
    } catch (err) {
      console.error("Vault Upload Error:", err)
      setError(`Encryption/Upload failed: ${err.message || 'Check network or key status'}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (fileRec) => {
    try {
      // 1. Download encrypted blob
      const response = await fetch(fileRec.cloudinaryUrl)
      if (!response.ok) throw new Error('Failed to download encrypted blob')
      
      const encryptedArrayBuffer = await response.arrayBuffer()

      // 2. Decrypt locally
      const decryptedBuffer = await decryptFile(encryptedArrayBuffer, fileRec.encryptedKey, fileRec.iv, privateKey)

      // 3. Trigger download
      const decryptedBlob = new Blob([decryptedBuffer], { type: fileRec.mimeType })
      const url = URL.createObjectURL(decryptedBlob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = fileRec.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Decryption failed. The file may be corrupted or keys do not match.")
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this encrypted file?")) return
    try {
      const token = localStorage.getItem('prism_token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/vault/${id}`, {
        headers: { 'x-auth-token': token }
      })
      setFiles(files.filter(f => f._id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading && isConfigured === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center theme-bg">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest theme-text-muted">Initializing Secure Matrix...</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col theme-bg relative">
      <header className="p-6 flex items-center justify-between theme-bg-secondary sticky top-0 z-20" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h2 className="text-lg font-black theme-text uppercase tracking-widest flex items-center gap-2">
            <Database className="text-indigo-500" />
            Secure Vault
          </h2>
          <p className="text-[10px] uppercase tracking-widest theme-text-muted font-bold mt-1">E2EE Cloud Storage</p>
        </div>
        {isUnlocked && (
          <div className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] theme-text flex items-center gap-2 bg-emerald-500/10 text-emerald-500" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
            <Unlock size={14} /> Vault Decrypted
          </div>
        )}
      </header>

      {isUnlocked && (
        <div className="flex px-6 pt-4 border-b border-white/5 bg-black/10">
          <button 
            onClick={() => setVaultTab('files')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${vaultTab === 'files' ? 'border-indigo-500 theme-text' : 'border-transparent theme-text-muted hover:theme-text'}`}
          >
            Encrypted Files
          </button>
          <button 
            onClick={() => setVaultTab('chats')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${vaultTab === 'chats' ? 'border-indigo-500 theme-text' : 'border-transparent theme-text-muted hover:theme-text'}`}
          >
            Vaulted Chats ({vaultedConversations.length})
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {!isConfigured ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mt-20 text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
              <ShieldCheck className="w-12 h-12 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xl font-black theme-text">SET UP VAULT SECURITY</h3>
              <p className="text-xs theme-text-muted mt-2 mx-8">Configure a secondary PIN to protect your local vault access. Your files will be encrypted using your primary PGP keys.</p>
            </div>
            
            <form onSubmit={handleSetupPin} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 theme-text-muted" size={16} />
                <input 
                  type="password"
                  placeholder="CREATE VAULT PIN"
                  className="prism-input w-full pl-12 py-3 text-center tracking-[0.5em] font-black"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="prism-button w-full py-3">
                {loading ? 'CONFIGURING...' : 'INITIALIZE SECURE VAULT'}
              </button>
            </form>
          </motion.div>
        ) : !isUnlocked ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xs mx-auto mt-32 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700 shadow-2xl">
              <Lock className="w-10 h-10 theme-text-muted" />
            </div>
            <h3 className="text-lg font-black theme-text uppercase tracking-widest">Vault Locked</h3>
            <form onSubmit={handleUnlock} className="space-y-4">
              <input 
                type="password"
                placeholder="ENTER PIN"
                className="prism-input w-full py-3 text-center tracking-[1em] font-black"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="prism-button w-full py-3 flex items-center justify-center gap-2">
                 <Unlock size={16} /> {loading ? 'DECRYPTING...' : 'ACCESS VAULT'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
            
            {error && <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-center font-bold text-xs uppercase tracking-widest">{error}</div>}

            {vaultTab === 'files' ? (
              <div className="space-y-8">
                {/* Upload Area */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl border-2 border-dashed border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/60 transition-all"></div>
                  <div className="relative p-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <div>
                      <h4 className="font-black theme-text text-lg">Upload to Encrypted Vault</h4>
                      <p className="text-xs theme-text-muted mt-1 uppercase tracking-widest">Max File Size: 50MB</p>
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        Encrypting & Uploading...
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                {/* File List */}
                <div className="space-y-4">
                  <h3 className="font-black text-sm theme-text uppercase tracking-widest border-b border-white/5 pb-2">Stored Documents ({files.length})</h3>
                  
                  {files.length === 0 ? (
                    <div className="text-center p-10 theme-text-muted opacity-50">
                      <FileIcon className="mx-auto mb-4" size={32} />
                      <p className="text-xs font-bold uppercase tracking-widest">Vault is Empty</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {files.map(file => (
                        <div key={file._id} className="p-4 rounded-xl flex items-center gap-4 transition-all" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                          <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <Type size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold theme-text truncate">{file.filename}</h4>
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest theme-text-muted">
                              <span>{formatSize(file.size)}</span>
                              <span>&bull;</span>
                              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handleDownload(file)}
                              className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/30 transition-colors flex items-center gap-2"
                            >
                              <Download size={14} /> Decrypt
                            </button>
                            <button 
                              onClick={() => handleDelete(file._id)}
                              className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Vaulted Chats List */
              <div className="space-y-4">
                <h3 className="font-black text-sm theme-text uppercase tracking-widest border-b border-white/5 pb-2">Vaulted Conversations</h3>
                
                {vaultedConversations.length === 0 ? (
                  <div className="text-center p-10 theme-text-muted opacity-50">
                    <Database className="mx-auto mb-4" size={32} />
                    <p className="text-xs font-bold uppercase tracking-widest">No Hidden Chats</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {vaultedConversations.map(chat => (
                      <div key={chat.username} className="p-4 rounded-xl flex items-center gap-4 transition-all" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                          <span className="font-black uppercase">{chat.username[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold theme-text truncate">{chat.username}</h4>
                          <p className="text-[10px] theme-text-muted mt-1 uppercase tracking-widest">Hidden in Secure Layer</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => onSelectUser(chat)}
                            className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/30 transition-colors"
                          >
                            Open Chat
                          </button>
                          <button 
                            onClick={() => handleUnvault(chat.username)}
                            className="p-2 rounded-lg theme-bg-secondary theme-text-muted hover:text-indigo-500 transition-colors"
                            title="Move to General"
                          >
                            <ShieldCheck size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
