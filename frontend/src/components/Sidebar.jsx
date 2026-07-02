import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

const items = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Prediction', to: '/prediction' },
  { label: 'Charts', to: '/charts' },
  { label: 'Explainability', to: '/explainability' },
  { label: 'History', to: '/history' },
  { label: 'Profile', to: '/profile' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div className={`fixed inset-0 z-20 bg-slate-950/70 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-[73px] z-30 h-[calc(100vh-73px)] w-72 border-r border-white/8 bg-slate-950/95 px-4 py-6 backdrop-blur-xl lg:static lg:block lg:h-[calc(100vh-73px)] lg:translate-x-0"
      >
        <div className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Navigation</p>
          {items.map((item, index) => (
            <motion.div key={item.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
              <NavLink
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition',
                    isActive ? 'bg-white/10 text-white ring-1 ring-teal-400/20' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-500">→</span>
              </NavLink>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-teal-500/15 bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-transparent p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">System</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            SHAP, LIME, prediction history, and training records are wired into the new backend API.
          </p>
        </div>
      </motion.aside>
    </>
  );
}