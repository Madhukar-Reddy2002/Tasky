'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-600">Signing you in…</p>}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const code = sp.get('code');
    if (!code) {
      router.replace('/');
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('Auth exchange error:', error.message);
      router.replace('/');
    })();
  }, [router, sp]);

  // Nothing to render here; the fallback above shows while params are available
  return null;
}
