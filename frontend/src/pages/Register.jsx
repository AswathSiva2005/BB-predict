import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerAndLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerAndLogin({ full_name: fullName, email, password, remember });
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass-panel rounded-[32px] p-8 shadow-2xl shadow-black/25"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Create account</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">Register</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Create a secure workspace to run predictions and explanations.</p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
                placeholder="Your name"
                required
              />
            </label>
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
                placeholder="Minimum 8 characters"
                required
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-400 focus:ring-teal-400" />
              Keep me signed in
            </label>
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-teal-200 transition hover:text-teal-100">
              Sign in
            </Link>
          </p>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-500/15 via-slate-950 to-slate-950 p-8 shadow-2xl shadow-black/30"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Why register</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['Prediction history', 'Store every result with its explanation payload.'],
              ['Training history', 'Track the best model version and training status.'],
              ['SHAP and LIME', 'Generate local and global explanation artifacts.'],
              ['Responsive UI', 'Access the platform on desktop and mobile.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl bg-white/5 p-5">
                <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}