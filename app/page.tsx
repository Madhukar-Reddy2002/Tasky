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
        <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/30 bg-white/20 border-b border-white/20">
          <div className="mx-auto flex max-w-6xl items-center justify-between p-4 text-white">
            <div className="flex items-center gap-3">
              <LogoMark />
              <span className="text-lg font-semibold">Finance Manager</span>
            </div>

            {loggedIn ? (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                onClick={signOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white shadow hover:bg-white/20 disabled:opacity-70"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                </svg>
              </motion.button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-indigo-700 px-4 py-2 text-sm font-semibold shadow hover:bg-indigo-50"
              >
                Sign in
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17l5-5-5-5" />
                </svg>
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-6xl p-6">
          {loggedIn === null && (
            // Loading state while we check the session
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-20 grid place-items-center"
            >
              <div className="rounded-2xl border border-white/30 bg-white/20 p-6 text-white shadow-lg backdrop-blur">
                <div className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
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
              className="mt-16"
            >
              <div className="grid items-center gap-10 md:grid-cols-2">
                <div className="text-white">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                    Secure, fast, synced across devices
                  </div>
                  <h1 className="mb-3 text-4xl font-black leading-tight md:text-5xl">All your money, one dashboard.</h1>
                  <p className="mb-6 text-indigo-100/95">Track accounts, transactions, loans & net worth with a unified, privacy‑first manager.</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/login" className="rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 shadow hover:bg-indigo-50">
                      Get started — Sign in
                    </Link>
                    <a href="#features" className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 font-medium text-white shadow hover:bg-white/20">
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
                  <div className="rounded-3xl border border-white/30 bg-white/20 p-5 shadow-2xl backdrop-blur">
                    {/* Mini summary preview */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card label="Total Balance" value="₹•••" tint="blue" />
                      <Card label="Money Lent" value="₹•••" tint="orange" />
                      <Card label="Money Owed" value="₹•••" tint="red" />
                      <Card label="Net Worth" value="₹•••" tint="green" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          {loggedIn && (
            // Authenticated app
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-6"
            >
              <div className="rounded-3xl border border-white/20 bg-white/90 shadow-xl">
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
    <div className={`rounded-2xl border bg-gradient-to-b p-4 ${tintMap[tint]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function LogoMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12a8 8 0 1016 0 8 8 0 10-16 0z" opacity="0" />
        <path d="M7 13l3 3 7-7" />
      </svg>
    </div>
  )
}