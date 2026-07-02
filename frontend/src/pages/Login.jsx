import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login({ email, token: response.data.access_token, remember });
      const profileResponse = await authApi.me();
      login({ ...profileResponse.data, token: response.data.access_token, remember });
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-[32px] border border-white/10 bg-gradient-to-br from-teal-500/20 via-slate-950 to-slate-950 p-8 shadow-2xl shadow-black/30"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">XAI Stock Lens</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Login to your trading intelligence workspace.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Access dashboard analytics, prediction history, and explainable AI visualizations with JWT authentication.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Model</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">Best</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Stack</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">FastAPI</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">XAI</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">SHAP + LIME</p>
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={handleSubmit}
          className="glass-panel rounded-[32px] p-8 shadow-2xl shadow-black/25"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Welcome back</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Use your registered email and password to continue.</p>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
                placeholder="student@university.edu"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
                placeholder="Enter password"
                required
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-400 focus:ring-teal-400" />
              Remember login on this device
            </label>
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-medium text-teal-200 transition hover:text-teal-100">
              Create account
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
