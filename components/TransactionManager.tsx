'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

// Types
type TxType = 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received';
type TabKey = 'transactions' | 'history' | 'summary';

type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  type: TxType;
  amount: number;
  description: string;
  date: string; // ISO (YYYY-MM-DD)
  created_at: string;
  // Joined
  category?: { name: string; icon?: string | null };
  account?: { name: string };
  to_account?: { name: string };
};

type Account = { id: string; name: string; balance: number };
type Category = { id: string; name: string; icon?: string | null };

// Payload for inserts
type InsertTx = {
  user_id: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  type: TxType;
  amount: number;
  description: string;
  date: string;
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

// For Recharts Pie label typing
interface PieLabelProps {
  name: string;
  percent?: number;
}

export default function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // tabs
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');

  // add form
  const [showAddForm, setShowAddForm] = useState(false);

  // filters (transactions tab)
  const [selectedAccount, setSelectedAccount] = useState<'all' | string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | string>('all');
  const [selectedType, setSelectedType] = useState<'all' | TxType>('all');

  // history tab
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<string>('');

  // summary tab
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // add txn form state
  const [newTx, setNewTx] = useState<{
    type: TxType;
    amount: string;
    description: string;
    date: string;
    account_id: string;
    to_account_id: string;
    category_id: string;
  }>(() => ({
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    to_account_id: '',
    category_id: '',
  }));

  const loadData = useCallback(async () => {
    const { data: txData } = await supabase
      .from('transactions')
      .select(
        `*,
         category:categories(name, icon),
         account:accounts!transactions_account_id_fkey(name),
         to_account:accounts!transactions_to_account_id_fkey(name)`
      )
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    setTransactions((txData as Transaction[] | null) || []);

    const { data: accData } = await supabase
      .from('accounts')
      .select('id, name, balance')
      .order('name');
    const accs = (accData as Account[] | null) || [];
    setAccounts(accs);

    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, icon')
      .order('name');
    setCategories((catData as Category[] | null) || []);

    // defaults
    if (accs.length && !newTx.account_id) {
      setNewTx((p) => ({ ...p, account_id: accs[0].id }));
    }
    if (accs.length && !selectedHistoryAccount) {
      setSelectedHistoryAccount(accs[0].id);
    }
  }, [newTx.account_id, selectedHistoryAccount]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------- Filters for Transactions tab ----------
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (selectedAccount !== 'all') {
      list = list.filter(
        (t) => t.account_id === selectedAccount || t.to_account_id === selectedAccount
      );
    }
    if (selectedCategoryId !== 'all') {
      list = list.filter((t) => t.category_id === selectedCategoryId);
    }
    if (selectedType !== 'all') {
      list = list.filter((t) => t.type === selectedType);
    }
    return list;
  }, [transactions, selectedAccount, selectedCategoryId, selectedType]);

  // ---------- History tab data (running balance computed in-memory) ----------
  const historyRows = useMemo(() => {
    if (!selectedHistoryAccount) {
      return [] as Array<Transaction & { balance_after: number; change: number }>;
    }

    const acc = accounts.find((a) => a.id === selectedHistoryAccount);
    if (!acc) {
      return [] as Array<Transaction & { balance_after: number; change: number }>;
    }

    const txAsc = transactions
      .filter((t) => t.account_id === selectedHistoryAccount || t.to_account_id === selectedHistoryAccount)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    // compute total delta across filtered rows from perspective of selectedHistoryAccount
    const totalDelta = txAsc.reduce((sum, t) => {
      let delta = 0;
      if (t.type === 'income' || t.type === 'loan_received') {
        if (t.account_id === selectedHistoryAccount) delta = t.amount;
      }
      if (t.type === 'expense' || t.type === 'loan_given') {
        if (t.account_id === selectedHistoryAccount) delta = -t.amount;
      }
      if (t.type === 'transfer') {
        if (t.account_id === selectedHistoryAccount) delta = -t.amount;
        if (t.to_account_id === selectedHistoryAccount) delta = t.amount;
      }
      return sum + delta;
    }, 0);

    // back-calc starting balance so that final balance equals current account balance
    let running = acc.balance - totalDelta;

    const out: Array<Transaction & { balance_after: number; change: number }> = [];
    for (const t of txAsc) {
      let change = 0;
      if (t.type === 'income' || t.type === 'loan_received') {
        if (t.account_id === selectedHistoryAccount) change = t.amount;
      } else if (t.type === 'expense' || t.type === 'loan_given') {
        if (t.account_id === selectedHistoryAccount) change = -t.amount;
      } else if (t.type === 'transfer') {
        if (t.account_id === selectedHistoryAccount) change = -t.amount;
        if (t.to_account_id === selectedHistoryAccount) change = t.amount;
      }
      running += change;
      out.push({ ...t, balance_after: running, change });
    }
    // newest first for list; chart will use ascending order
    return out.reverse();
  }, [transactions, selectedHistoryAccount, accounts]);

  // ---------- Summary tab aggregates ----------
  const monthly = useMemo(() => {
    const month = selectedMonth; // 'YYYY-MM'
    const monthTx = transactions.filter((t) => t.date.startsWith(month));

    // category spending: expenses only
    const categorySpending = monthTx
      .filter((t) => t.type === 'expense' && t.category?.name)
      .reduce((acc, t) => {
        const key = t.category!.name!;
        acc[key] = (acc[key] ?? 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Add high-level totals
    const totalIncome = monthTx
      .filter((t) => t.type === 'income' || t.type === 'loan_received' || (t.type === 'transfer' && t.to_account_id))
      .reduce((s, t) => s + (t.type === 'transfer' ? (t.to_account_id ? t.amount : 0) : t.amount), 0);

    const totalExpenses = monthTx
      .filter((t) => t.type === 'expense' || t.type === 'loan_given' || t.type === 'transfer')
      .reduce((s, t) => s + (t.type === 'transfer' ? t.amount : t.amount), 0);

    const net = totalIncome - totalExpenses;

    // account activity bars (income vs expenses from perspective of each account)
    const accountBreakdown = accounts.map((acc) => {
      const related = monthTx.filter((t) => t.account_id === acc.id || t.to_account_id === acc.id);
      const income =
        related
          .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'loan_received'))
          .reduce((s, t) => s + t.amount, 0) +
        related
          .filter((t) => t.type === 'transfer' && t.to_account_id === acc.id)
          .reduce((s, t) => s + t.amount, 0);

      const expenses = related
        .filter(
          (t) =>
            t.account_id === acc.id &&
            (t.type === 'expense' || t.type === 'loan_given' || t.type === 'transfer')
        )
        .reduce((s, t) => s + t.amount, 0);

      return { name: acc.name, income, expenses };
    });

    const pieData = Object.entries(categorySpending).map(([name, value]) => ({ name, value }));

    return { categorySpending, accountBreakdown, pieData, totalIncome, totalExpenses, net };
  }, [transactions, accounts, selectedMonth]);

  // ---------- Actions ----------
  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const payload: InsertTx = {
      user_id: uid,
      type: newTx.type,
      amount: parseFloat(newTx.amount || '0'),
      description: newTx.description.trim(),
      date: newTx.date,
      account_id: newTx.account_id || null,
      to_account_id: newTx.type === 'transfer' ? newTx.to_account_id : null,
      // category only for EXPENSE; income/transfer/loan_* do not need a category
      category_id: newTx.type === 'expense' ? newTx.category_id : null,
    };

    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) {
      alert('Error adding transaction: ' + error.message);
      return;
    }

    setNewTx((p) => ({
      ...p,
      amount: '',
      description: '',
      to_account_id: '',
      // keep last expense category handy; harmless for non-expense
      category_id: p.category_id,
    }));
    setShowAddForm(false);
    await loadData();
  }

  // ---------- Render helpers ----------
  const renderTransactionsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Transactions ({filteredTransactions.length})</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | TxType)}
            className="rounded border px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="income">income</option>
            <option value="expense">expense</option>
            <option value="transfer">transfer</option>
            <option value="loan_given">loan_given</option>
            <option value="loan_received">loan_received</option>
          </select>

          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>
      </div>

      {/* Quick balances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-800">{account.name}</h3>
            <p className="text-2xl font-bold text-blue-600">
              ₹{account.balance.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      {showAddForm && (
        <form onSubmit={addTransaction} className="grid gap-3 rounded border bg-gray-50 p-4 md:grid-cols-5">
          <select
            value={newTx.type}
            onChange={(e) => setNewTx({ ...newTx, type: e.target.value as TxType })}
            className="w-full rounded border px-3 py-2"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="loan_given">Loan Given</option>
            <option value="loan_received">Loan Received</option>
          </select>

          <input
            type="number"
            placeholder="Amount"
            value={newTx.amount}
            onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
            className="w-full rounded border px-3 py-2"
            step="0.01"
            required
          />

          <input
            type="text"
            placeholder="Description"
            value={newTx.description}
            onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
            className="w-full rounded border px-3 py-2"
            required
          />

          <input
            type="date"
            value={newTx.date}
            onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
            className="w-full rounded border px-3 py-2"
          />

          <select
            value={newTx.account_id}
            onChange={(e) => setNewTx({ ...newTx, account_id: e.target.value })}
            className="w-full rounded border px-3 py-2"
            required
          >
            <option value="">From account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (₹{acc.balance.toLocaleString('en-IN')})
              </option>
            ))}
          </select>

          {newTx.type === 'transfer' && (
            <select
              value={newTx.to_account_id}
              onChange={(e) => setNewTx({ ...newTx, to_account_id: e.target.value })}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">To account</option>
              {accounts
                .filter((acc) => acc.id !== newTx.account_id)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
            </select>
          )}

          {/* Category only when Expense */}
          {newTx.type === 'expense' && (
            <select
              value={newTx.category_id}
              onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ?? '🏷️'} {cat.name}
                </option>
              ))}
            </select>
          )}

          <div className="md:col-span-5">
            <button type="submit" className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
              Add
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filteredTransactions.map((t) => (
          <div key={t.id} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {t.category?.icon ??
                    (t.type === 'transfer' ? '↔️' : t.type === 'income' ? '💰' : t.type === 'loan_given' ? '📤' : t.type === 'loan_received' ? '📥' : '💸')}
                </span>
                <div>
                  <p className="font-semibold">{t.description}</p>
                  <p className="text-sm text-gray-600">
                    {(t.category?.name || t.type.replace('_', ' '))} • {new Date(t.date).toLocaleDateString()} • {t.account?.name}
                    {t.to_account && ` → ${t.to_account.name}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold ${
                    t.type === 'income' || t.type === 'loan_received' || (t.type === 'transfer' && t.to_account_id === selectedAccount)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' || t.type === 'loan_received' || (t.type === 'transfer' && t.to_account_id === selectedAccount)
                    ? '+'
                    : '-'}
                  ₹{Number(t.amount).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredTransactions.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No transactions yet. Add your first transaction!
        </div>
      )}
    </div>
  );

  // ---------- History tab ----------
  const renderHistoryTab = () => {
    // build rows with running balance (newest first already)
    const chartAsc = historyRows.slice().reverse(); // ascending for line chart

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <select
            value={selectedHistoryAccount}
            onChange={(e) => setSelectedHistoryAccount(e.target.value)}
            className="rounded border px-3 py-2"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {selectedHistoryAccount && (
          <>
            {/* Balance Chart */}
            <div className="rounded border bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold">Balance History</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartAsc}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString()}
                    />
                    <YAxis tickFormatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                    <Tooltip
                      formatter={(val: number | string) => [
                        `₹${Number(val).toLocaleString('en-IN')}`,
                        'Balance',
                      ]}
                      labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="balance_after" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction list */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              {historyRows.map((t) => (
                <div key={t.id} className="rounded border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {t.category?.icon ??
                          (t.type === 'transfer'
                            ? '↔️'
                            : t.type === 'income'
                            ? '💰'
                            : t.type === 'loan_given'
                            ? '📤'
                            : t.type === 'loan_received'
                            ? '📥'
                            : '💸')}
                      </span>
                      <div>
                        <p className="font-semibold">{t.description}</p>
                        <p className="text-sm text-gray-600">
                          {(t.category?.name || t.type.replace('_', ' '))} •{' '}
                          {new Date(t.date).toLocaleDateString()}
                          {t.to_account && ` → ${t.to_account.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.change >= 0 ? '+' : '-'}₹{Math.abs(t.change).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: ₹{Number(t.balance_after).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ---------- Summary tab ----------
  const renderSummaryTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Monthly Summary</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Total Inflows</p>
          <p className="text-2xl font-bold text-emerald-700">
            ₹{monthly.totalIncome.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Total Outflows</p>
          <p className="text-2xl font-bold text-rose-700">
            ₹{monthly.totalExpenses.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">Net</p>
          <p className={`text-2xl font-bold ${monthly.net >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            ₹{monthly.net.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Spending Pie */}
        <div className="rounded border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Spending by Category</h3>
          {monthly.pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthly.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }: { name: string; percent?: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthly.pieData.map((_entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string) => [
                      `₹${Number(value).toLocaleString('en-IN')}`,
                      'Amount',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500">No expenses in selected month</p>
          )}
        </div>

        {/* Account Activity Bars */}
        <div className="rounded border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Account Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.accountBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                <Tooltip
                  formatter={(v: number | string) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="income" fill="#10b981" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-2 text-left">Category</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthly.categorySpending)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const txCount = transactions.filter(
                    (t) =>
                      t.category?.name === category &&
                      t.date.startsWith(selectedMonth) &&
                      t.type === 'expense'
                  ).length;

                  return (
                    <tr key={category} className="border-b">
                      <td className="py-2">{category}</td>
                      <td className="py-2 text-right">
                        ₹{Number(amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 text-right">{txCount}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ---------- Main render ----------
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {([
            { key: 'transactions', label: 'Transactions' },
            { key: 'history', label: 'History' },
            { key: 'summary', label: 'Summary' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && renderTransactionsTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'summary' && renderSummaryTab()}
    </div>
  );
}