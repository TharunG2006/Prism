import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Scale, AlertTriangle, CheckCircle, Zap } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/login" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors mb-12 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="prism-glass p-8 md:p-16 mb-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Scale className="text-white" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Terms of Service.</h1>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Zap className="text-blue-400" size={24} /> Acceptable Use
              </h2>
              <p className="leading-relaxed">
                Prism is designed for high-security, private communication. By using this platform, you agree to not use the service for illegal activities, harassment, or infrastructure disruption.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <AlertTriangle className="text-amber-400" size={24} /> Key Responsibility
              </h2>
              <p className="leading-relaxed">
                You are the sole custodian of your account password. Since Prism does not have access to your private keys, losing your password means your historical encrypted data is **permanently and mathematically unrecoverable**. We cannot "reset" your encryption keys.
              </p>
            </section>

            <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={24} /> Service Reliability
              </h2>
              <p className="leading-relaxed text-sm">
                While we strive for 100% uptime, Prism is provided "as is". We are not responsible for metadata exposure resulting from user negligence, device compromise, or password sharing.
              </p>
            </section>

            <footer>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Effective Date: April 24, 2026</p>
            </footer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
