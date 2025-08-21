'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AccountManager from './AccountManager'
import TransactionManager from './TransactionManager'
import BudgetsTab from './BudgetsTab' // 👈 New tab

// Local types
type Account = { id: string; name: string; balance: number }
type CategoryRow = { name: string }
type TxRow = { type: 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received'; amount: number }

export default function FinanceMain() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'budgets'>('accounts')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txForSummary, setTxForSummary] = useState<TxRow[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)

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
    // Accounts
    const { data: accountData } = await supabase.from('accounts').select('id, name, balance')
    setAccounts((accountData as Account[] | null) || [])

    // Minimal transactions fetch for summary cards (only types we need)
    const { data: txData } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('type', ['loan_given', 'loan_received'])
    setTxForSummary((txData as TxRow[] | null) || [])
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

  const tabs: { id: 'accounts' | 'transactions' | 'budgets'; label: string; count: number | null }[] = [
    { id: 'accounts', label: 'Accounts', count: accounts.length },
    { id: 'transactions', label: 'Transactions', count: null },
    { id: 'budgets', label: 'Budgets', count: null }, // 👈 replaced Loans with Budgets
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Summary */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Finance Manager</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBalanceVisible((s) => !s)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {balanceVisible ? '👁️ Hide' : '👁️ Show'} Balances
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard
              label="Total Balance"
              color="blue"
              value={balanceVisible ? `₹${totalBalance.toLocaleString('en-IN')}` : '****'}
            />
            <SummaryCard
              label="Money Lent"
              color="orange"
              value={balanceVisible ? `₹${moneyLent.toLocaleString('en-IN')}` : '****'}
            />
            <SummaryCard
              label="Money Owed"
              color="red"
              value={balanceVisible ? `₹${moneyOwed.toLocaleString('en-IN')}` : '****'}
            />
            <SummaryCard
              label="Net Worth"
              color="green"
              value={balanceVisible ? `₹${totalAssets.toLocaleString('en-IN')}` : '****'}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          {activeTab === 'accounts' && <AccountManager onAccountChange={loadSummaryData} />}
          {activeTab === 'transactions' && <TransactionManager />}
          {activeTab === 'budgets' && <BudgetsTab />}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color
}: {
  label: string
  value: string
  color: 'blue' | 'orange' | 'red' | 'green'
}) {
  const base = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700'
  }[color]
  return (
    <div className={`rounded border p-4 ${base}`}>
      <p className="text-sm opacity-90">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}