import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1540px] items-center justify-between gap-5 px-4 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onToggleSidebar} className="icon-button lg:hidden" aria-label="Toggle navigation">☰</button>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="brand-orb"><i /></span>
            <div><p className="font-display text-xl font-bold tracking-tight text-slate-800">XAI-Stock</p><p className="hidden text-[11px] font-medium text-slate-500 sm:block">Explainable market intelligence</p></div>
          </Link>
        </div>
        <div className="hidden max-w-2xl flex-1 items-center justify-end gap-3 md:flex">
          <div className="market-search"><span>⌕</span><span>Search stocks, signals, explanations</span><kbd>Ctrl K</kbd></div>
          <button className="icon-button" type="button" aria-label="Notifications">♢</button>
          <div className="user-avatar">{(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}</div>
          <button type="button" onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>
    </header>
  );
}
