import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ExplanationImage from '../components/ExplanationImage';
import StatBadge from '../components/StatBadge';
import { dashboardApi, marketApi, resolveArtifactUrl } from '../services/api';

export default function Explainability() {
  const [symbol, setSymbol] = useState('AAPL');
  const [stocks, setStocks] = useState([]);
  const [sampleIndex, setSampleIndex] = useState(-1);
  const [shapData, setShapData] = useState(null);
  const [limeData, setLimeData] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stocks()
      .then(({ data }) => {
        const nextStocks = data.stocks ?? [];
        setStocks(nextStocks);
        setSymbol(nextStocks[0]?.symbol ?? 'AAPL');
      })
      .catch((requestError) => setError(requestError?.response?.data?.detail ?? 'Unable to load the stock list.'));
  }, []);

  const runShap = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await marketApi.shap({ symbol, sample_index: sampleIndex, sample_size: 160, max_display: 12 });
      setShapData(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to generate SHAP explanation.');
    } finally {
      setLoading(false);
    }
  };

  const runLime = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await marketApi.lime({ symbol, sample_index: sampleIndex, num_features: 10 });
      setLimeData(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to generate LIME explanation.');
    } finally {
      setLoading(false);
    }
  };

  const runCombined = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await marketApi.explain({
        symbol,
        sample_index: sampleIndex,
        explanation_type: 'both',
        sample_size: 160,
        max_display: 12,
        num_features: 10,
      });
      setCombinedData(response.data);
      setShapData(response.data.shap ?? null);
      setLimeData(response.data.lime ?? null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to generate combined explanation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Explainability</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">Inspect SHAP and LIME outputs.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Generate transparent global and local explanations for the best trained model, and save each visualization automatically.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.4fr_0.4fr_auto_auto_auto]">
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
            {stocks.map((stock) => <option key={stock.symbol} value={stock.symbol}>{stock.company_name} ({stock.symbol})</option>)}
          </select>
          <input type="number" value={sampleIndex} onChange={(event) => setSampleIndex(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 lg:flex lg:items-center">Use -1 for the latest row</div>
          <button disabled={loading} onClick={runShap} type="button" className="rounded-2xl bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">GET SHAP</button>
          <button disabled={loading} onClick={runLime} type="button" className="rounded-2xl bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">GET LIME</button>
          <button disabled={loading} onClick={runCombined} type="button" className="rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">POST Explain</button>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatBadge label="Combined" value={combinedData?.explanation_type ?? 'Idle'} tone="teal" />
          <StatBadge label="History" value={combinedData?.history_id ? `#${combinedData.history_id}` : 'Not saved'} tone="emerald" />
          <StatBadge label="Artifacts" value={combinedData?.shap?.output_directory ?? 'Ready'} tone="slate" />
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ExplanationImage title="SHAP Summary Plot" src={resolveArtifactUrl(shapData?.plot_paths?.summary_plot)} description="Global feature contribution overview." />
        <ExplanationImage title="SHAP Bar Plot" src={resolveArtifactUrl(shapData?.plot_paths?.bar_plot)} description="Mean absolute SHAP values." />
        <ExplanationImage title="SHAP Waterfall" src={resolveArtifactUrl(shapData?.plot_paths?.waterfall_plot)} description="Local decision trace for one sample." />
        <ExplanationImage title="LIME Contribution Graph" src={resolveArtifactUrl(limeData?.plot_paths?.contribution_graph)} description="Positive and negative local feature weights." />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-[32px] p-7">
          <h2 className="font-display text-2xl font-semibold text-white">Positive features</h2>
          <div className="mt-5 space-y-3">
            {(limeData?.positive_features ?? []).map((item) => (
              <div key={item.feature} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {item.feature} <span className="text-emerald-200/80">{Number(item.weight).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-[32px] p-7">
          <h2 className="font-display text-2xl font-semibold text-white">Negative features</h2>
          <div className="mt-5 space-y-3">
            {(limeData?.negative_features ?? []).map((item) => (
              <div key={item.feature} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {item.feature} <span className="text-rose-200/80">{Number(item.weight).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
