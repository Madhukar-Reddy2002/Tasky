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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

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

    const { error } = await supabase.from('accounts').insert([payload])
    if (error) {
      setError(getErrorMessage(error))
      return
    }

    setNewAccount({ name: '', type: 'salary', balance: '', color: '#3b82f6' })
    setShowAddForm(false)
    await loadAccounts()
    onAccountChange?.()
  }

  async function startEdit(id: string) {
    setEditingId(id)
  }

  async function saveEdit(id: string, changes: Partial<Account>) {
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
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteAccount(id: string) {
    // Check references before delete
    const { count: txnCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${id},to_account_id.eq.${id}`)

    const { count: loanCount } = await supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)

    const canDelete = txnCount === 0 && loanCount === 0
    const msg = canDelete
      ? 'Delete this account? This action cannot be undone.'
      : `This account is used in ${txnCount || 0} transaction(s) and ${loanCount || 0} loan(s).\n\nDeleting it may orphan data. Consider editing/migrating those records first.\n\nProceed to delete anyway?`

    if (!confirm(msg)) return

    await supabase.from('accounts').delete().eq('id', id)
    await loadAccounts()
    onAccountChange?.()
  }

  return (
    <MotionConfig reducedMotion="never">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Accounts ({accounts.length})</h2>
            <p className="text-xs text-gray-500">Total balance: <span className="font-medium">₹{totalBalance.toLocaleString('en-IN')}</span></p>
          </div>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            onClick={() => setShowAddForm((s) => !s)}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow hover:bg-indigo-700"
          >
            {showAddForm ? 'Cancel' : 'Add Account'}
          </motion.button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Add form */}
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={addAccount}
            className="grid gap-3 rounded-lg border bg-gray-50 p-4 md:grid-cols-5"
          >
            <input
              type="text"
              placeholder="Account name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="w-full rounded border px-3 py-2 md:col-span-2"
              required
            />
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as Account['type'] })}
              className="w-full rounded border px-3 py-2"
            >
              <option value="salary">Salary</option>
              <option value="savings">Savings</option>
              <option value="family">Family</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              placeholder="Initial balance"
              value={newAccount.balance}
              onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
              className="w-full rounded border px-3 py-2"
              step="0.01"
            />
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newAccount.color}
                onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border bg-white"
                title="Pick a color"
              />
              <button type="submit" className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
                Add
              </button>
            </div>
          </motion.form>
        )}

        {/* List */}
        <div className="grid gap-3">
          {loading && (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && accounts.length === 0 && (
            <div className="py-10 text-center text-gray-500">No accounts yet. Add your first account!</div>
          )}

          {!loading &&
            accounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: account.color }} />
                    <div>
                      {editingId === account.id ? (
                        <EditInline
                          account={account}
                          busy={busyId === account.id}
                          onCancel={() => setEditingId(null)}
                          onSave={(changes) => saveEdit(account.id, changes)}
                        />
                      ) : (
                        <>
                          <h3 className="font-semibold">{account.name}</h3>
                          <p className="text-sm capitalize text-gray-600">{account.type}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">₹{Number(account.balance).toLocaleString('en-IN')}</p>
                    {editingId !== account.id ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => startEdit(account.id)}
                          className="rounded bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteAccount(account.id)}
                          className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">Editing…</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </MotionConfig>
  )
}

function EditInline({
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

  return (
    <div className="grid gap-2 md:grid-cols-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <select value={type} onChange={(e) => setType(e.target.value as Account['type'])} className="w-full rounded border px-3 py-2">
        <option value="salary">Salary</option>
        <option value="savings">Savings</option>
        <option value="family">Family</option>
        <option value="other">Other</option>
      </select>
      <input
        type="number"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        className="w-full rounded border px-3 py-2"
        step="0.01"
      />
      <div className="flex items-center gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border bg-white" />
        <div className="flex gap-2">
          <button
            onClick={() =>
              onSave({ name: name.trim(), type, balance: parseFloat(balance) || 0, color })
            }
            disabled={busy}
            className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel} className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}