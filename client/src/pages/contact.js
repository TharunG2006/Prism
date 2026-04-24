import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Mail, Github } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div className="flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prism-glass p-8 md:p-12 max-w-lg w-full"
          >
            <h1 className="text-4xl font-black text-white tracking-tight mb-4 text-center">Get in Touch.</h1>
            <p className="text-slate-400 mb-8 text-center">Our secure channels are open for support or vulnerability reporting.</p>

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
        </div>
      </div>
    </div>
  )
}
