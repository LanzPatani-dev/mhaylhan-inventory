'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);

      // Determine role from user profile
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // Update last_login
        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        const role = profile?.role || user.user_metadata?.role || 'staff';
        toast.success(`Welcome back! Redirecting to ${role} dashboard...`);

        setTimeout(() => {
          router.push(role === 'admin' ? '/admin-dashboard' : '/staff-dashboard');
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      setError('root', {
        message: err?.message || 'Invalid credentials. Please check your email and password.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-primary flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/20 rounded-xl p-2">
              <AppLogo size={36} />
            </div>
            <div>
              <p className="font-800 text-white text-xl leading-none">MhayLhan</p>
              <p className="text-white/70 text-sm">Inventory System</p>
            </div>
          </div>

          <h1 className="text-3xl font-800 text-white leading-tight mb-4">
            Warehouse Inventory<br />Management
          </h1>
          <p className="text-white/80 text-base leading-relaxed mb-10">
            Track stock levels, monitor expiring products, and manage your sari-sari store inventory with ease.
          </p>

          <div className="space-y-4">
            {[
              { icon: '📦', label: 'Real-time stock tracking' },
              { icon: '🔍', label: 'Barcode scanning support' },
              { icon: '⚠️', label: 'Low-stock & expiry alerts' },
              { icon: '📊', label: 'Complete transaction history' },
            ].map((f) => (
              <div key={`feature-${f.label}`} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-white/90 text-sm font-500">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-xs">
            © 2026 Mhay-Lhan Sari-Sari Store. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <AppLogo size={36} />
            <div>
              <p className="font-800 text-foreground text-lg leading-none">MhayLhan</p>
              <p className="text-muted-foreground text-xs">Inventory System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-700 text-foreground mb-1">Sign in to your account</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to access the inventory system.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {errors.root && (
              <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg slide-up">
                <svg className="w-4 h-4 text-danger mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-danger">{errors.root.message}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-600 text-foreground mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@mhaylhan.ph"
                suppressHydrationWarning
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-ring/30 bg-card ${
                  errors.email ? 'border-danger focus:border-danger' : 'border-input focus:border-primary'
                }`}
                {...register('email', {
                  required: 'Email address is required.',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
                })}
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-600 text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  suppressHydrationWarning
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-ring/30 bg-card ${
                    errors.password ? 'border-danger focus:border-danger' : 'border-input focus:border-primary'
                  }`}
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: { value: 6, message: 'Password must be at least 6 characters.' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  suppressHydrationWarning
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                suppressHydrationWarning
                className="w-4 h-4 rounded border-input accent-primary"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-600 text-sm transition-all duration-150 hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              suppressHydrationWarning
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}