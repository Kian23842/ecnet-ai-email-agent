import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Loader2, Shield } from 'lucide-react';
import { login } from '../api/client';
import { User } from '../types';

interface Props {
  onSuccess: (token: string, user: User) => void;
}

export default function Login({ onSuccess }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      const { token, user } = res.data.data;
      onSuccess(token, user);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden font-sans relative flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] left-[10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/50 to-black" />
      </div>

      <nav className="absolute top-0 w-full p-10 flex items-center gap-3 z-20">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-black text-xl tracking-tighter uppercase italic">ECNET</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] -mt-1">AI Email Agent v2</p>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 space-y-6 shadow-2xl"
        >
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tight uppercase">Secure Gateway</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Enter your credentials</p>
          </div>

          {error && (
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <input
              id="login-email"
              type="email" required placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:ring-blue-600 outline-none"
            />
            <input
              id="login-password"
              type="password" required placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:ring-blue-600 outline-none"
            />
          </div>

          <button
            id="login-submit"
            type="submit" disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-blue-600/40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Authenticate
          </button>
        </motion.form>
      </div>
    </div>
  );
}
