import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Shield, CheckCircle, XCircle, Loader } from 'lucide-react'
import Link from 'next/link'

export default function Verify() {
  const router = useRouter()
  const { email, token } = router.query
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (email && token) {
      verifyEmail()
    }
  }, [email, token])

  const verifyEmail = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify?email=${email}&token=${token}`)
      setStatus('success')
      setMessage(res.data)
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.msg || 'Verification failed. The link may have expired.')
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      
      <div className="relative z-10 w-full max-w-md prism-glass p-8 md:p-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
            <Shield className="text-white" size={32} />
          </div>
        </div>

        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader className="text-indigo-400 animate-spin" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-white">Verifying your email...</h1>
            <p className="text-slate-400">Please wait while we secure your account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="text-emerald-400" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-white">Verification Successful!</h1>
            <p className="text-slate-400">{message}</p>
            <div className="pt-4">
              <Link href="/login" className="prism-button inline-block w-full">
                Sign In to Prism
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <XCircle className="text-rose-400" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
            <p className="text-rose-400/80">{message}</p>
            <div className="pt-4">
              <Link href="/register" className="text-indigo-400 hover:text-white font-bold transition-colors">
                Try Registering Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
