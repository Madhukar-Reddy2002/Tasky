'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto mt-12 p-4">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <Auth
        supabaseClient={supabase}
        view="magic_link"
        appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#4f46e5' } } } }}
        providers={[]}
        showLinks={false}
        redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`}
      />
    </main>
  );
}