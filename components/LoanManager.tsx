'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Types
type LoanType = 'given' | 'received'

type Loan = {
  id: string
  person_name: string
  amount: number
  type: LoanType
  description: string
  date_given: string
  is_returned: boolean
  returned_at?: string | null
  account?: { name: string }
  account_id?: string
}

type Account = { id: string; name: string; balance: number }

export default function LoanManager() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  const [filterType, setFilterType] = useState<'all' | LoanType>('all')
  const [search, setSearch] = useState('')

  const [newLoan, setNewLoan] = useState<{
    person_name: string
    amount: string
    type: LoanType
    description: string
    account_id: string
  }>({ person_name: '', amount: '', type: 'given', description: '', account_id: '' })

  const loadData = useCallback(async () => {
    // Load loans with account info
    const { data: loanData } = await supabase
      .from('loans')
      .select(`*, account:accounts(name)`)
      .order('date_given', { ascending: false })
    setLoans((loanData as Loan[] | null) || [])

    // Load accounts with balances
    const { data: accountData } = await supabase
      .from('accounts')
      .select('id, name, balance')
      .order('name')
    const accs = (accountData as Account[] | null) || []
    setAccounts(accs)

    if (accs.length > 0 && !newLoan.account_id) {
      setNewLoan((prev) => ({ ...prev, account_id: accs[0].id }))
    }
  }, [newLoan.account_id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function addLoan(e: React.FormEvent) {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const amount = parseFloat(newLoan.amount)
    const selectedAccount = accounts.find(acc => acc.id === newLoan.account_id)
    
    if (!selectedAccount) {
      alert('Please select an account')
      return
    }

    // Check balance for money given (loan given)
    if (newLoan.type === 'given' && selectedAccount.balance < amount) {
      alert('Insufficient balance in selected account')
      return
    }

    // Calculate new balance
    const newBalance = newLoan.type === 'given' 
      ? selectedAccount.balance - amount 
      : selectedAccount.balance + amount

    // Start transaction
    const { data: loanResult, error: loanError } = await supabase
      .from('loans')
      .insert([{
        person_name: newLoan.person_name.trim(),
        amount: amount,
        type: newLoan.type,
        description: newLoan.description.trim(),
        account_id: newLoan.account_id,
        user_id: user.id,
      }])
      .select()
      .single()

    if (loanError) {
      alert('Error creating loan: ' + loanError.message)
      return
    }

    // Update account balance
    const { error: balanceError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', newLoan.account_id)

    if (balanceError) {
      // Rollback loan creation if balance update fails
      await supabase.from('loans').delete().eq('id', loanResult.id)
      alert('Error updating account balance: ' + balanceError.message)
      return
    }

    // Create transaction record
    await supabase.from('transactions').insert([{
      user_id: user.id,
      account_id: newLoan.account_id,
      to_account_id: null,
      category_id: null,
      type: newLoan.type === 'given' ? 'loan_given' : 'loan_received',
      amount: amount,
      description: `${newLoan.type === 'given' ? 'Loan given to' : 'Loan received from'} ${newLoan.person_name.trim()}${newLoan.description.trim() ? ' - ' + newLoan.description.trim() : ''}`,
      date: new Date().toISOString().split('T')[0]
    }])

    // Reset form and reload data
    setNewLoan({ person_name: '', amount: '', type: 'given', description: '', account_id: newLoan.account_id })
    setShowAddForm(false)
    await loadData()
  }

  async function toggleLoanStatus(id: string, currentStatus: boolean) {
    const loan = loans.find(l => l.id === id)
    if (!loan) return

    const selectedAccount = accounts.find(acc => acc.id === loan.account_id)
    if (!selectedAccount) return

    const newStatus = !currentStatus
    let newBalance = selectedAccount.balance

    // Calculate balance change when marking as returned/unreturned
    if (newStatus) {
      // Marking as returned - reverse the original transaction
      newBalance = loan.type === 'given' 
        ? selectedAccount.balance + loan.amount  // Get money back
        : selectedAccount.balance - loan.amount  // Return borrowed money
    } else {
      // Marking as unreturned - reapply the original transaction
      newBalance = loan.type === 'given' 
        ? selectedAccount.balance - loan.amount  // Money goes out again
        : selectedAccount.balance + loan.amount  // Borrowed money comes back
    }

    // Check if there's sufficient balance for the operation
    if (newBalance < 0) {
      alert('Insufficient balance for this operation')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Update loan status
    const { error: loanError } = await supabase
      .from('loans')
      .update({ 
        is_returned: newStatus, 
        returned_at: newStatus ? new Date().toISOString() : null 
      })
      .eq('id', id)

    if (loanError) {
      alert('Error updating loan status: ' + loanError.message)
      return
    }

    // Update account balance
    const { error: balanceError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', loan.account_id)

    if (balanceError) {
      // Rollback loan status update if balance update fails
      await supabase
        .from('loans')
        .update({ 
          is_returned: currentStatus, 
          returned_at: currentStatus ? new Date().toISOString() : null 
        })
        .eq('id', id)
      alert('Error updating account balance: ' + balanceError.message)
      return
    }

    // Create transaction record for return
    if (newStatus) {
      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: loan.account_id,
        to_account_id: null,
        category_id: null,
        type: loan.type === 'given' ? 'loan_received' : 'loan_given',
        amount: loan.amount,
        description: `${loan.type === 'given' ? 'Loan returned by' : 'Loan repaid to'} ${loan.person_name}${loan.description ? ' - ' + loan.description : ''}`,
        date: new Date().toISOString().split('T')[0]
      }])
    }

    await loadData()
  }

  async function deleteLoan(id: string) {
    if (!confirm('Delete this loan record? This will not affect account balances.')) return
    
    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (!error) {
      await loadData()
    } else {
      alert('Error deleting loan: ' + error.message)
    }
  }

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      const typeMatch = filterType === 'all' || l.type === filterType
      const textMatch = !search || l.person_name.toLowerCase().includes(search.toLowerCase())
      return typeMatch && textMatch
    })
  }, [loans, filterType, search])

  const lentLoans = filtered.filter((l) => l.type === 'given')
  const borrowedLoans = filtered.filter((l) => l.type === 'received')

  const activeLentAmount = lentLoans.filter((l) => !l.is_returned).reduce((sum, l) => sum + l.amount, 0)
  const activeBorrowedAmount = borrowedLoans.filter((l) => !l.is_returned).reduce((sum, l) => sum + l.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Loans & Debts</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | LoanType)}
            className="rounded border px-3 py-2"
          >
            <option value="all">All</option>
            <option value="given">Money Lent</option>
            <option value="received">Money Borrowed</option>
          </select>
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search person" 
            className="rounded border px-3 py-2" 
          />
          <button 
            onClick={() => setShowAddForm((s) => !s)} 
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add Loan'}
          </button>
        </div>
      </div>

      {/* Account Balances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-800">{account.name}</h3>
            <p className="text-2xl font-bold text-blue-600">₹{account.balance.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border border-orange-200 bg-orange-50 p-4">
          <h3 className="font-semibold text-orange-800">Money Lent (Active)</h3>
          <p className="text-2xl font-bold text-orange-600">₹{activeLentAmount.toLocaleString('en-IN')}</p>
          <p className="text-sm text-orange-600">{lentLoans.filter((l) => !l.is_returned).length} pending</p>
        </div>
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800">Money Borrowed (Active)</h3>
          <p className="text-2xl font-bold text-red-600">₹{activeBorrowedAmount.toLocaleString('en-IN')}</p>
          <p className="text-sm text-red-600">{borrowedLoans.filter((l) => !l.is_returned).length} pending</p>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={addLoan} className="space-y-3 rounded border bg-gray-50 p-4">
          <select 
            value={newLoan.type} 
            onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value as LoanType })} 
            className="w-full rounded border px-3 py-2"
          >
            <option value="given">Money Given (Lent)</option>
            <option value="received">Money Received (Borrowed)</option>
          </select>

          <input 
            type="text" 
            placeholder="Person's name" 
            value={newLoan.person_name} 
            onChange={(e) => setNewLoan({ ...newLoan, person_name: e.target.value })} 
            className="w-full rounded border px-3 py-2" 
            required 
          />

          <input 
            type="number" 
            placeholder="Amount" 
            value={newLoan.amount} 
            onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })} 
            className="w-full rounded border px-3 py-2" 
            step="0.01" 
            required 
          />

          <input 
            type="text" 
            placeholder="Description (optional)" 
            value={newLoan.description} 
            onChange={(e) => setNewLoan({ ...newLoan, description: e.target.value })} 
            className="w-full rounded border px-3 py-2" 
          />

          <select 
            value={newLoan.account_id} 
            onChange={(e) => setNewLoan({ ...newLoan, account_id: e.target.value })} 
            className="w-full rounded border px-3 py-2" 
            required
          >
            <option value="">Select account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (Balance: ₹{acc.balance.toLocaleString('en-IN')})
              </option>
            ))}
          </select>

          <button 
            type="submit" 
            className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
          >
            Add Loan
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Money Lent */}
        <div>
          <h3 className="mb-4 font-semibold text-orange-600">💰 Money Lent ({lentLoans.length})</h3>
          <div className="space-y-3">
            {lentLoans.map((loan) => (
              <div 
                key={loan.id} 
                className={`rounded border p-4 ${loan.is_returned ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{loan.person_name}</p>
                    <p className="text-sm text-gray-600">{loan.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(loan.date_given).toLocaleDateString()} • {loan.account?.name}
                      {loan.is_returned && loan.returned_at && (
                        <span className="text-green-600"> • Returned on {new Date(loan.returned_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">₹{Number(loan.amount).toLocaleString('en-IN')}</p>
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => toggleLoanStatus(loan.id, loan.is_returned)} 
                        className={`rounded px-2 py-1 text-xs ${
                          loan.is_returned 
                            ? 'bg-gray-200 text-gray-600' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {loan.is_returned ? 'Mark Pending' : 'Mark Returned'}
                      </button>
                      <button 
                        onClick={() => deleteLoan(loan.id)} 
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Money Borrowed */}
        <div>
          <h3 className="mb-4 font-semibold text-red-600">🏦 Money Borrowed ({borrowedLoans.length})</h3>
          <div className="space-y-3">
            {borrowedLoans.map((loan) => (
              <div 
                key={loan.id} 
                className={`rounded border p-4 ${loan.is_returned ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{loan.person_name}</p>
                    <p className="text-sm text-gray-600">{loan.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(loan.date_given).toLocaleDateString()} • {loan.account?.name}
                      {loan.is_returned && loan.returned_at && (
                        <span className="text-green-600"> • Repaid on {new Date(loan.returned_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">₹{Number(loan.amount).toLocaleString('en-IN')}</p>
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => toggleLoanStatus(loan.id, loan.is_returned)} 
                        className={`rounded px-2 py-1 text-xs ${
                          loan.is_returned 
                            ? 'bg-gray-200 text-gray-600' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {loan.is_returned ? 'Mark Pending' : 'Mark Repaid'}
                      </button>
                      <button 
                        onClick={() => deleteLoan(loan.id)} 
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loans.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No loans recorded yet. Add your first loan or debt!
        </div>
      )}
    </div>
  )
}