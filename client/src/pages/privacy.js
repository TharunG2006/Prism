import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Shield, EyeOff, Lock, Server } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prism-glass p-8 md:p-16 mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Privacy Protocol.</h1>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <EyeOff className="text-indigo-400" size={24} /> Zero Knowledge Architecture
              </h2>
              <p className="leading-relaxed">
                Prism is built on a "Zero-Knowledge" foundation. This means we cannot read your messages, view your files, or access your decryption keys. All encryption and decryption processes happen exclusively within your browser using the Web Crypto API.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Lock className="text-indigo-400" size={24} /> Data Collection
              </h2>
              <p className="leading-relaxed">
                We collect the bare minimum required to maintain your account:
              </p>
              <ul className="list-disc ml-6 mt-4 space-y-2 text-slate-400">
                <li>Username (Identity)</li>
                <li>Hashed Password (Authentication)</li>
                <li>Public RSA Key (Encryption handshake)</li>
                <li>Email/Phone (Verification purposes)</li>
              </ul>
            </section>

            <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Server className="text-indigo-400" size={24} /> Message Storage
              </h2>
              <p className="leading-relaxed text-sm">
                While messages are stored on our servers to allow for offline delivery and history syncing, they are stored as base64-encoded encrypted blobs. Without your local Private Key (which never leaves your device unencrypted), these blobs are mathematically unreadable by anyone, including the Prism team.
              </p>
            </section>

            <footer>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Revised: April 24, 2026</p>
            </footer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
