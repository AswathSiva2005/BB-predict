import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

const items = [
  { label: 'Explore', to: '/dashboard', icon: '⌂' },
  { label: 'Predict', to: '/prediction', icon: '↗' },
  { label: 'Charts', to: '/charts', icon: '⌁' },
  { label: 'Explainability', to: '/explainability', icon: '✦' },
  { label: 'History', to: '/history', icon: '◷' },
  { label: 'Profile', to: '/profile', icon: '○' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <button type="button" aria-label="Close navigation" className={`fixed inset-0 z-30 bg-slate-950/30 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <motion.aside initial={false} animate={{ x: open ? 0 : '-100%' }} className="fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-72 border-r border-slate-200 bg-white px-4 py-6 lg:sticky lg:top-[72px] lg:block lg:h-auto lg:w-auto lg:translate-x-0 lg:border-b lg:border-r-0 lg:px-0 lg:py-0">
        <div className="mx-auto space-y-2 lg:flex lg:h-[58px] lg:max-w-[1540px] lg:items-center lg:gap-8 lg:space-y-0 lg:px-10">
          {items.map((item, index) => (
            <motion.div key={item.to} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}>
              <NavLink to={item.to} onClick={onClose} className={({ isActive }) => `market-nav-link ${isActive ? 'active' : ''}`}><span className="lg:hidden">{item.icon}</span><span>{item.label}</span></NavLink>
            </motion.div>
          ))}
        </div>
      </motion.aside>
    </>
  );
}
