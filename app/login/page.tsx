'use client'

import { useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      setMessage('Magic link sent! Check your inbox to continue.')
      setEmail('')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Something went wrong sending your magic link.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Google sign-in is not configured yet. Add the provider in Supabase to enable.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <MotionConfig reducedMotion="never">
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
        {/* Animated background blobs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-300/20 blur-3xl"
        />

        {/* Subtle grid pattern overlay */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeOpacity="0.08" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6">
          {/* Left panel: brand + copy */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden flex-1 pr-8 text-indigo-50 md:block"
          >
            <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Secure, fast, synced across devices
            </div>

            <h1 className="mb-4 text-5xl font-black leading-tight">
              Finance Manager
            </h1>
            <p className="mb-10 max-w-xl text-lg text-indigo-100/90">
              Stay on top of accounts, transactions, and loans. One login, a complete
              view of your money.
            </p>

            {/* Decorative illustration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <svg
                viewBox="0 0 600 300"
                className="h-56 w-full text-white/90 drop-shadow-xl"
                role="img"
                aria-label="Dashboard illustration"
              >
                <defs>
                  <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                <rect x="20" y="20" rx="18" width="260" height="140" fill="url(#cardGrad)" />
                <rect x="320" y="40" rx="18" width="260" height="100" fill="url(#cardGrad)" />
                <rect x="60" y="190" rx="18" width="220" height="80" fill="url(#cardGrad)" />
                <g transform="translate(350,75)">
                  <path d="M0 40 C40 10 80 60 120 25" stroke="currentColor" strokeWidth="6" fill="none" />
                  <circle cx="0" cy="40" r="6" fill="currentColor" />
                  <circle cx="60" cy="30" r="6" fill="currentColor" />
                  <circle cx="120" cy="25" r="6" fill="currentColor" />
                </g>
              </svg>
            </motion.div>
          </motion.section>

          {/* Right panel: auth card */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="relative z-10 mx-auto w-full max-w-md flex-1"
          >
            <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur">
              <div className="border-b border-black/5 bg-gradient-to-r from-indigo-50 to-violet-50 p-6">
                <div className="flex items-center gap-3">
                  <LogoMark />
                  <div>
                    <h2 className="text-xl font-bold text-indigo-900">Welcome back</h2>
                    <p className="text-sm text-indigo-600">Sign in to continue</p>
                  </div>
                </div>
              </div>

              <form onSubmit={sendMagicLink} className="space-y-4 p-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-70"
                >
                  <span className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 opacity-0 transition group-hover:opacity-100" />
                  {loading ? 'Sending…' : 'Send magic link'}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16v16H4z" opacity="0" />
                    <path d="M4 8l8 5 8-5" />
                  </svg>
                </motion.button>

                <div className="relative py-2 text-center text-sm text-gray-500">
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                  <span className="relative bg-white px-3">or</span>
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-70"
                >
                  <GoogleIcon /> Continue with Google
                </motion.button>

                {message && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {message}
                  </div>
                )}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <p className="pt-2 text-center text-xs text-gray-500">
                  By continuing, you agree to our{' '}
                  <a className="underline hover:text-indigo-600" href="#">Terms</a> and{' '}
                  <a className="underline hover:text-indigo-600" href="#">Privacy Policy</a>.
                </p>
              </form>
            </div>

            {/* Bottom micro-copy */}
            <p className="mt-6 text-center text-sm text-indigo-100/90">
              Trouble signing in? <a href="#" className="font-medium text-white/90 underline">Contact support</a>
            </p>
          </motion.section>
        </main>
      </div>
    </MotionConfig>
  )
}

function LogoMark() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 12a8 8 0 1016 0 8 8 0 10-16 0z" opacity="0" />
        <path d="M7 13l3 3 7-7" />
      </svg>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5">
      <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.7-36.4-4.8-53.6H272v101.5h147.5c-6.4 34.6-25.7 63.9-54.7 83.5v69.2h88.4c51.7-47.6 80.3-117.8 80.3-200.6z"/>
      <path fill="#34A853" d="M272 544.3c73.5 0 135.2-24.3 180.2-66.2l-88.4-69.2c-24.5 16.4-55.8 26-91.8 26-70.6 0-130.4-47.7-151.8-111.8H29.6v70.2C74.3 486.1 166.3 544.3 272 544.3z"/>
      <path fill="#4A90E2" d="M120.2 322.9c-10-29.8-10-61.9 0-91.7V160.9H29.6c-39.6 78.9-39.6 172.4 0 251.3l90.6-69.3z"/>
      <path fill="#FBBC05" d="M272 106.1c39.9-.6 78.2 14.7 107.3 42.7l80.2-80.2C408.2 24.7 342.5-.2 272 0 166.3 0 74.3 58.2 29.6 160.9l90.6 70.3C141.6 153.1 201.4 106.1 272 106.1z"/>
    </svg>
  )
}