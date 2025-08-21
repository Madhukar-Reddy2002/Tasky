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
          : 'Google sign-in failed. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <MotionConfig reducedMotion="never">
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
        {/* Animated background elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3], 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 md:h-96 md:w-96 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.2, 0.5, 0.2], 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0]
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 md:h-[28rem] md:w-[28rem] rounded-full bg-violet-300/20 blur-3xl"
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [-20, -100, -20],
              x: [0, Math.random() * 40 - 20, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 2,
              ease: "easeInOut"
            }}
            className={`pointer-events-none absolute h-2 w-2 rounded-full bg-white/30 ${
              i % 2 === 0 ? 'left-1/4' : 'right-1/4'
            }`}
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`
            }}
          />
        ))}

        {/* Subtle grid pattern overlay */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeOpacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <main className="relative mx-auto flex min-h-screen items-center px-4 md:max-w-6xl md:px-6">
          {/* Mobile: Single column layout */}
          <div className="w-full md:flex md:items-center md:gap-8">
            {/* Brand section - visible on mobile too */}
            <motion.section
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                type: "spring",
                bounce: 0.4
              }}
              className="mb-8 text-center text-indigo-50 md:mb-0 md:flex-1 md:pr-8 md:text-left"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.2,
                  type: "spring",
                  bounce: 0.6
                }}
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm md:mb-6 md:gap-3"
              >
                <motion.span 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block h-2 w-2 rounded-full bg-emerald-300"
                />
                Secure, fast, synced across devices
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mb-3 text-3xl font-black leading-tight md:mb-4 md:text-5xl"
              >
                Finance Manager
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mb-6 text-sm text-indigo-100/90 md:mb-10 md:max-w-xl md:text-lg"
              >
                Stay on top of accounts, transactions, and loans. One login, a complete
                view of your money.
              </motion.p>

              {/* Decorative illustration - hidden on small screens */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 1,
                  delay: 0.6,
                  type: "spring",
                  bounce: 0.3
                }}
                className="relative hidden md:block"
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
                  <motion.rect 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                    x="20" y="20" rx="18" width="260" height="140" fill="url(#cardGrad)" 
                  />
                  <motion.rect 
                    initial={{ scale: 0, rotate: 10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    x="320" y="40" rx="18" width="260" height="100" fill="url(#cardGrad)" 
                  />
                  <motion.rect 
                    initial={{ scale: 0, rotate: -5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, delay: 0.9 }}
                    x="60" y="190" rx="18" width="220" height="80" fill="url(#cardGrad)" 
                  />
                  <motion.g 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.2 }}
                    transform="translate(350,75)"
                  >
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 1.5 }}
                      d="M0 40 C40 10 80 60 120 25" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      fill="none" 
                    />
                    <motion.circle 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.3 }}
                      cx="0" cy="40" r="6" fill="currentColor" 
                    />
                    <motion.circle 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.4 }}
                      cx="60" cy="30" r="6" fill="currentColor" 
                    />
                    <motion.circle 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.5 }}
                      cx="120" cy="25" r="6" fill="currentColor" 
                    />
                  </motion.g>
                </svg>
              </motion.div>
            </motion.section>

            {/* Auth card */}
            <motion.section
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                delay: 0.2,
                type: "spring",
                bounce: 0.4
              }}
              className="relative z-10 mx-auto w-full max-w-md md:flex-1"
            >
              <motion.div 
                whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl md:rounded-3xl"
              >
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="border-b border-black/5 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 md:p-6"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <LogoMark />
                    </motion.div>
                    <div>
                      <motion.h2 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="text-lg font-bold text-indigo-900 md:text-xl"
                      >
                        Welcome back
                      </motion.h2>
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="text-sm text-indigo-600"
                      >
                        Sign in to continue
                      </motion.p>
                    </div>
                  </div>
                </motion.div>

                <motion.form 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  onSubmit={sendMagicLink} 
                  className="space-y-4 p-4 md:p-6"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <motion.input
                      whileFocus={{ scale: 1.02, boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)" }}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 10px 30px -10px rgba(99, 102, 241, 0.4)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-70"
                  >
                    <motion.span 
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-600 to-purple-600"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "0%" }}
                      transition={{ duration: 0.3 }}
                    />
                    <span className="relative z-10">
                      {loading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                      ) : (
                        'Send magic link'
                      )}
                    </span>
                    {!loading && (
                      <motion.svg
                        whileHover={{ x: 5 }}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="relative z-10 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m3 3 3 9-3 9 19-9Z" />
                        <path d="M6 12h16" />
                      </motion.svg>
                    )}
                  </motion.button>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="relative py-2 text-center text-sm text-gray-500"
                  >
                    <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                    <span className="relative bg-white px-3">or</span>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 hover:shadow-md disabled:opacity-70"
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <GoogleIcon />
                    </motion.div>
                    Continue with Google
                  </motion.button>

                  {message && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.4 }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                      <div className="flex items-center gap-2">
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", bounce: 0.6 }}
                          className="h-4 w-4 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </motion.svg>
                        {message}
                      </div>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", bounce: 0.4 }}
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", bounce: 0.6 }}
                          className="h-4 w-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </motion.svg>
                        {error}
                      </div>
                    </motion.div>
                  )}

                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                    className="pt-2 text-center text-xs text-gray-500"
                  >
                    By continuing, you agree to our{' '}
                    <motion.a 
                      whileHover={{ scale: 1.05 }}
                      className="underline hover:text-indigo-600" 
                      href="#"
                    >
                      Terms
                    </motion.a> and{' '}
                    <motion.a 
                      whileHover={{ scale: 1.05 }}
                      className="underline hover:text-indigo-600" 
                      href="#"
                    >
                      Privacy Policy
                    </motion.a>.
                  </motion.p>
                </motion.form>
              </motion.div>

              {/* Bottom micro-copy */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-4 text-center text-sm text-indigo-100/90 md:mt-6"
              >
                Trouble signing in?{' '}
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  href="#" 
                  className="font-medium text-white/90 underline"
                >
                  Contact support
                </motion.a>
              </motion.p>
            </motion.section>
          </div>
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
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
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