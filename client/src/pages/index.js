import { motion } from 'framer-motion'
import { Shield, ArrowRight, MessageSquare, Lock, Zap } from 'lucide-react'
import Link from 'next/link'
import Head from 'next/head'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 overflow-hidden">
      <Head>
        <title>Prism | Enterprise E2EE Chat</title>
      </Head>

      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Shield className="text-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter">PRISM</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#enterprise" className="hover:text-white transition-colors">Enterprise</a>
        </div>
        <Link href="/login" className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full text-indigo-400 text-sm font-medium mb-10"
        >
          <Zap size={14} />
          <span>New: Enterprise-Grade Self-Destruct Messages</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8"
        >
          Securing your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-indigo-400">Conversations.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed"
        >
          Prism provides military-grade encryption for teams who value privacy. 
          Messages are encrypted on your device and decrypted only by the recipient.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center"
        >
          <Link href="/register" className="prism-button flex items-center justify-center gap-2 text-lg px-10">
            Start Secure Chat <ArrowRight size={20} />
          </Link>
          <Link href="#security" className="bg-white/5 hover:bg-white/10 border border-white/10 px-10 py-4 rounded-xl font-semibold transition-all">
            View Protocol
          </Link>
        </motion.div>

        {/* Feature Grid Preview */}
        <motion.div
          id="features"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {[
            { icon: <Lock />, title: "Zero Knowledge", desc: "The server never sees your keys or plaintext." },
            { icon: <MessageSquare />, title: "Real-time E2EE", desc: "Blazing fast messaging powered by Web Crypto." },
            { icon: <Shield />, title: "Quantum-Safe", desc: "RSA-OAEP and AES-256-GCM architecture." },
          ].map((feature, i) => (
            <div key={i} className="prism-glass p-8 text-left hover:border-indigo-500/50 transition-all group">
              <div className="bg-indigo-600/20 w-12 h-12 rounded-lg flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Security Section */}
        <motion.div
           id="security"
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="mt-40 text-center"
        >
           <h2 className="text-4xl font-black mb-12">Security Architecture.</h2>
           <div className="prism-glass p-12 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 text-left">
                 <div className="space-y-4">
                    <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Asymmetric Handshake</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Prism utilizes RSA-2048 for identity verification and secure session key exchange. Your private key never leaves your device.</p>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Symmetric Encryption</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">Message payloads are encrypted with AES-256-GCM, providing high-performance authenticated encryption for all data streams.</p>
                 </div>
              </div>
           </div>
        </motion.div>

        {/* Enterprise Section */}
        <motion.div
           id="enterprise"
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="mt-40 text-left w-full max-w-5xl mx-auto"
        >
           <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="text-5xl font-black mb-6 leading-tight">Built for <br /><span className="text-indigo-400">Scale & Trust.</span></h2>
                 <p className="text-slate-400 mb-8 leading-relaxed">Prism Enterprise offers dedicated nodes, custom compliance logs, and centralized security management for organizations that cannot compromise.</p>
                 <Link href="/contact" className="text-indigo-400 font-black flex items-center gap-2 hover:translate-x-2 transition-transform">
                    Inquire about Enterprise <ArrowRight size={16} />
                 </Link>
              </div>
              <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 aspect-square rounded-[2rem] border border-white/5 flex items-center justify-center">
                 <Shield size={120} className="text-indigo-500 opacity-50" />
              </div>
           </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
          <p>© 2026 PRISM. All rights reserved.</p>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Security Protocol</Link>
            <Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link>
            <Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  )
}
