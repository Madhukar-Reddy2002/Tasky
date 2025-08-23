'use client';

import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// Types
type TxType = 'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received';
type TabKey = 'transactions' | 'history' | 'summary' | 'insights';

type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  type: TxType;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  category?: { name: string; icon?: string | null };
  account?: { name: string };
  to_account?: { name: string };
};

type Account = { id: string; name: string; balance: number };
type Category = { id: string; name: string; icon?: string | null };

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

type NewTxState = {
  type: TxType;
  amount: string; // keep as string for input binding
  description: string;
  date: string;
  account_id: string;
  to_account_id: string;
  category_id: string;
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

// FIXED: Component with proper props typing
interface AddTransactionFormProps {
  newTx: NewTxState;
  setNewTx: React.Dispatch<React.SetStateAction<NewTxState>>;
  setShowAddForm: React.Dispatch<React.SetStateAction<boolean>>;
  addTransaction: (e: FormEvent) => Promise<void>;
  accounts: Account[];
  categories: Category[];
}

const AddTransactionForm = ({
  newTx,
  setNewTx,
  setShowAddForm,
  addTransaction,
  accounts,
  categories
}: AddTransactionFormProps) => {
  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('#transaction-amount');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <form
        onSubmit={addTransaction}
        className="bg-white rounded-t-lg sm:rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slideUp"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h3 className="text-lg font-semibold">Add Transaction</h3>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={newTx.type}
              onChange={(e) => setNewTx({ ...newTx, type: e.target.value as TxType })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="expense">💸 Expense</option>
              <option value="income">💰 Income</option>
              <option value="transfer">↔️ Transfer</option>
              <option value="loan_given">📤 Loan Given</option>
              <option value="loan_received">📥 Loan Received</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              id="transaction-amount"
              type="number"
              placeholder="0.00"
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              step="0.01"
              required
              inputMode="decimal"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              placeholder="Enter description"
              value={newTx.description}
              onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {newTx.type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              value={newTx.account_id}
              onChange={(e) => setNewTx({ ...newTx, account_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (₹{acc.balance.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* To Account (only for transfer) */}
          {newTx.type === 'transfer' && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700 mb-2">To Account</label>
              <select
                value={newTx.to_account_id}
                onChange={(e) => setNewTx({ ...newTx, to_account_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select account</option>
                {accounts
                  .filter((acc) => acc.id !== newTx.account_id)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category (only for expense) */}
          {newTx.type === 'expense' && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={newTx.category_id}
                onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ?? '🏷️'} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTx.amount || !newTx.description || !newTx.account_id}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add Transaction
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ✅ Next part will include QuickAddButtons, notification system, and TransactionManager setup
// Quick Add Button Component for frequently used transactions
interface QuickAction {
  type: TxType;
  category: string;
  icon: string;
  amount: number;
}
const QuickAddButtons = ({ onQuickAdd }: { onQuickAdd: (qa: QuickAction) => void }) => {
  const quickActions: QuickAction[] = [
    { type: 'expense', category: 'Food', icon: '🍕', amount: 500 },
    { type: 'expense', category: 'Transport', icon: '🚗', amount: 200 },
    { type: 'expense', category: 'Shopping', icon: '🛒', amount: 1000 },
    { type: 'income', category: 'Salary', icon: '💰', amount: 50000 },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {quickActions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onQuickAdd(action)}
          className="flex-shrink-0 bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors min-w-[100px]"
          type="button"
        >
          <div className="text-center">
            <div className="text-2xl mb-1">{action.icon}</div>
            <div className="text-xs font-medium text-gray-700">{action.category}</div>
            <div className="text-xs text-gray-500">₹{action.amount}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// Enhanced notification system
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof document === 'undefined') return;
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <span>${type === 'success' ? '✅' : '❌'}</span>
      <span>${message}</span>
    </div>
  `;
  notification.style.transform = 'translateX(100%)';
  document.body.appendChild(notification);
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
  });
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 300);
  }, 3000);
};

export default function TransactionManager() {
  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showBalances, setShowBalances] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | TxType>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // History tab
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<string>('');

  // Summary tab
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Form state
  const [newTx, setNewTx] = useState<NewTxState>(() => ({
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    to_account_id: '',
    category_id: '',
  }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch transactions with related names
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select(
          `*,
           category:categories(name, icon),
           account:accounts!transactions_account_id_fkey(name),
           to_account:accounts!transactions_to_account_id_fkey(name)`
        )
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txErr) throw txErr;
      setTransactions((txData as Transaction[]) ?? []);

      // Fetch accounts
      const { data: accData, error: accErr } = await supabase
        .from('accounts')
        .select('id, name, balance')
        .order('name');

      if (accErr) throw accErr;

      const accs = (accData as Account[]) ?? [];
      setAccounts(accs);

      // Fetch categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('id, name, icon')
        .order('name');

      if (catErr) throw catErr;

      setCategories((catData as Category[]) ?? []);

      // Set sensible defaults (only if not set yet)
      if (accs.length) {
        setNewTx((p) => (!p.account_id ? { ...p, account_id: accs[0].id } : p));
        setSelectedHistoryAccount((prev) => (prev ? prev : accs[0].id));
      }
    } catch (error: unknown) {
      showNotification('Error loading data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Enhanced filtered transactions with search and sorting
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (selectedAccount !== 'all') {
      list = list.filter((t) => t.account_id === selectedAccount || t.to_account_id === selectedAccount);
    }
    if (selectedCategoryId !== 'all') {
      list = list.filter((t) => t.category_id === selectedCategoryId);
    }
    if (selectedType !== 'all') {
      list = list.filter((t) => t.type === selectedType);
    }
    if (dateRange.start) {
      list = list.filter((t) => t.date >= dateRange.start);
    }
    if (dateRange.end) {
      list = list.filter((t) => t.date <= dateRange.end);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          (t.category?.name ?? '').toLowerCase().includes(query) ||
          (t.account?.name ?? '').toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'date') {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      }
      const diff = a.amount - b.amount;
      return sortOrder === 'asc' ? diff : -diff;
    });

    return list;
  }, [
    transactions,
    selectedAccount,
    selectedCategoryId,
    selectedType,
    searchQuery,
    sortBy,
    sortOrder,
    dateRange.start,
    dateRange.end,
  ]);

  // History calculations
  const historyRows = useMemo(() => {
    if (!selectedHistoryAccount) return [];

    const acc = accounts.find((a) => a.id === selectedHistoryAccount);
    if (!acc) return [];

    const txAsc = transactions
      .filter((t) => t.account_id === selectedHistoryAccount || t.to_account_id === selectedHistoryAccount)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

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
    return out.reverse();
  }, [transactions, selectedHistoryAccount, accounts]);

  // Monthly summary (exclude transfers from totals to avoid double counting)
  const monthly = useMemo(() => {
    const month = selectedMonth;
    const monthTx = transactions.filter((t) => t.date.startsWith(month));

    const categorySpending: Record<string, number> = monthTx
      .filter((t) => t.type === 'expense' && t.category?.name)
      .reduce((acc, t) => {
        const key = t.category!.name;
        acc[key] = (acc[key] ?? 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const totalIncome = monthTx
      .filter((t) => t.type === 'income' || t.type === 'loan_received')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = monthTx
      .filter((t) => t.type === 'expense' || t.type === 'loan_given')
      .reduce((s, t) => s + t.amount, 0);

    const net = totalIncome - totalExpenses;

    const accountBreakdown = accounts.map((acc) => {
      const related = monthTx.filter((t) => t.account_id === acc.id || t.to_account_id === acc.id);
      const income =
        related
          .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'loan_received'))
          .reduce((s, t) => s + t.amount, 0) +
        related.filter((t) => t.type === 'transfer' && t.to_account_id === acc.id).reduce((s, t) => s + t.amount, 0);

      const expenses = related
        .filter((t) => t.account_id === acc.id && (t.type === 'expense' || t.type === 'loan_given' || t.type === 'transfer'))
        .reduce((s, t) => s + t.amount, 0);

      return { name: acc.name, income, expenses };
    });

    const pieData = Object.entries(categorySpending).map(([name, value]) => ({ name, value }));

    // Daily spending trend (expenses only)
    const dailySpending = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        const day = t.date;
        acc[day] = (acc[day] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const dailyTrend = Object.entries(dailySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    return {
      categorySpending,
      accountBreakdown,
      pieData,
      totalIncome,
      totalExpenses,
      net,
      dailyTrend,
      transactionCount: monthTx.length,
    };
  }, [transactions, accounts, selectedMonth]);

  // Insights
  const insights = useMemo(() => {
    const now = new Date();
    const last30Start = new Date(now);
    last30Start.setDate(now.getDate() - 30);

    const prev30Start = new Date(now);
    prev30Start.setDate(now.getDate() - 60);

    const last30Days = transactions.filter((t) => new Date(t.date) >= last30Start);
    const prev30Days = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= prev30Start && d < last30Start;
    });

    const currentSpending = last30Days.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevSpending = prev30Days.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const spendingChange = prevSpending > 0 ? ((currentSpending - prevSpending) / prevSpending) * 100 : 0;

    const topCategoryEntry = Object.entries(
      last30Days
        .filter((t) => t.type === 'expense' && t.category?.name)
        .reduce((acc, t) => {
          const key = t.category!.name;
          acc[key] = (acc[key] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>)
    ).sort(([, a], [, b]) => b - a)[0];

    const topCategory = topCategoryEntry ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] } : null;
    const avgDailySpending = currentSpending / 30;
    const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return {
      currentSpending,
      spendingChange,
      topCategory,
      avgDailySpending,
      totalNetWorth,
      last30DaysCount: last30Days.length,
    };
  }, [transactions, accounts]);

  // Actions
  async function addTransaction(e: FormEvent) {
    e.preventDefault();
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData?.user?.id;
      if (!uid) {
        showNotification('Please log in to add transactions', 'error');
        return;
      }

      const payload: InsertTx = {
        user_id: uid,
        type: newTx.type,
        amount: parseFloat(newTx.amount || '0'),
        description: newTx.description.trim(),
        date: newTx.date,
        account_id: newTx.account_id || null,
        to_account_id: newTx.type === 'transfer' ? newTx.to_account_id || null : null,
        category_id: newTx.type === 'expense' ? newTx.category_id || null : null,
      };

      if (!payload.amount || Number.isNaN(payload.amount) || payload.amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
      }

      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) throw error;

      // Reset form with smart defaults
      setNewTx((p) => ({
        ...p,
        amount: '',
        description: '',
        to_account_id: '',
        // Keep category for expense for quick repeat entries
        category_id: p.type === 'expense' ? p.category_id : '',
      }));

      setShowAddForm(false);
      await loadData();
      showNotification('Transaction added successfully! 🎉');
    } catch (error: unknown) {
      showNotification('Error adding transaction: ' + ('Unknown error'), 'error');
    }
  }

  async function deleteTransaction(id: string) {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      await loadData();
      showNotification('Transaction deleted successfully');
    } catch (error: unknown) {
      showNotification('Error deleting transaction: ' + ('Unknown error'), 'error');
    }
  }

  // Quick add
  function handleQuickAdd(action: QuickAction) {
    const account = accounts[0]; // default to first account
    if (!account) {
      showNotification('Please add an account first', 'error');
      return;
    }
    const matchedCategory =
      categories.find((c) => c.name.toLowerCase() === action.category.toLowerCase())?.id || '';

    setNewTx({
      type: action.type,
      amount: action.amount.toString(),
      description: action.category,
      date: new Date().toISOString().split('T')[0],
      account_id: account.id,
      to_account_id: '',
      category_id: matchedCategory,
    });
    setShowAddForm(true);
  }

  function clearFilters() {
    setSelectedAccount('all');
    setSelectedCategoryId('all');
    setSelectedType('all');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
  }

  // CSV export
  function exportTransactions() {
    const rows = [
      ['Date', 'Description', 'Category', 'Account', 'To Account', 'Type', 'Amount', 'Balance Impact'],
      ...filteredTransactions.map((t) => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category?.name || '',
        t.account?.name || '',
        t.to_account?.name || '',
        t.type,
        String(t.amount),
        t.type === 'expense' || t.type === 'loan_given' ? String(-t.amount) : String(t.amount),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Transactions exported successfully! 📊');
  }

  // Transaction Card
  const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
    const isPositive =
      transaction.type === 'income' ||
      transaction.type === 'loan_received' ||
      (transaction.type === 'transfer' && transaction.to_account_id === selectedAccount);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">
              {transaction.category?.icon ??
                (transaction.type === 'transfer'
                  ? '↔️'
                  : transaction.type === 'income'
                  ? '💰'
                  : transaction.type === 'loan_given'
                  ? '📤'
                  : transaction.type === 'loan_received'
                  ? '📥'
                  : '💸')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500">
                <span className="truncate">{transaction.category?.name || transaction.type.replace('_', ' ')}</span>
                <span className="hidden sm:inline">•</span>
                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{transaction.account?.name}</span>
                {transaction.to_account && (
                  <>
                    <span>→ {transaction.to_account.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : '-'}₹{Number(transaction.amount).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              onClick={() => deleteTransaction(transaction.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              type="button"
              aria-label="Delete transaction"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter Panel
  const FilterPanel = () => {
    const presetRanges = [
      { label: 'Today', days: 0 },
      { label: 'Week', days: 7 },
      { label: 'Month', days: 30 },
      { label: 'Quarter', days: 90 },
    ] as const;

    const applyPresetRange = (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);

      setDateRange({
        start: days === 0 ? end.toISOString().split('T')[0] : start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      });
    };

    return (
      <div className="bg-white border-t border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Filters</h3>
          <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-700" type="button">
            Clear All
          </button>
        </div>

        {/* Preset Date Ranges */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Ranges</label>
          <div className="flex gap-2 flex-wrap">
            {presetRanges.map((range) => (
              <button
                key={range.label}
                onClick={() => applyPresetRange(range.days)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
            <option value="loan_given">Loan Given</option>
            <option value="loan_received">Loan Received</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              placeholder="From date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              placeholder="To date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    );
  };

  // Renderers
  const renderTransactionsTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            {filteredTransactions.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`p-2.5 rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            type="button"
            title="Toggle filters"
          >
            🔍
          </button>

          <button
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            type="button"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          <button
            onClick={() => setSortBy((s) => (s === 'date' ? 'amount' : 'date'))}
            className="p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            type="button"
            title={`Sort by ${sortBy === 'date' ? 'Amount' : 'Date'}`}
          >
            {sortBy === 'date' ? '📅' : '💰'}
          </button>

          <button
            onClick={exportTransactions}
            className="p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            type="button"
            title="Export to CSV"
          >
            💾
          </button>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Quick Add</h3>
        <QuickAddButtons onQuickAdd={handleQuickAdd} />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && <FilterPanel />}

      {/* Quick Balance Cards */}
      {showBalances ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 truncate">{account.name}</h3>
                  <p className="text-2xl font-bold text-blue-700">₹{account.balance.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => setShowBalances(false)}
                  className="p-1 text-blue-400 hover:text-blue-600 lg:hidden"
                  type="button"
                  title="Hide balances"
                >
                  👁️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowBalances(true)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          type="button"
          title="Show balances"
        >
          👁️ Show Account Balances
        </button>
      )}

      {/* Transactions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-2 text-gray-500">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} />)
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedAccount !== 'all' || selectedCategoryId !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding your first transaction!'}
            </p>
            {(searchQuery || selectedAccount !== 'all' || selectedCategoryId !== 'all' || selectedType !== 'all') && (
              <button onClick={clearFilters} className="text-blue-600 hover:text-blue-700 font-medium" type="button">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => {
    const chartAsc = historyRows.slice().reverse();

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
          <select
            value={selectedHistoryAccount}
            onChange={(e) => setSelectedHistoryAccount(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {selectedHistoryAccount && chartAsc.length > 0 && (
          <>
            {/* Balance Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance History</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartAsc}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(val: unknown) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Balance']}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="balance_after" stroke="#4f46e5" strokeWidth={3} fill="url(#balanceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              {historyRows.slice(0, 10).map((t) => (
                <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">
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
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{t.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500">
                          <span>{t.category?.name || t.type.replace('_', ' ')}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                          {t.to_account && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>→ {t.to_account.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.change >= 0 ? '+' : '-'}₹{Math.abs(t.change).toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-gray-500">Balance: ₹{Number(t.balance_after).toLocaleString('en-IN')}</p>
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

  const renderSummaryTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Monthly Summary</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700 font-medium">Total Inflows</p>
              <p className="text-2xl font-bold text-emerald-800">₹{monthly.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <span className="text-emerald-600 text-2xl">📈</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-lg p-4 border border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-700 font-medium">Total Outflows</p>
              <p className="text-2xl font-bold text-rose-800">₹{monthly.totalExpenses.toLocaleString('en-IN')}</p>
            </div>
            <span className="text-rose-600 text-2xl">📉</span>
          </div>
        </div>

        <div
          className={`bg-gradient-to-br rounded-lg p-4 border ${
            monthly.net >= 0 ? 'from-blue-50 to-indigo-50 border-blue-100' : 'from-orange-50 to-red-50 border-orange-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${monthly.net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Change</p>
              <p className={`text-2xl font-bold ${monthly.net >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                ₹{monthly.net.toLocaleString('en-IN')}
              </p>
            </div>
            <span className={`text-2xl ${monthly.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {monthly.net >= 0 ? '📈' : '📉'}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-purple-800">{monthly.transactionCount}</p>
            </div>
            <span className="text-purple-600 text-2xl">📅</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending Pie */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          {monthly.pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthly.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthly.pieData.map((_entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No expenses in selected month</p>
            </div>
          )}
        </div>

        {/* Account Activity Bars */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.accountBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Spending Trend */}
      {monthly.dailyTrend.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: unknown) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spending']}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left font-medium text-gray-700">Category</th>
                <th className="pb-3 text-right font-medium text-gray-700">Amount</th>
                <th className="pb-3 text-right font-medium text-gray-700">Transactions</th>
                <th className="pb-3 text-right font-medium text-gray-700">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthly.categorySpending)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const txCount = transactions.filter(
                    (t) => t.category?.name === category && t.date.startsWith(selectedMonth) && t.type === 'expense'
                  ).length;

                  const percentage = monthly.totalExpenses > 0 ? (amount / monthly.totalExpenses) * 100 : 0;

                  return (
                    <tr key={category} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{category}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        ₹{Number(amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right text-gray-600">{txCount}</td>
                      <td className="py-3 text-right text-gray-600">{percentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Financial Insights</h2>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Total Net Worth</h3>
          <p className="text-3xl font-bold text-blue-900 mb-1">₹{insights.totalNetWorth.toLocaleString('en-IN')}</p>
          <p className="text-sm text-blue-600">Across all accounts</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-2">Avg Daily Spending</h3>
          <p className="text-3xl font-bold text-green-900 mb-1">
            ₹{Math.round(insights.avgDailySpending).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-green-600">Last 30 days</p>
        </div>

        <div
          className={`bg-gradient-to-br rounded-lg p-6 border ${
            insights.spendingChange >= 0 ? 'from-red-50 to-rose-50 border-red-100' : 'from-green-50 to-emerald-50 border-green-100'
          }`}
        >
          <h3 className={`text-sm font-medium mb-2 ${insights.spendingChange >= 0 ? 'text-red-700' : 'text-green-700'}`}>
            Spending Change
          </h3>
          <p className={`text-3xl font-bold mb-1 ${insights.spendingChange >= 0 ? 'text-red-900' : 'text-green-900'}`}>
            {insights.spendingChange >= 0 ? '+' : ''}
            {insights.spendingChange.toFixed(1)}%
          </p>
          <p className={`${insights.spendingChange >= 0 ? 'text-red-600' : 'text-green-600'} text-sm`}>vs previous month</p>
        </div>
      </div>

      {/* Top Category */}
      {insights.topCategory && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Category</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-gray-900">{insights.topCategory.name}</p>
              <p className="text-sm text-gray-600">Last 30 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">₹{insights.topCategory.amount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{insights.last30DaysCount}</p>
            <p className="text-sm text-gray-600">Transactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {
                transactions.filter(
                  (t) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && t.type === 'income'
                ).length
              }
            </p>
            <p className="text-sm text-gray-600">Income</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {
                transactions.filter(
                  (t) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && t.type === 'expense'
                ).length
              }
            </p>
            <p className="text-sm text-gray-600">Expenses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {
                transactions.filter(
                  (t) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && t.type === 'transfer'
                ).length
              }
            </p>
            <p className="text-sm text-gray-600">Transfers</p>
          </div>
        </div>
      </div>

      {/* Smart Tips */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">💡 Smart Tips</h3>
        <div className="space-y-3">
          {insights.spendingChange > 20 && (
            <div className="flex items-start gap-3">
              <span className="text-yellow-600">⚠️</span>
              <p className="text-yellow-800">
                Your spending increased by {insights.spendingChange.toFixed(1)}%. Consider reviewing your{' '}
                {insights.topCategory?.name.toLowerCase()} expenses.
              </p>
            </div>
          )}
          {insights.avgDailySpending > 2000 && (
            <div className="flex items-start gap-3">
              <span className="text-yellow-600">💰</span>
              <p className="text-yellow-800">
                Your daily average spending is ₹{Math.round(insights.avgDailySpending).toLocaleString('en-IN')}. Setting a
                daily budget could help you save more.
              </p>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="text-yellow-600">📊</span>
            <p className="text-yellow-800">Track your expenses regularly to identify patterns and opportunities to save.</p>
          </div>
          {insights.totalNetWorth > 100000 && (
            <div className="flex items-start gap-3">
              <span className="text-yellow-600">🎯</span>
              <p className="text-yellow-800">Great job building your net worth! Consider investing a portion for long-term growth.</p>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Goals</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="font-medium text-green-800">Emergency Fund</p>
              <p className="text-sm text-green-600">Target: 6 months of expenses</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-700">
                {Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round((insights.totalNetWorth / Math.max(1, insights.avgDailySpending * 30 * 6)) * 100)
                  )
                )}
                %
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-blue-800">Monthly Savings Rate</p>
              <p className="text-sm text-blue-600">Target: 20% of income</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-700">
                {monthly.totalIncome > 0
                  ? Math.round(((monthly.totalIncome - monthly.totalExpenses) / monthly.totalIncome) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">💰 Finance Manager</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
              title="Add Transaction"
              type="button"
            >
              ➕
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 overflow-x-auto">
            {([
              { key: 'transactions', label: 'Transactions', icon: '📝' },
              { key: 'history', label: 'History', icon: '📈' },
              { key: 'summary', label: 'Summary', icon: '📊' },
              { key: 'insights', label: 'Insights', icon: '💡' },
            ] as Array<{ key: TabKey; label: string; icon: string }>).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 transform scale-105'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                type="button"
                title={tab.label}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'insights' && renderInsightsTab()}
      </div>

      {/* Mobile Add Button */}
      <div className="fixed bottom-6 right-6 z-50 sm:hidden">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-all transform hover:scale-110 active:scale-95"
          type="button"
          title="Add Transaction"
        >
          <span className="text-xl">➕</span>
        </button>
      </div>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <AddTransactionForm
          newTx={newTx}
          setNewTx={setNewTx}
          setShowAddForm={setShowAddForm}
          addTransaction={addTransaction}
          accounts={accounts}
          categories={categories}
        />
      )}
    </div>
  );
}
