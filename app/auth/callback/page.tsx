'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const code = sp.get('code');
    if (!code) {
      // No code in URL? Go home (or show an error UI)
      router.replace('/');
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('Auth exchange error:', error.message);
      router.replace('/');
    })();
  }, [router, sp]);

  return <p className="p-6 text-gray-600">Signing you in…</p>;
}