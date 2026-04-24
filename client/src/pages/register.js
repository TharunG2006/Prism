import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { generateKeyPair, exportPublicKey, deriveMasterKey, encryptPrivateKey } from '@/lib/crypto'
import { motion } from 'framer-motion'
import { Shield, User, Lock, ArrowRight, Sparkles, Mail, Phone, KeyRound } from 'lucide-react'

export default function Register() {
  const [step, setStep] = useState('register') // 'register' or 'verify'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const salt = crypto.randomUUID()
      const keyPair = await generateKeyPair()
      const publicKeyPem = await exportPublicKey(keyPair.publicKey)
      const masterKey = await deriveMasterKey(password, salt)
      const { encryptedData, iv } = await encryptPrivateKey(keyPair.privateKey, masterKey)

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        username,
        email,
        phone,
        password,
        publicKey: publicKeyPem,
        encryptedPrivateKey: `${encryptedData}:${iv}`,
        salt
      })

      if (res.data.requiresVerification) {
        setStep('verify')
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
        username,
        code: verificationCode
      })

      localStorage.setItem('prism_token', res.data.token)
      localStorage.setItem('prism_user', JSON.stringify(res.data.user))
      sessionStorage.setItem('prism_master_pass', password)
      router.push('/chat')
    } catch (err) {
      setError(err.response?.data?.msg || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-code`, { username })
      setError('New code sent! Check your email.')
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to resend code')
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]"></div>

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
                {step === 'register' ? <Shield className="text-white" size={32} /> : <KeyRound className="text-white" size={32} />}
              </div>
            </div>
          </div>

          {step === 'register' ? (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">Join the Future.</h1>
                <p className="text-slate-400 text-sm">Every message is encrypted on your device.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" placeholder="e.g. Satoshi" value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" type="email" placeholder="satoshi@bitcoin.org" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone (Optional)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secret Key / Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input className="prism-input w-full pl-12 focus:ring-4 focus:ring-indigo-500/10" type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" className="prism-button w-full flex items-center justify-center gap-2 group" disabled={loading}>
                    {loading ? 'Securing Environment...' : (<>Create Secure Account <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} /></>)}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">Verify Your Email</h1>
                <p className="text-slate-400 text-sm">We sent a 6-digit code to <span className="text-indigo-400 font-semibold">{email}</span></p>
              </div>

              {error && (
                <div className={`mb-4 p-3 border rounded-xl text-sm text-center ${error.includes('sent') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Verification Code</label>
                  <input
                    className="prism-input w-full text-center text-2xl tracking-[0.5em] font-mono focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="prism-button w-full flex items-center justify-center gap-2 group" disabled={loading || verificationCode.length !== 6}>
                    {loading ? 'Verifying...' : (<>Verify & Enter Prism <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} /></>)}
                  </button>
                </div>

                <div className="text-center">
                  <button type="button" onClick={handleResendCode} className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">
                    Didn't receive a code? <span className="font-bold">Resend</span>
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              Already using Prism? <Link href="/login" className="text-indigo-400 hover:text-white font-bold transition-colors">Sign In</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">
          <div className="flex items-center gap-1.5"><Sparkles size={12} /> RSA-2048</div>
          <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
          <div className="flex items-center gap-1.5"><Sparkles size={12} /> AES-256-GCM</div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6">
          <Link href="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Security Protocol</Link>
          <Link href="/roadmap" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Roadmap</Link>
          <Link href="/changelog" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Changelog</Link>
          <Link href="/contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-400 transition-colors">Contact</Link>
        </div>
      </motion.div>
    </div>
  )
}
