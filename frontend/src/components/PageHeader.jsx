import { motion } from 'framer-motion';

export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel relative overflow-hidden rounded-[28px] px-6 py-7 sm:px-8">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="page-kicker">{eyebrow}</p><h1 className="page-title">{title}</h1><p className="page-copy">{description}</p></div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </motion.section>
  );
}
