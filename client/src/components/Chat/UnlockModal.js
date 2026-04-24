import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Shield, Sparkles, KeyRound, Unlock, LogOut } from 'lucide-react'

export default function UnlockModal({ onUnlock, currentUser }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onUnlock(password)
    } catch (err) {
      console.error("[UnlockModal] Error:", err)
      setError('Decryption Failed. Please check your secret key.')
    } finally {
      setLoading(false)
    }
  }

  const handleForceLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md prism-glass p-8 md:p-10 shadow-2xl shadow-indigo-500/10"
      >
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
              <Lock className="text-white" size={32} />
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Unlock Your Space.</h1>
          <p className="text-slate-400 text-sm">Enter your master password to decrypt your secure vault and start messaging.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold text-center uppercase tracking-widest">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Master Password</label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                type="password"
                className="prism-input w-full pl-12 py-4 focus:ring-4 focus:ring-indigo-500/10 border-white/10" 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-3">
            <button 
              type="submit" 
              className="prism-button w-full flex items-center justify-center gap-2 group py-4"
              disabled={loading}
            >
              {loading ? 'Unlocking Vault...' : (
                <>
                  Synchronize Keys <Unlock className="group-hover:translate-x-1 transition-transform" size={20} />
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={handleForceLogout}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors uppercase tracking-widest flex justify-center items-center gap-2"
            >
              <LogOut size={14} /> Clear Cache & Re-Login
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-[9px] text-slate-600 uppercase tracking-[0.2em] font-black">
          <div className="flex items-center gap-1.5"><Sparkles size={10} /> RSA-2048</div>
          <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
          <div className="flex items-center gap-1.5"><Shield size={10} /> AES-256-GCM</div>
        </div>
      </motion.div>
    </div>
  )
}
