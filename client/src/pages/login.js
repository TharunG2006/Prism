import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Shield, User, Lock, LogIn, Sparkles } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        username,
        password
      })

      localStorage.setItem('prism_token', res.data.token)
      localStorage.setItem('prism_user', JSON.stringify(res.data.user))
      sessionStorage.setItem('prism_master_pass', password)
      router.push('/chat')
    } catch (err) {
      alert(err.response?.data?.msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="prism-glass p-8 md:p-10 shadow-2xl shadow-black/50">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
                <Shield className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back.</h1>
            <p className="text-slate-400 text-sm">Unlock your encrypted conversations.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <input 
                  className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <input 
                  className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" 
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                className="prism-button w-full flex items-center justify-center gap-2 group"
                disabled={loading}
              >
                {loading ? 'Unlocking Space...' : (
                  <>
                    Sign In Securely <LogIn className="group-hover:translate-x-1 transition-transform" size={20} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              New to Prism? <Link href="/register" className="text-indigo-400 hover:text-white font-bold transition-colors">Create Account</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-6">
          <Link href="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Terms</Link>
          <Link href="/contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Contact</Link>
        </div>
      </motion.div>
    </div>
  )
}
