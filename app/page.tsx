'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import Tasks from '@/components/Tasks';

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!loggedIn) {
    return (
      <main className="max-w-xl mx-auto mt-16 p-4 text-center">
        <h1 className="text-3xl font-bold mb-2">Tasky</h1>
        <p className="text-gray-600 mb-6">Sign in to manage your tasks across devices.</p>
        <Link href="/login" className="inline-block rounded bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main>
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-2xl font-semibold">Tasky</h1>
        <button onClick={signOut} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200">
          Sign out
        </button>
      </header>
      <Tasks />
    </main>
  );
}