import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard';

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl shadow-black/40">
      <p className="font-semibold text-white">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <p key={`${entry.dataKey}-${entry.name ?? 'series'}-${index}`} className="flex items-center justify-between gap-6 text-slate-300">
            <span>{entry.name ?? entry.dataKey}</span>
            <span>{formatter ? formatter(entry.value) : Number(entry.value).toFixed(2)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function CandlestickChart({ data = [] }) {
  const highs = data.map((item) => item.high ?? 0);
  const lows = data.map((item) => item.low ?? 0);
  const min = Math.min(...lows, 0);
  const max = Math.max(...highs, 1);
  const range = Math.max(max - min, 1);

  return (
    <div className="h-80 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
        <span>Open, High, Low, Close</span>
        <span className="text-teal-300">Candles</span>
      </div>
      <div className="flex h-[calc(100%-2rem)] items-stretch gap-2">
        {data.map((item) => {
          const candleTop = ((max - Math.max(item.open, item.close)) / range) * 100;
          const candleBottom = ((max - Math.min(item.open, item.close)) / range) * 100;
          const wickTop = ((max - item.high) / range) * 100;
          const wickBottom = ((max - item.low) / range) * 100;
          const isBullish = item.close >= item.open;
          return (
            <div key={item.name} className="relative flex-1 rounded-b-xl">
              <div className="absolute inset-x-1/2 w-[2px] -translate-x-1/2 rounded-full bg-white/20" style={{ top: `${wickTop}%`, bottom: `${wickBottom}%` }} />
              <div
                className={`absolute inset-x-1 rounded-lg ${isBullish ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={{ top: `${candleTop}%`, bottom: `${candleBottom}%`, minHeight: '8px' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketCharts({ data = [] }) {
  const chartData = data.map((item, index) => ({ ...item, label: `S${index + 1}` }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Candlestick Chart" subtitle="Price structure, intraday range, and momentum footprint.">
        <CandlestickChart data={chartData} />
      </ChartCard>

      <ChartCard title="Volume Chart" subtitle="Trading volume across the selected time window.">
        <div className="h-80 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(value) => Number(value).toLocaleString()} />} />
              <Bar dataKey="volume" fill="#14b8a6" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="RSI Chart" subtitle="Overbought and oversold pressure zones.">
        <div className="h-80 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rsiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(value) => `${Number(value).toFixed(1)}`} />} />
              <Area type="monotone" dataKey="rsi" stroke="#38bdf8" strokeWidth={2.2} fill="url(#rsiFill)" />
              <ReferenceLine y={70} stroke="#f97316" strokeDasharray="6 6" />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="6 6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="MACD Chart" subtitle="Signal convergence and histogram direction.">
        <div className="h-80 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(value) => Number(value).toFixed(2)} />} />
              <Bar dataKey="histogram" fill="#f59e0b" radius={[10, 10, 0, 0]} opacity={0.55} />
              <Line type="monotone" dataKey="macd" stroke="#22c55e" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="signal" stroke="#38bdf8" strokeWidth={2.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
