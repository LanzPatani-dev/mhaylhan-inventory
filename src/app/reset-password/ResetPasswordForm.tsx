'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAuthSession, setHasAuthSession] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const hasRecoveryToken = searchParams.get('type') === 'recovery' || searchParams.has('code') || hasAuthSession;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasAuthSession(Boolean(data.session));
    });
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasRecoveryToken) {
      toast.error('This password setup link is invalid or expired. Request a new link.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must have at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password created successfully. Please sign in.');
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-7">
          <AppLogo size={40} />
          <div>
            <p className="font-bold text-foreground">MhayLhan</p>
            <p className="text-xs text-muted-foreground">Inventory System</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Create your password</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Set a password of at least 8 characters to activate your staff account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-semibold text-foreground mb-1.5">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-foreground mb-1.5">Confirm password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <button type="submit" disabled={loading || !hasRecoveryToken} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-green-700 disabled:opacity-60">
            {loading ? 'Saving password…' : 'Save password'}
          </button>
          {!hasRecoveryToken && <p className="text-xs text-danger text-center">This setup link is invalid or expired. Return to sign in and request a new password link.</p>}
        </form>
      </section>
    </main>
  );
}
