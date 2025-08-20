'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Task = { id: string; title: string; done: boolean; inserted_at: string; user_id: string };

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('inserted_at', { ascending: false });
    if (!error) setTasks((data as Task[]) || []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    await supabase.from('tasks').insert({ title: title.trim(), user_id: userId });
    setTitle('');
  }

  async function toggle(id: string, done: boolean) {
    await supabase.from('tasks').update({ done: !done }).eq('id', id);
  }

  async function remove(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();

    const channel = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      load();
    });

    return () => {
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4">
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded border px-3 py-2 outline-none focus:ring focus:ring-indigo-200"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          placeholder="Add a task"
        />
        <button className="rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">Add</button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">No tasks yet. Add your first one!</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center gap-3 rounded border p-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={()=>toggle(t.id, t.done)}
                className="h-5 w-5"
              />
              <span className={`flex-1 ${t.done ? 'line-through text-gray-400' : ''}`}>
                {t.title}
              </span>
              <button
                onClick={()=>remove(t.id)}
                className="text-sm text-red-600 hover:text-red-700"
                aria-label="delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}