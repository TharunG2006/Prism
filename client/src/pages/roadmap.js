import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Rocket, Shield, Zap, Smartphone, Monitor, Lock, Calendar } from 'lucide-react'

export default function Roadmap() {
  const phases = [
    {
      title: "Phase 1: Communication Expansion",
      timeline: "Q2 2026",
      status: "In Development",
      color: "bg-indigo-600",
      items: [
        { icon: <Zap size={18} />, text: "E2EE Voice Calls (P2P Audio)" },
        { icon: <Zap size={18} />, text: "E2EE Video Calls (HD Secure)" },
        { icon: <Zap size={18} />, text: "Message Reactions & Polling" }
      ]
    },
    {
      title: "Phase 2: Privacy Enhancements",
      timeline: "Q3 2026",
      status: "Planning",
      color: "bg-blue-600",
      items: [
        { icon: <Shield size={18} />, text: "Self-Destructing Messages" },
        { icon: <Shield size={18} />, text: "One-Time View Media" },
        { icon: <Shield size={18} />, text: "Granular Privacy Controls" }
      ]
    },
    {
      title: "Phase 3: Platform Growth",
      timeline: "Q4 2026",
      status: "Proposed",
      color: "bg-emerald-600",
      items: [
        { icon: <Smartphone size={18} />, text: "Native iOS & Android Apps" },
        { icon: <Monitor size={18} />, text: "Dedicated Desktop Clients" },
        { icon: <Lock size={18} />, text: "Biometric Metadata Vault" }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Dashboard
        </Link>

        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-600/20">
              <Rocket className="text-white" size={32} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">Roadmap.</h1>
          </motion.div>
          <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
            Discover the future of secure communication. Our mission is to build the world's most private ecosystem, one block at a time.
          </p>
        </header>

        <div className="space-y-12">
          {phases.map((phase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-8 md:pl-12 border-l-2 border-white/5"
            >
              <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${phase.color} shadow-lg shadow-white/10`} />
              
              <div className="prism-glass p-8 md:p-10 mb-4 group hover:border-indigo-500/30 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs mb-2">
                       <Calendar size={14} /> {phase.timeline}
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{phase.title}</h2>
                  </div>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 self-start">
                    {phase.status}
                  </span>
                </div>

                <ul className="grid md:grid-cols-2 gap-6">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm font-medium">
            © 2026 PRISM Secure Systems. Proprietary & Confidential.
          </p>
        </footer>
      </div>
    </div>
  )
}
