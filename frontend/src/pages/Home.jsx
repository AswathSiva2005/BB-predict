import { motion } from 'framer-motion';
import FeatureCard from '../components/FeatureCard';

const features = [
  {
    title: 'Explainable predictions',
    description: 'Model outputs are designed to be accompanied by SHAP and LIME explanations for transparent decision-making.',
  },
  {
    title: 'Trend-oriented workflow',
    description: 'The pipeline is structured for stock trend classification, technical indicators, and future model comparison.',
  },
  {
    title: 'Research-ready architecture',
    description: 'Frontend, backend, and ML modules are separated to support experimentation, evaluation, and final deployment.',
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <span className="inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-100">
            IEEE Final Year Project Framework
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
            XAI-Stock: Explainable stock market trend prediction.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            A clean React and FastAPI foundation for research workflows, model comparison, and explainable AI outputs.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/dashboard" className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white transition hover:bg-brand-700">
              Open Dashboard
            </a>
            <a href="/login" className="rounded-full border border-white/15 px-6 py-3 font-medium text-white transition hover:bg-white/10">
              Authenticate
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/20 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-black/30"
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">Model Status</p>
              <p className="mt-2 text-2xl font-semibold text-white">Scaffold Ready</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Backend</p>
                <p className="mt-2 text-lg font-semibold text-white">FastAPI</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Frontend</p>
                <p className="mt-2 text-lg font-semibold text-white">React + Vite</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </section>
    </div>
  );
}
