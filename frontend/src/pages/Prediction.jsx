import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ProbabilityBars from '../components/ProbabilityBars';
import StatBadge from '../components/StatBadge';
import { dashboardApi, marketApi } from '../services/api';
import { buildProbabilitySeries, formatCurrency, formatPercent } from '../lib/market';

export default function Prediction() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [stocks, setStocks] = useState([]);
  const [sampleIndex, setSampleIndex] = useState(-1);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stocks()
      .then(({ data }) => {
        const nextStocks = data.stocks ?? [];
        setStocks(nextStocks);
        setSymbol(nextStocks[0]?.symbol ?? 'RELIANCE');
      })
      .catch((requestError) => setError(requestError?.response?.data?.detail ?? 'Unable to load Indian stocks.'));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await marketApi.postPrediction({ symbol, sample_index: sampleIndex });
      setPrediction(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to generate prediction.');
    } finally {
      setLoading(false);
    }
  };

  const probabilityBars = buildProbabilitySeries(prediction?.probabilities);

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Prediction</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">Generate a model-backed stock signal.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Choose a tracked symbol and a dataset row. The best trained model evaluates that market snapshot and stores the result in your activity history.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.4fr_0.4fr_auto]">
          <select
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
          >
            {stocks.map((stock) => <option key={stock.symbol} value={stock.symbol}>{stock.company_name} ({stock.symbol})</option>)}
          </select>
          <input
            type="number"
            value={sampleIndex}
            onChange={(event) => setSampleIndex(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
          />
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 lg:flex lg:items-center">Use -1 for the latest row</div>
          <button type="submit" disabled={loading} className="rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? 'Predicting...' : 'Predict'}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
      </motion.div>

      {prediction ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-panel rounded-[32px] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Result</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">{prediction.predicted_label}</h2>
            <p className="mt-2 text-sm text-slate-400">Model: {prediction.model_name}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StatBadge label="Confidence" value={formatPercent(prediction.predicted_probability)} tone="emerald" />
              <StatBadge label="History ID" value={prediction.history_id ? String(prediction.history_id) : 'Not saved'} tone="teal" />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <p>Current price: <span className="text-white">{formatCurrency(prediction.context?.Close)}</span></p>
              <p className="mt-2">Sample index: <span className="text-white">{prediction.sample_index}</span></p>
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Class probabilities</p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">BUY / HOLD / SELL split</h3>
            <div className="mt-6">
              <ProbabilityBars items={probabilityBars} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatBadge label="Open" value={formatCurrency(prediction.context?.Open)} tone="slate" />
              <StatBadge label="High" value={formatCurrency(prediction.context?.High)} tone="slate" />
              <StatBadge label="Low" value={formatCurrency(prediction.context?.Low)} tone="slate" />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
