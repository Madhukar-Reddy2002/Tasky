'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, MotionConfig } from 'framer-motion'

// Types
export type Account = {
  id: string
  name: string
  type: 'salary' | 'savings' | 'family' | 'other'
  balance: number
  color: string
  user_id?: string
  created_at?: string
}

type AccountManagerProps = {
  onAccountChange?: () => void
}

// Helper for safe error messages
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unexpected error occurred.'
  }
}

export default function AccountManager({ onAccountChange }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  type NewAccount = { name: string; type: Account['type']; balance: string; color: string }
  const [newAccount, setNewAccount] = useState<NewAccount>({
    name: '',
    type: 'salary',
    balance: '',
    color: '#3b82f6',
  })

  // Derived summary
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [accounts]
  )

  useEffect(() => {
    void loadAccounts()
  }, [])

  async function loadAccounts() {
    setLoading(true)
    setError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setAccounts([])
        return
      }
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts((data as Account[]) || [])
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    // Validate required fields
    if (!newAccount.name.trim()) {
      setError('Account name is required.')
      return
    }
    
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to add accounts.')
      return
    }

    const payload = {
      name: newAccount.name.trim(),
      type: newAccount.type,
      balance: parseFloat(newAccount.balance) || 0,
      color: newAccount.color,
      user_id: user.id,
    }

    // Client-side guard for duplicate names per user
    if (accounts.some((a) => a.name.toLowerCase() === payload.name.toLowerCase())) {
      setError('An account with this name already exists.')
      return
    }

    try {
      const { error } = await supabase.from('accounts').insert([payload])
      if (error) throw error

      setNewAccount({ name: '', type: 'salary', balance: '', color: '#3b82f6' })
      setShowAddForm(false)
      await loadAccounts()
      onAccountChange?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    }
  }

  async function startEdit(id: string) {
    setEditingId(id)
  }

  async function saveEdit(id: string, changes: Partial<Account>) {
    if (!changes.name?.trim()) {
      setError('Account name is required.')
      return
    }
    
    setBusyId(id)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ ...changes })
        .eq('id', id)
      if (error) throw error
      await loadAccounts()
      onAccountChange?.()
      setEditingId(null)
      setError(null)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteAccount(id: string) {
    try {
      // Check references before delete
      const { count: txnCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .or(`account_id.eq.${id},to_account_id.eq.${id}`)

      const { count: loanCount } = await supabase
        .from('loans')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', id)

      const canDelete = (txnCount || 0) === 0 && (loanCount || 0) === 0
      const msg = canDelete
        ? 'Delete this account? This action cannot be undone.'
        : `This account is used in ${txnCount || 0} transaction(s) and ${loanCount || 0} loan(s).\n\nDeleting it may orphan data. Consider editing/migrating those records first.\n\nProceed to delete anyway?`

      if (!confirm(msg)) return

      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
      
      await loadAccounts()
      onAccountChange?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <MotionConfig reducedMotion="never">
      <div className="space-y-4 px-3 sm:px-0">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Accounts ({accounts.length})
            </h2>
            <p className="text-sm text-gray-600 sm:text-xs">
              Total balance:{' '}
              <span className="font-semibold text-green-600">
                ₹{totalBalance.toLocaleString('en-IN')}
              </span>
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowAddForm((s) => !s)
              setError(null) // Clear errors when toggling form
            }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:py-2"
          >
            {showAddForm ? 'Cancel' : '+ Add Account'}
          </motion.button>
        </div>

        {/* Error - Mobile optimized */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* Add form - Mobile optimized */}
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={addAccount}
            className="space-y-4 rounded-lg border bg-gray-50 p-4"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Checking, Savings..."
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as Account['type'] })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="salary">💼 Salary</option>
                    <option value="savings">💰 Savings</option>
                    <option value="family">👨‍👩‍👧‍👦 Family</option>
                    <option value="other">📊 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newAccount.color}
                    onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                    className="h-12 w-20 cursor-pointer rounded-lg border border-gray-300 bg-white"
                    title="Pick a color"
                  />
                </div>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Add Account
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* List - Mobile optimized */}
        <div className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && accounts.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
              <div className="text-4xl mb-2">🏦</div>
              <p className="text-gray-600 font-medium">No accounts yet</p>
              <p className="text-gray-500 text-sm mt-1">Add your first account to get started!</p>
            </div>
          )}

          {!loading &&
            accounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                {editingId === account.id ? (
                  <EditInlineMobile
                    account={account}
                    busy={busyId === account.id}
                    onCancel={() => {
                      setEditingId(null)
                      setError(null)
                    }}
                    onSave={(changes) => saveEdit(account.id, changes)}
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Account info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="h-5 w-5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: account.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {account.name}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize flex items-center gap-1">
                            {account.type === 'salary' && '💼'}
                            {account.type === 'savings' && '💰'}
                            {account.type === 'family' && '👨‍👩‍👧‍👦'}
                            {account.type === 'other' && '📊'}
                            {account.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          ₹{Number(account.balance).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons - Mobile optimized */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => startEdit(account.id)}
                        className="flex-1 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => void deleteAccount(account.id)}
                        className="flex-1 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      </div>
    </MotionConfig>
  )
}

function EditInlineMobile({
  account,
  busy,
  onCancel,
  onSave,
}: {
  account: Account
  busy: boolean
  onCancel: () => void
  onSave: (changes: Partial<Account>) => void
}) {
  const [name, setName] = useState(account.name)
  const [type, setType] = useState<Account['type']>(account.type)
  const [balance, setBalance] = useState(String(account.balance))
  const [color, setColor] = useState(account.color)

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), type, balance: parseFloat(balance) || 0, color })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>✏️</span>
        <span>Editing Account</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Account name"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Account['type'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="salary">💼 Salary</option>
              <option value="savings">💰 Savings</option>
              <option value="family">👨‍👩‍👧‍👦 Family</option>
              <option value="other">📊 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Balance
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-12 w-20 cursor-pointer rounded-lg border border-gray-300 bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Saving...
            </span>
          ) : (
            '💾 Save Changes'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}