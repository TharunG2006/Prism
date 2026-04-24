import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, Globe, Github, Send } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="prism-glass p-8 md:p-12"
          >
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">Get in Touch.</h1>
            <p className="text-slate-400 mb-8">Need support or want to report a vulnerability? Our secure channels are open.</p>

            <div className="space-y-6">
              <a href="mailto:24104039@nec.edu.in" className="flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                <div className="bg-indigo-600/20 p-2 rounded-lg group-hover:bg-indigo-600 transition-colors">
                  <Mail className="text-indigo-400 group-hover:text-white" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Support</div>
                  <div className="text-white font-medium">24104039@nec.edu.in</div>
                </div>
              </a>

              <a href="https://github.com/TharunG2006/Prism" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                <div className="bg-blue-600/20 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <Github className="text-blue-400 group-hover:text-white" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">GitHub Repo</div>
                  <div className="text-white font-medium">TharunG2006/Prism</div>
                </div>
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="prism-glass p-8 md:p-12"
          >
             <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Direct Message.</h2>
             <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Subject</label>
                  <input className="prism-input w-full" placeholder="Security Inquiry" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Message</label>
                  <textarea className="prism-input w-full min-h-[120px] py-4" placeholder="Describe your issue..."></textarea>
                </div>
                <button className="prism-button w-full flex items-center justify-center gap-2 group">
                  Send Pulse <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
