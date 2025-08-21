'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AccountManager from './AccountManager'
import TransactionManager from './TransactionManager'
import BudgetsTab from './BudgetsTab'

// Local types
type Account = { id: string; name: string; balance: number }
type CategoryRow = { name: string }
type TxRow = { type: 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received'; amount: number }

export default function FinanceMain() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'budgets'>('accounts')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txForSummary, setTxForSummary] = useState<TxRow[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [loading, setLoading] = useState(true)

  // Ensure baseline categories exist (per-user). This is optional and non-blocking.
  const seedCategories = useCallback(async () => {
    try {
      const wanted = ['transport', 'food', 'gym', 'electronics', 'family', 'relationship', 'clothing']
      const { data } = await supabase.from('categories').select('name')
      const existing = new Set(((data as CategoryRow[] | null) || []).map((c) => c.name.toLowerCase()))
      const missing = wanted.filter((n) => !existing.has(n.toLowerCase()))
      if (missing.length) {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData?.user?.id
        if (!uid) return
        await supabase
          .from('categories')
          .insert(missing.map((name) => ({ name, icon: '🏷️', user_id: uid })))
      }
    } catch {
      // ignore seed errors (non-blocking)
    }
  }, [])

  const loadSummaryData = useCallback(async () => {
    setLoading(true)
    try {
      // Accounts
      const { data: accountData } = await supabase.from('accounts').select('id, name, balance')
      setAccounts((accountData as Account[] | null) || [])

      // Minimal transactions fetch for summary cards (only types we need)
      const { data: txData } = await supabase
        .from('transactions')
        .select('type, amount')
        .in('type', ['loan_given', 'loan_received'])
      setTxForSummary((txData as TxRow[] | null) || [])
    } catch (error) {
      console.error('Error loading summary data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void seedCategories()
    void loadSummaryData()
  }, [seedCategories, loadSummaryData])

  // Summaries
  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0),
    [accounts]
  )

  const moneyLent = useMemo(
    () => txForSummary.filter((t) => t.type === 'loan_given').reduce((s, t) => s + Number(t.amount || 0), 0),
    [txForSummary]
  )

  const moneyOwed = useMemo(
    () => txForSummary.filter((t) => t.type === 'loan_received').reduce((s, t) => s + Number(t.amount || 0), 0),
    [txForSummary]
  )

  // Treat net loans (given - received) as an asset in net worth
  const totalAssets = useMemo(
    () => totalBalance + (moneyLent - moneyOwed),
    [totalBalance, moneyLent, moneyOwed]
  )

  const tabs: { id: 'accounts' | 'transactions' | 'budgets'; label: string; icon: string; count: number | null }[] = [
    { id: 'accounts', label: 'Accounts', icon: '🏦', count: accounts.length },
    { id: 'transactions', label: 'Transactions', icon: '💳', count: null },
    { id: 'budgets', label: 'Budgets', icon: '📊', count: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-Optimized Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          {/* Title Section */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                💼 Finance Manager
              </h1>
              <p className="text-sm text-gray-600 sm:hidden">
                Manage your accounts, transactions & budgets
              </p>
            </div>
            
            {/* Balance Toggle - Mobile Optimized */}
            <button
              onClick={() => setBalanceVisible((s) => !s)}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:px-3 sm:py-2"
            >
              <span>{balanceVisible ? '🙈' : '👁️'}</span>
              <span className="sm:hidden">{balanceVisible ? 'Hide Balances' : 'Show Balances'}</span>
              <span className="hidden sm:inline">{balanceVisible ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          {/* Summary Cards - Mobile First */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100 sm:h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <SummaryCard
                label="Total Balance"
                color="blue"
                icon="💰"
                value={balanceVisible ? `₹${totalBalance.toLocaleString('en-IN')}` : '••••'}
              />
              <SummaryCard
                label="Money Lent"
                color="orange"
                icon="📤"
                value={balanceVisible ? `₹${moneyLent.toLocaleString('en-IN')}` : '••••'}
              />
              <SummaryCard
                label="Money Owed"
                color="red"
                icon="📥"
                value={balanceVisible ? `₹${moneyOwed.toLocaleString('en-IN')}` : '••••'}
              />
              <SummaryCard
                label="Net Worth"
                color="green"
                icon="📈"
                value={balanceVisible ? `₹${totalAssets.toLocaleString('en-IN')}` : '••••'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile-Friendly Navigation Tabs */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-3 py-4 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:px-6 sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className="text-base sm:text-sm">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
                {tab.count !== null && (
                  <span className="hidden rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 sm:inline">
                    {tab.count}
                  </span>
                )}
                {/* Mobile count indicator */}
                {tab.count !== null && tab.count > 0 && (
                  <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white sm:hidden">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area - Mobile Optimized */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="p-4 sm:p-6">
            {activeTab === 'accounts' && <AccountManager onAccountChange={loadSummaryData} />}
            {activeTab === 'transactions' && <TransactionManager />}
            {activeTab === 'budgets' && <BudgetsTab />}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Safe Area */}
      <div className="h-safe-area-inset-bottom sm:hidden" />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
  icon
}: {
  label: string
  value: string
  color: 'blue' | 'orange' | 'red' | 'green'
  icon: string
}) {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      accent: 'text-blue-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200', 
      text: 'text-orange-700',
      accent: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      accent: 'text-red-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'text-green-600'
    }
  }[color]

  return (
    <div className={`rounded-lg border p-3 shadow-sm transition-all hover:shadow-md sm:p-4 ${colorConfig.bg} ${colorConfig.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium opacity-90 sm:text-sm ${colorConfig.text}`}>
            {label}
          </p>
          <p className={`mt-1 truncate text-sm font-bold sm:text-xl ${colorConfig.accent}`}>
            {value}
          </p>
        </div>
        <div className={`text-lg opacity-80 sm:text-xl ${colorConfig.accent}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
