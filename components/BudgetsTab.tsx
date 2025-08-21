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
  PieChart,
  Pie,
  Cell,
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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];

export default function BudgetsTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<'bar' | 'pie' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'usage' | 'amount' | 'name'>('usage');
  const [filterStatus, setFilterStatus] = useState<'all' | 'exceeded' | 'safe'>('all');

  // Add/Edit form
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<{
    category_id: string;
    account_id: string | 'all';
    amount: string;
  }>({
    category_id: '',
    account_id: 'all', // 'all' means null in DB
    amount: '',
  });

  // Quick budget templates
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const templates = [
    { name: 'Essential Living', categories: [
      { name: 'food', amount: 15000 },
      { name: 'transport', amount: 5000 },
      { name: 'family', amount: 10000 }
    ]},
    { name: 'Young Professional', categories: [
      { name: 'food', amount: 12000 },
      { name: 'gym', amount: 2000 },
      { name: 'clothing', amount: 8000 },
      { name: 'electronics', amount: 5000 }
    ]},
    { name: 'Conservative', categories: [
      { name: 'food', amount: 8000 },
      { name: 'transport', amount: 3000 },
      { name: 'family', amount: 5000 }
    ]}
  ];

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      setError('Failed to load budget data. Please try again.');
      console.error('Error loading budgets:', err);
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
    setSaving(true);
    setError(null);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setError('You must be logged in to manage budgets.');
        return;
      }

      if (!form.category_id || !form.amount) {
        setError('Please fill in all required fields.');
        return;
      }

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
        // Check for duplicate budget
        const existing = budgets.find(b => 
          b.category_id === payload.category_id && 
          b.account_id === payload.account_id
        );
        if (existing) {
          setError('A budget for this category and account already exists for this month.');
          return;
        }
        
        const res = await supabase.from('budgets').insert([payload]).select();
        error = res.error;
      }
      
      if (error) {
        setError('Failed to save budget. Please try again.');
        return;
      }
      
      setShowForm(false);
      setEditing(null);
      setForm({ category_id: '', account_id: 'all', amount: '' });
      await loadAll();
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(id: string) {
    if (!confirm('Delete this budget?')) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) {
        setError('Failed to delete budget.');
        return;
      }
      await loadAll();
    } catch (err) {
      setError('Failed to delete budget.');
      console.error('Error deleting budget:', err);
    }
  }

  function startEdit(b: Budget) {
    setEditing(b);
    setForm({
      category_id: b.category_id,
      account_id: b.account_id ?? 'all',
      amount: String(b.amount),
    });
    setShowForm(true);
    setError(null);
  }

  async function applyTemplate(template: typeof templates[0]) {
    if (!confirm(`Apply "${template.name}" template? This will create budgets for ${template.categories.length} categories.`)) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const budgetsToCreate = [];
      
      for (const cat of template.categories) {
        const category = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
        if (category) {
          const existing = budgets.find(b => b.category_id === category.id && !b.account_id);
          if (!existing) {
            budgetsToCreate.push({
              user_id: uid,
              category_id: category.id,
              account_id: null,
              month,
              amount: cat.amount
            });
          }
        }
      }

      if (budgetsToCreate.length > 0) {
        const { error } = await supabase.from('budgets').insert(budgetsToCreate);
        if (!error) {
          await loadAll();
          setShowTemplates(false);
        }
      }
    } catch (err) {
      setError('Failed to apply template.');
      console.error('Error applying template:', err);
    }
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

    let list = budgets.map((b) => {
      const key = keyFn(b.category_id, b.account_id);
      const spent = spentMap.get(key) ?? 0;
      const remaining = Math.max(0, b.amount - spent);
      const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
      return {
        ...b,
        spent,
        remaining,
        pct,
        status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'safe'
      };
    });

    // Apply filters
    if (filterStatus !== 'all') {
      list = list.filter(item => {
        if (filterStatus === 'exceeded') return item.pct >= 100;
        if (filterStatus === 'safe') return item.pct < 80;
        return true;
      });
    }

    // Apply sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.pct - a.pct;
        case 'amount':
          return b.amount - a.amount;
        case 'name':
          return (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
        default:
          return b.pct - a.pct;
      }
    });

    return list;
  }, [budgets, transactions, filterStatus, sortBy]);

  // Chart data
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: `${r.category?.name ?? 'Category'}${r.account ? ` (${r.account.name})` : ''}`,
        Budget: r.amount,
        Spent: r.spent,
        Remaining: r.remaining,
      })),
    [rows]
  );

  const pieData = useMemo(
    () =>
      rows.map((r, index) => ({
        name: r.category?.name ?? 'Category',
        value: r.spent,
        color: COLORS[index % COLORS.length],
      })).filter(item => item.value > 0),
    [rows]
  );

  // Summary stats
  const totalBudgeted = useMemo(() => rows.reduce((sum, r) => sum + r.amount, 0), [rows]);
  const totalSpent = useMemo(() => rows.reduce((sum, r) => sum + r.spent, 0), [rows]);
  const exceededCount = useMemo(() => rows.filter(r => r.pct >= 100).length, [rows]);
  const warningCount = useMemo(() => rows.filter(r => r.pct >= 80 && r.pct < 100).length, [rows]);

  return (
    <div className="space-y-4 px-3 sm:px-0">
      {/* Mobile-optimized header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">📊 Budgets & Goals</h2>
            <p className="text-sm text-gray-600">Track spending across categories</p>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                setEditing(null);
                setForm({ category_id: '', account_id: 'all', amount: '' });
                setShowForm(!showForm);
                setError(null);
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showForm ? '✕ Cancel' : '+ Add Budget'}
            </button>
          </div>
        </div>

        {/* Summary stats - Mobile first */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-xs font-medium text-blue-700">Total Budgeted</p>
            <p className="text-sm font-bold text-blue-900">₹{totalBudgeted.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3 text-center">
            <p className="text-xs font-medium text-orange-700">Total Spent</p>
            <p className="text-sm font-bold text-orange-900">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-xs font-medium text-red-700">Exceeded</p>
            <p className="text-sm font-bold text-red-900">{exceededCount} budgets</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center">
            <p className="text-xs font-medium text-yellow-700">Warning</p>
            <p className="text-sm font-bold text-yellow-900">{warningCount} budgets</p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Templates section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>🎯 Quick Templates</span>
          <span>{showTemplates ? '▼' : '▶'}</span>
        </button>
        
        {showTemplates && (
          <div className="space-y-2">
            {templates.map((template, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border bg-white p-3">
                <div>
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-xs text-gray-600">
                    {template.categories.length} categories • ₹{template.categories.reduce((sum, c) => sum + c.amount, 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls - Mobile optimized */}
      <div className="flex flex-wrap gap-2 rounded-lg bg-gray-50 p-3">
        {/* View mode toggle */}
        <div className="flex rounded-lg border bg-white">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${
              viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-700'
            }`}
          >
            🔲 Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-r-lg ${
              viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-700'
            }`}
          >
            📋 List
          </button>
        </div>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'usage' | 'amount' | 'name')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="usage">Sort: Usage %</option>
          <option value="amount">Sort: Amount</option>
          <option value="name">Sort: Name</option>
        </select>

        {/* Filter dropdown */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'exceeded' | 'safe')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All ({rows.length})</option>
          <option value="exceeded">Exceeded ({exceededCount})</option>
          <option value="safe">Safe ({rows.filter(r => r.pct < 80).length})</option>
        </select>

        {/* Chart toggles */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowChart(showChart === 'bar' ? null : 'bar')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              showChart === 'bar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            📊 Bar
          </button>
          <button
            onClick={() => setShowChart(showChart === 'pie' ? null : 'pie')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              showChart === 'pie' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            🥧 Pie
          </button>
        </div>
      </div>

      {/* Form - Mobile optimized */}
      {showForm && (
        <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span>✏️</span>
            <span>{editing ? 'Edit Budget' : 'New Budget'}</span>
          </div>
          
          <form onSubmit={saveBudget} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
                disabled={saving}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ?? '🏷️'} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <select
                  value={form.account_id}
                  onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={saving}
                >
                  <option value="all">🏦 All accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {editing ? 'Updating...' : 'Saving...'}
                  </span>
                ) : (
                  <span>💾 {editing ? 'Update Budget' : 'Save Budget'}</span>
                )}
              </button>
              
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ category_id: '', account_id: 'all', amount: '' });
                    setShowForm(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Chart display */}
      {showChart && rows.length > 0 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {showChart === 'bar' ? '📊 Budget vs Spent' : '🥧 Spending Distribution'}
            </h3>
            <button
              onClick={() => setShowChart(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              {showChart === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    fontSize={12}
                    tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} 
                  />
                  <Tooltip
                    formatter={(v: number | string, key: string) => [
                      `₹${Number(v).toLocaleString('en-IN')}`,
                      key,
                    ]}
                  />
                  <Bar dataKey="Budget" fill="#60a5fa" />
                  <Bar dataKey="Spent" fill="#f59e0b" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={12}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Spent']} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Budget list - Mobile optimized */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-gray-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-gray-600 font-medium">No budgets for {new Date(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          <p className="text-gray-500 text-sm mt-1">Create your first budget to start tracking!</p>
        </div>
      ) : (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-3'
          }
        `}>
          {rows.map((b) => (
            <div key={b.id} className={`
              rounded-lg border bg-white shadow-sm transition-all hover:shadow-md
              ${viewMode === 'list' ? 'p-3' : 'p-4'}
            `}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.category?.icon ?? '🏷️'}</span>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {b.category?.name}
                      </h3>
                      {b.pct >= 100 && <span className="text-red-500">⚠️</span>}
                    </div>
                    {b.account && (
                      <p className="text-xs text-gray-500 mt-1">📊 {b.account.name}</p>
                    )}
                    <p className="text-lg font-bold text-gray-900">
                      ₹{b.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(b)}
                      className="rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="Edit budget"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Delete budget"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Spent: ₹{b.spent.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        b.pct >= 100 ? 'text-red-600' : 
                        b.pct >= 80 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {b.pct.toFixed(0)}%
                      </span>
                      {b.pct >= 100 ? '🔴' : b.pct >= 80 ? '🟡' : '🟢'}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.pct >= 100 ? 'bg-red-500' : 
                        b.pct >= 80 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, b.pct)}%` }}
                    />
                    {/* Overflow indicator */}
                    {b.pct > 100 && (
                      <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Remaining: ₹{b.remaining.toLocaleString('en-IN')}</span>
                    {b.pct > 100 && (
                      <span className="text-red-600 font-medium">
                        Over by: ₹{(b.spent - b.amount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for mobile */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 sm:hidden">
                  <button
                    onClick={() => startEdit(b)}
                    className="flex-1 rounded-lg bg-indigo-50 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="flex-1 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly insights */}
      {rows.length > 0 && (
        <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📈 Monthly Insights</h3>
          <div className="space-y-2 text-sm">
            {totalSpent > totalBudgeted && (
              <div className="flex items-center gap-2 text-red-700">
                <span>⚠️</span>
                <span>You&apos;re over budget by ₹{(totalSpent - totalBudgeted).toLocaleString('en-IN')} this month</span>
              </div>
            )}
            {exceededCount > 0 && (
              <div className="flex items-center gap-2 text-red-700">
                <span>🚨</span>
                <span>{exceededCount} budget{exceededCount > 1 ? 's' : ''} exceeded</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2 text-yellow-700">
                <span>⚡</span>
                <span>{warningCount} budget{warningCount > 1 ? 's' : ''} near limit (80%+)</span>
              </div>
            )}
            {totalSpent <= totalBudgeted && exceededCount === 0 && (
              <div className="flex items-center gap-2 text-green-700">
                <span>✅</span>
                <span>Great job! You&apos;re within budget this month</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-blue-700">
              <span>💡</span>
              <span>
                {totalBudgeted > 0 
                  ? `Overall usage: ${((totalSpent / totalBudgeted) * 100).toFixed(1)}%`
                  : 'Set up budgets to track your spending'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
