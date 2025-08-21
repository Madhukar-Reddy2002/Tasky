'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type Category = { id: string; name: string; icon?: string | null };
type Account = { id: string; name: string };
type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  month: string; // 'YYYY-MM'
  amount: number;
  created_at: string;
  // joins
  category?: { name: string; icon?: string | null };
  account?: { name: string } | null;
};

type TxType = 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received';
type Transaction = {
  id: string;
  category_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
};

export default function BudgetsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add/Edit form
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState<{
    category_id: string;
    account_id: string | 'all';
    amount: string;
  }>({
    category_id: '',
    account_id: 'all', // 'all' means null in DB
    amount: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, icon')
        .order('name');
      setCategories((cats as Category[] | null) ?? []);

      const { data: accs } = await supabase.from('accounts').select('id, name').order('name');
      setAccounts((accs as Account[] | null) ?? []);

      const { data: buds } = await supabase
        .from('budgets')
        .select(
          `*,
           category:categories(name, icon),
           account:accounts(name)`
        )
        .eq('month', month)
        .order('created_at', { ascending: false });
      setBudgets((buds as Budget[] | null) ?? []);

      // Only need expenses of this month for progress
      const { data: txs } = await supabase
        .from('transactions')
        .select('id, category_id, account_id, to_account_id, type, amount, date')
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`);
      setTransactions((txs as Transaction[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Add or update a budget
  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const payload = {
      user_id: uid,
      category_id: form.category_id,
      account_id: form.account_id === 'all' ? null : form.account_id,
      month,
      amount: parseFloat(form.amount || '0'),
    };

    let error: unknown = null;
    if (editing) {
      const res = await supabase.from('budgets').update(payload).eq('id', editing.id).select();
      error = res.error;
    } else {
      const res = await supabase.from('budgets').insert([payload]).select();
      error = res.error;
    }
    if (error) {
      alert('Failed to save budget.');
      return;
    }
    setShowForm(false);
    setEditing(null);
    setForm({ category_id: '', account_id: 'all', amount: '' });
    await loadAll();
  }

  async function deleteBudget(id: string) {
    if (!confirm('Delete this budget?')) return;
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
      alert('Failed to delete budget.');
      return;
    }
    await loadAll();
  }

  function startEdit(b: Budget) {
    setEditing(b);
    setForm({
      category_id: b.category_id,
      account_id: b.account_id ?? 'all',
      amount: String(b.amount),
    });
    setShowForm(true);
  }

  // Compute spent per budget from transactions
  const rows = useMemo(() => {
    // Map: category_id + account_id|null -> spent
    const spentMap = new Map<string, number>();

    const keyFn = (catId: string, accId: string | null) => `${catId}::${accId ?? 'ALL'}`;

    for (const t of transactions) {
      if (t.type !== 'expense' || !t.category_id) continue;
      // When a budget is tied to a specific account, only count expenses from that account
      // For an "all-accounts" budget, count all expenses in the category regardless of account.
      const accKey = t.account_id; // expense leaves account_id
      const key = keyFn(t.category_id, accKey); // used for specific account budgets
      const allKey = keyFn(t.category_id, null); // used for all-accounts budgets

      // Add to both buckets: specific-account and all-accounts category
      spentMap.set(key, (spentMap.get(key) ?? 0) + t.amount);
      spentMap.set(allKey, (spentMap.get(allKey) ?? 0) + t.amount);
    }

    const list = budgets.map((b) => {
      const key = keyFn(b.category_id, b.account_id);
      const spent = spentMap.get(key) ?? 0;
      const remaining = Math.max(0, b.amount - spent);
      const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
      return {
        ...b,
        spent,
        remaining,
        pct,
      };
    });

    // Sorted by highest % used
    return list.sort((a, b) => b.pct - a.pct);
  }, [budgets, transactions]);

  // Chart data (category name + spent vs amount)
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: `${r.category?.name ?? 'Category'}${r.account ? ` (${r.account.name})` : ''}`,
        Budget: r.amount,
        Spent: r.spent,
      })),
    [rows]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Budgets & Goals</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ category_id: '', account_id: 'all', amount: '' });
            setShowForm(true);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showForm ? 'Close' : 'Add Budget'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={saveBudget} className="grid gap-3 rounded border bg-gray-50 p-4 md:grid-cols-4">
          <select
            value={form.category_id}
            onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
            className="w-full rounded border px-3 py-2"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ?? '🏷️'} {c.name}
              </option>
            ))}
          </select>

          <select
            value={form.account_id}
            onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
            className="w-full rounded border px-3 py-2"
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="w-full rounded border px-3 py-2"
            required
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ category_id: '', account_id: 'all', amount: '' });
                  setShowForm(false);
                }}
                className="rounded bg-gray-200 px-3 py-2 hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No budgets for this month.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((b) => (
            <div key={b.id} className="rounded border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {b.account ? `${b.category?.name} • ${b.account.name}` : b.category?.name}
                  </p>
                  <h3 className="text-lg font-semibold">
                    ₹{b.amount.toLocaleString('en-IN')}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(b)}
                    className="rounded bg-blue-600 px-3 py-1 text-white text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="rounded bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* progress bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Spent: ₹{b.spent.toLocaleString('en-IN')}
                  </span>
                  <span className={`font-medium ${b.pct >= 100 ? 'text-red-600' : 'text-green-700'}`}>
                    {b.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-gray-200">
                  <div
                    className={`h-2 rounded ${b.pct >= 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, b.pct)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-gray-500">
                  Remaining: ₹{b.remaining.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {/* {rows.length > 0 && (
        <div className="rounded border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Budget vs Spent</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                <Tooltip
                  formatter={(v: number | string, key: string) => [
                    `₹${Number(v).toLocaleString('en-IN')}`,
                    key,
                  ]}
                />
                <Bar dataKey="Budget" fill="#60a5fa" />
                <Bar dataKey="Spent" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )} */}
    </div>
  );
}