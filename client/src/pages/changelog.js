import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, History, Package, ShieldCheck, Zap, AlertCircle } from 'lucide-react'

export default function Changelog() {
  const updates = [
    {
      version: "v1.0.0",
      date: "April 24, 2026",
      title: "The Genesis Release",
      type: "Initial Launch",
      changes: [
        { icon: <ShieldCheck className="text-emerald-400" />, text: "True E2EE Handshake with RSA-2048 & AES-256-GCM." },
        { icon: <Zap className="text-indigo-400" />, text: "Real-time Multicast Group Secure Messaging." },
        { icon: <Package className="text-blue-400" />, text: "Secondary Security Vault for metadata protection." },
        { icon: <ShieldCheck className="text-emerald-400" />, text: "Proprietary License & Institutional Branding integration." }
      ]
    },
    {
      version: "v0.9.5-beta",
      date: "April 20, 2026",
      title: "Security Hardening",
      type: "Update",
      changes: [
        { icon: <AlertCircle className="text-amber-400" />, text: "Increased PBKDF2 iterations for key derivation." },
        { icon: <Zap className="text-indigo-400" />, text: "Optimized Socket.IO heartbeat for mobile stability." }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
              <History size={32} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">Changelog.</h1>
          </motion.div>
          <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
            Tracking every line of code that secures your world.
          </p>
        </header>

        <div className="space-y-16">
          {updates.map((update, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="text-indigo-400 font-black text-xl font-mono">{update.version}</span>
                <div className="h-px flex-1 bg-white/5"></div>
                <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">{update.date}</span>
              </div>

              <div className="prism-glass p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-white tracking-tight">{update.title}</h2>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {update.type}
                  </span>
                </div>

                <ul className="space-y-4">
                  {update.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0">
                        {change.icon}
                      </div>
                      <p className="text-slate-300 font-medium leading-relaxed uppercase tracking-tight text-sm">
                        {change.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm font-medium">
            © 2026 PRISM Secure Systems. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}
