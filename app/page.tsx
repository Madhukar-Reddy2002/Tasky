'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import FinanceMain from '@/components/FinanceMain'

export default function HomePage() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null) // null = loading
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setLoggedIn(!!data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    setSigningOut(true)
    setMobileMenuOpen(false)
    try {
      await supabase.auth.signOut()
      setLoggedIn(false)
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <MotionConfig reducedMotion="never">
      {/* App background */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/30 bg-white/20 border-b border-white/20">
          <div className="mx-auto flex max-w-6xl items-center justify-between p-3 sm:p-4 text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <LogoMark />
              <span className="text-base sm:text-lg font-semibold truncate">Finance Manager</span>
            </div>

            {loggedIn ? (
              <div className="flex items-center gap-2">
                {/* Desktop logout button */}
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  onClick={signOut}
                  disabled={signingOut}
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-red-500/90 hover:bg-red-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-lg border border-red-400/50 backdrop-blur disabled:opacity-70 transition-colors"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                  <LogoutIcon />
                </motion.button>

                {/* Mobile menu button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <MenuIcon isOpen={mobileMenuOpen} />
                </motion.button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 sm:gap-2 rounded-xl bg-white text-indigo-700 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold shadow hover:bg-indigo-50 transition-colors"
              >
                <span className="hidden xs:inline">Sign in</span>
                <span className="xs:hidden">Login</span>
                <ChevronRightIcon />
              </Link>
            )}
          </div>

          {/* Mobile dropdown menu */}
          {loggedIn && mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sm:hidden absolute left-0 right-0 top-full bg-white/95 backdrop-blur border-b border-white/20 shadow-lg"
            >
              <div className="p-4 space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={signOut}
                  disabled={signingOut}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-70 transition-colors"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                  <LogoutIcon />
                </motion.button>
              </div>
            </motion.div>
          )}
        </header>

        {/* Content */}
        <main className="mx-auto max-w-6xl p-3 sm:p-6">
          {loggedIn === null && (
            // Loading state while we check the session
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-12 sm:mt-20 grid place-items-center"
            >
              <div className="rounded-2xl border border-white/30 bg-white/20 p-6 text-white shadow-lg backdrop-blur max-w-sm mx-auto text-center">
                <div className="mb-3 mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                <p className="text-sm">Checking your session…</p>
              </div>
            </motion.div>
          )}

          {loggedIn === false && (
            // Logged-out hero with CTA
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-8 sm:mt-16"
            >
              <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2">
                <div className="text-white text-center lg:text-left">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs sm:text-sm">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                    <span className="hidden sm:inline">Secure, fast, synced across devices</span>
                    <span className="sm:hidden">Secure & Fast</span>
                  </div>
                  <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                    All your money,<br className="hidden sm:inline" /> one dashboard.
                  </h1>
                  <p className="mb-6 text-base sm:text-lg text-indigo-100/95 max-w-lg mx-auto lg:mx-0">
                    Track accounts, transactions, loans & net worth with a unified, privacy‑first manager.
                  </p>
                  
                  {/* Feature highlights for mobile */}
                  <div className="mb-6 grid grid-cols-2 gap-3 sm:hidden">
                    <FeatureCard icon="💳" text="Track Cards" />
                    <FeatureCard icon="📊" text="Analytics" />
                    <FeatureCard icon="🔒" text="Secure" />
                    <FeatureCard icon="📱" text="Mobile Ready" />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Link 
                      href="/login" 
                      className="flex-1 sm:flex-none rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 shadow hover:bg-indigo-50 transition-colors text-center"
                    >
                      Get started — Sign in
                    </Link>
                    <a 
                      href="#features" 
                      className="flex-1 sm:flex-none rounded-xl border border-white/40 bg-white/10 px-5 py-3 font-medium text-white shadow hover:bg-white/20 transition-colors text-center"
                    >
                      Learn more
                    </a>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative"
                >
                  <div className="rounded-3xl border border-white/30 bg-white/20 p-4 sm:p-5 shadow-2xl backdrop-blur">
                    {/* Mini summary preview */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <Card label="Total Balance" value="₹•••" tint="blue" />
                      <Card label="Money Lent" value="₹•••" tint="orange" />
                      <Card label="Money Owed" value="₹•••" tint="red" />
                      <Card label="Net Worth" value="₹•••" tint="green" />
                    </div>
                    
                    {/* Quick actions preview */}
                    <div className="mt-4 flex gap-2">
                      <QuickActionButton icon="+" text="Add" />
                      <QuickActionButton icon="📊" text="Report" />
                      <QuickActionButton icon="⚙️" text="Settings" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Features section */}
              <motion.section
                id="features"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-16 sm:mt-24"
              >
                <div className="text-center mb-8 sm:mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Everything you need to manage money
                  </h2>
                  <p className="text-indigo-100/80 max-w-2xl mx-auto">
                    Powerful features designed to give you complete control over your finances
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <FeatureCardLarge
                    icon="💳"
                    title="Account Tracking"
                    description="Monitor multiple bank accounts, credit cards, and digital wallets in one place"
                  />
                  <FeatureCardLarge
                    icon="📊"
                    title="Smart Analytics"
                    description="Get insights into your spending patterns with beautiful charts and reports"
                  />
                  <FeatureCardLarge
                    icon="💰"
                    title="Loan Management"
                    description="Track money you've lent or borrowed with automated reminders"
                  />
                  <FeatureCardLarge
                    icon="🔒"
                    title="Bank-level Security"
                    description="Your data is encrypted and stored securely with enterprise-grade protection"
                  />
                  <FeatureCardLarge
                    icon="📱"
                    title="Mobile Optimized"
                    description="Access your finances anywhere with our responsive mobile design"
                  />
                  <FeatureCardLarge
                    icon="⚡"
                    title="Real-time Sync"
                    description="Changes sync instantly across all your devices for up-to-date information"
                  />
                </div>
              </motion.section>
            </motion.section>
          )}

          {loggedIn && (
            // Authenticated app
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-3 sm:mt-6"
            >
              <div className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/90 shadow-xl overflow-hidden">
                <FinanceMain />
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </MotionConfig>
  )
}

function Card({ label, value, tint }: { label: string; value: string; tint: 'blue' | 'orange' | 'red' | 'green' }) {
  const tintMap: Record<typeof tint, string> = {
    blue: 'from-blue-50 text-blue-700 border-blue-200',
    orange: 'from-orange-50 text-orange-700 border-orange-200',
    red: 'from-red-50 text-red-700 border-red-200',
    green: 'from-green-50 text-green-700 border-green-200',
  } as const
  return (
    <div className={`rounded-xl sm:rounded-2xl border bg-gradient-to-b p-3 sm:p-4 ${tintMap[tint]}`}>
      <p className="text-xs opacity-80 truncate">{label}</p>
      <p className="text-lg sm:text-xl font-bold">{value}</p>
    </div>
  )
}

function FeatureCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/20 p-3 text-center backdrop-blur">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-xs font-medium text-white/90">{text}</div>
    </div>
  )
}

function FeatureCardLarge({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl bg-white/10 border border-white/20 p-6 backdrop-blur hover:bg-white/15 transition-colors cursor-pointer"
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-indigo-100/80">{description}</p>
    </motion.div>
  )
}

function QuickActionButton({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex-1 rounded-lg bg-white/10 border border-white/20 p-2 text-center backdrop-blur">
      <div className="text-sm mb-1">{icon}</div>
      <div className="text-xs font-medium text-white/90">{text}</div>
    </div>
  )
}

function LogoMark() {
  return (
    <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12a8 8 0 1016 0 8 8 0 10-16 0z" opacity="0" />
        <path d="M7 13l3 3 7-7" />
      </svg>
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17l5-5-5-5" />
    </svg>
  )
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="w-5 h-5 flex flex-col justify-center items-center">
      <motion.span
        animate={isOpen ? { rotate: 45, y: 2 } : { rotate: 0, y: 0 }}
        className="block h-0.5 w-4 bg-white origin-center transition-all duration-200"
      />
      <motion.span
        animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
        className="block h-0.5 w-4 bg-white my-0.5 transition-all duration-200"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: -2 } : { rotate: 0, y: 0 }}
        className="block h-0.5 w-4 bg-white origin-center transition-all duration-200"
      />
    </div>
  )
}