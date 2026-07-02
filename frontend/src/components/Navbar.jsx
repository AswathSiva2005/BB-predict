import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 lg:hidden"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-400 to-emerald-500 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20">
              XA
            </span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-white">XAI Stock Lens</p>
              <p className="text-xs text-slate-400">FastAPI + React trading intelligence</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-sm text-teal-100 md:block"
          >
            JWT session active
          </motion.div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            {user?.full_name || user?.email || 'Guest'}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}