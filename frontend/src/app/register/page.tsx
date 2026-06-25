'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await register(email, password, fullName || undefined);
      toast.success('Account created');
      router.push('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not register');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-bg-surface border border-border-subtle rounded-lg p-6">
        <h1 className="font-display text-4xl tracking-wider">CREATE ACCOUNT</h1>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name (optional)"
          className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          autoComplete="name"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          autoComplete="email"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          className="w-full bg-bg-base border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-hover text-white rounded-md py-2 disabled:opacity-50"
        >
          {isLoading ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-sm text-text-secondary text-center">
          Have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
