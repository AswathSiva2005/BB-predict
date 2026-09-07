import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard';
import { marketApi } from '../services/api';

const PERIODS = ['1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];
const PRICE_AXIS_WIDTH = 56;
const TIME_AXIS_HEIGHT = 24;

function formatDateTick(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatDateLabel(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function withMacdSignal(candles) {
  const smoothing = 2 / (9 + 1);
  let emaPrev = null;

  return candles.map((item) => {
    if (item.macd === null || item.macd === undefined) {
      return { ...item, signal: null, histogram: null };
    }
    emaPrev = emaPrev === null ? item.macd : item.macd * smoothing + emaPrev * (1 - smoothing);
    return { ...item, signal: emaPrev, histogram: item.macd - emaPrev };
  });
}

function useCandles(symbol, period) {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbol) {
      setCandles([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    marketApi
      .candles(symbol, period)
      .then((response) => {
        if (active) {
          setCandles(response.data.candles ?? []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setCandles([]);
          setError(requestError?.response?.data?.detail ?? 'Unable to load price history.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [symbol, period]);

  return { candles, loading, error };
}

function PeriodSelector({ period, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PERIODS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            option === period ? 'bg-teal-400/20 text-teal-200' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm shadow-2xl shadow-black/40" style={{ color: '#e2e8f0' }}>
      <p className="font-semibold" style={{ color: '#ffffff' }}>{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <p key={`${entry.dataKey}-${entry.name ?? 'series'}-${index}`} className="flex items-center justify-between gap-6" style={{ color: '#cbd5e1' }}>
            <span>{entry.name ?? entry.dataKey}</span>
            <span>{formatter ? formatter(entry.value) : Number(entry.value).toFixed(2)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function CandleTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const isBullish = point.close >= point.open;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm shadow-2xl shadow-black/40" style={{ color: '#e2e8f0' }}>
      <p className="font-semibold" style={{ color: '#ffffff' }}>{formatDateLabel(point.date)}</p>
      <div className={`mt-2 grid grid-cols-2 gap-x-6 gap-y-1 ${isBullish ? 'text-emerald-300' : 'text-rose-300'}`}>
        <span>O <span style={{ color: '#ffffff' }}>{point.open.toFixed(2)}</span></span>
        <span>H <span style={{ color: '#ffffff' }}>{point.high.toFixed(2)}</span></span>
        <span>L <span style={{ color: '#ffffff' }}>{point.low.toFixed(2)}</span></span>
        <span>C <span style={{ color: '#ffffff' }}>{point.close.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function CandleShape(props) {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  const isBullish = close >= open;
  const color = isBullish ? '#34d399' : '#fb7185';
  const wickX = x + width / 2;

  if (high === low) {
    return <line x1={wickX} x2={wickX} y1={y} y2={y + height} stroke={color} strokeWidth={2} />;
  }

  const pxPerUnit = height / (high - low);
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  const bodyY = y + (high - bodyHigh) * pxPerUnit;
  const bodyHeight = Math.max((bodyHigh - bodyLow) * pxPerUnit, 1.5);
  const bodyWidth = Math.max(width * 0.6, 3);
  const bodyX = x + (width - bodyWidth) / 2;

  return (
    <g>
      <line x1={wickX} x2={wickX} y1={y} y2={y + height} stroke={color} strokeWidth={1.4} />
      <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx={1.5} fill={color} />
    </g>
  );
}

function useResizableChart(defaultHeight = 320) {
  const wrapRef = useRef(null);
  const [height, setHeight] = useState(defaultHeight);
  const [width, setWidth] = useState(null);

  const beginDrag = (axis) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = height;
    const naturalWidth = wrapRef.current?.getBoundingClientRect().width ?? 480;
    const startWidth = width ?? naturalWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'cell';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent) => {
      if (axis === 'height') {
        setHeight(Math.min(720, Math.max(220, startHeight + (moveEvent.clientY - startY))));
      } else {
        setWidth(Math.max(naturalWidth, Math.min(4000, startWidth + (moveEvent.clientX - startX))));
      }
    };
    const stopDrag = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stopDrag);
  };

  const reset = () => {
    setHeight(defaultHeight);
    setWidth(null);
  };

  return { wrapRef, height, width, beginDrag, reset };
}

function AxisResizeHandles({ onDragHeight, onDragWidth }) {
  return (
    <>
      <div
        onMouseDown={onDragHeight}
        title="Drag the price scale to resize height"
        className="absolute right-0 top-0 z-10 cursor-cell transition-colors hover:bg-teal-400/10"
        style={{ bottom: TIME_AXIS_HEIGHT, width: PRICE_AXIS_WIDTH }}
      />
      <div
        onMouseDown={onDragWidth}
        title="Drag the time scale to resize width"
        className="absolute bottom-0 left-0 z-10 cursor-cell transition-colors hover:bg-teal-400/10"
        style={{ right: PRICE_AXIS_WIDTH, height: TIME_AXIS_HEIGHT }}
      />
    </>
  );
}

function PriceChart({ candles, loading, error, onDragHeight, onDragWidth }) {
  const latest = candles[candles.length - 1];
  const isBullish = latest ? latest.close >= latest.open : true;
  const hasChart = !loading && !error && candles.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className={`mb-3 text-xs uppercase tracking-[0.2em] ${isBullish ? 'text-emerald-300' : 'text-rose-300'}`}>
        {latest ? (
          <span>
            O {latest.open.toFixed(2)} &nbsp; H {latest.high.toFixed(2)} &nbsp; L {latest.low.toFixed(2)} &nbsp; C {latest.close.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-500">Open, High, Low, Close</span>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-300">{error}</div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading price history…</div>
        ) : candles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No price history for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" height={TIME_AXIS_HEIGHT} tickFormatter={formatDateTick} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis domain={['auto', 'auto']} orientation="right" width={PRICE_AXIS_WIDTH} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => value.toFixed(0)} />
              <Tooltip content={<CandleTooltip />} />
              {latest ? <ReferenceLine y={latest.close} stroke="#64748b" strokeDasharray="4 4" /> : null}
              <Bar dataKey={(item) => [item.low, item.high]} shape={<CandleShape />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {hasChart ? <AxisResizeHandles onDragHeight={onDragHeight} onDragWidth={onDragWidth} /> : null}
      </div>
    </div>
  );
}

function VolumeChart({ candles, loading, onDragHeight, onDragWidth }) {
  const hasChart = !loading && candles.length > 0;

  return (
    <div className="relative h-full">
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading volume…</div>
      ) : candles.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">No volume data for this range.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="date" height={TIME_AXIS_HEIGHT} tickFormatter={formatDateTick} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis orientation="right" width={PRICE_AXIS_WIDTH} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={formatDateLabel} content={<ChartTooltip formatter={(value) => Number(value).toLocaleString()} />} />
            <Bar dataKey="volume" fill="#14b8a6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {hasChart ? <AxisResizeHandles onDragHeight={onDragHeight} onDragWidth={onDragWidth} /> : null}
    </div>
  );
}

function RsiChart({ candles, loading, error, onDragHeight, onDragWidth }) {
  const latest = candles[candles.length - 1];
  const rsiValue = latest?.rsi;
  const tone = rsiValue == null ? 'text-slate-500' : rsiValue >= 70 ? 'text-rose-300' : rsiValue <= 30 ? 'text-emerald-300' : 'text-sky-300';
  const hasChart = !loading && !error && candles.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className={`mb-3 text-xs uppercase tracking-[0.2em] ${tone}`}>
        {rsiValue != null ? <span>RSI {rsiValue.toFixed(1)}</span> : <span className="text-slate-500">Relative Strength Index</span>}
      </div>
      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-300">{error}</div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading RSI history…</div>
        ) : candles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No RSI data for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rsiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" height={TIME_AXIS_HEIGHT} tickFormatter={formatDateTick} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis domain={[0, 100]} orientation="right" width={PRICE_AXIS_WIDTH} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={formatDateLabel} content={<ChartTooltip formatter={(value) => Number(value).toFixed(1)} />} />
              <Area type="monotone" dataKey="rsi" name="RSI" stroke="#38bdf8" strokeWidth={2.2} fill="url(#rsiFill)" connectNulls />
              <ReferenceLine y={70} stroke="#f97316" strokeDasharray="6 6" />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="6 6" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {hasChart ? <AxisResizeHandles onDragHeight={onDragHeight} onDragWidth={onDragWidth} /> : null}
      </div>
    </div>
  );
}

function MacdChart({ candles, loading, error, onDragHeight, onDragWidth }) {
  const enriched = useMemo(() => withMacdSignal(candles), [candles]);
  const latest = enriched[enriched.length - 1];
  const hasLatest = latest?.macd != null && latest?.signal != null && latest?.histogram != null;
  const isBullish = hasLatest ? latest.histogram >= 0 : true;
  const hasChart = !loading && !error && enriched.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className={`mb-3 text-xs uppercase tracking-[0.2em] ${isBullish ? 'text-emerald-300' : 'text-rose-300'}`}>
        {hasLatest ? (
          <span>
            MACD {latest.macd.toFixed(2)} &nbsp; Signal {latest.signal.toFixed(2)} &nbsp; Hist {latest.histogram.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-500">Moving Average Convergence Divergence</span>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-300">{error}</div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading MACD history…</div>
        ) : enriched.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No MACD data for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={enriched} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" height={TIME_AXIS_HEIGHT} tickFormatter={formatDateTick} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis orientation="right" width={PRICE_AXIS_WIDTH} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={formatDateLabel} content={<ChartTooltip formatter={(value) => Number(value).toFixed(2)} />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
              <Bar dataKey="histogram" name="Histogram" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {enriched.map((entry) => (
                  <Cell key={entry.date} fill={entry.histogram >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(251,113,133,0.6)'} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="macd" name="MACD" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="signal" name="Signal" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {hasChart ? <AxisResizeHandles onDragHeight={onDragHeight} onDragWidth={onDragWidth} /> : null}
      </div>
    </div>
  );
}

export default function MarketCharts({ symbol }) {
  const [period, setPeriod] = useState('3M');
  const { candles, loading, error } = useCandles(symbol, period);
  const priceResize = useResizableChart(320);
  const volumeResize = useResizableChart(320);
  const rsiResize = useResizableChart(320);
  const macdResize = useResizableChart(320);

  useEffect(() => {
    priceResize.reset();
    volumeResize.reset();
    rsiResize.reset();
    macdResize.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Candlestick Chart" subtitle="Price structure, intraday range, and momentum footprint. Drag the price scale (right) to resize height, the time scale (below) to resize width.">
        <div className="mb-3 flex justify-end">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        <div ref={priceResize.wrapRef} className="overflow-x-auto overflow-y-hidden rounded-3xl">
          <div
            className="rounded-3xl border border-white/10 bg-slate-950/60 p-4"
            style={{ height: priceResize.height, width: priceResize.width ? `${priceResize.width}px` : '100%' }}
          >
            <PriceChart
              candles={candles}
              loading={loading}
              error={error}
              onDragHeight={priceResize.beginDrag('height')}
              onDragWidth={priceResize.beginDrag('width')}
            />
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Volume Chart" subtitle="Trading volume across the selected time window. Drag the price scale (right) to resize height, the time scale (below) to resize width.">
        <div ref={volumeResize.wrapRef} className="overflow-x-auto overflow-y-hidden rounded-3xl">
          <div
            className="rounded-3xl border border-white/10 bg-slate-950/60 p-4"
            style={{ height: volumeResize.height, width: volumeResize.width ? `${volumeResize.width}px` : '100%' }}
          >
            <VolumeChart
              candles={candles}
              loading={loading}
              onDragHeight={volumeResize.beginDrag('height')}
              onDragWidth={volumeResize.beginDrag('width')}
            />
          </div>
        </div>
      </ChartCard>

      <ChartCard title="RSI Chart" subtitle="Overbought and oversold pressure zones. Drag the price scale (right) to resize height, the time scale (below) to resize width.">
        <div className="mb-3 flex justify-end">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        <div ref={rsiResize.wrapRef} className="overflow-x-auto overflow-y-hidden rounded-3xl">
          <div
            className="rounded-3xl border border-white/10 bg-slate-950/60 p-4"
            style={{ height: rsiResize.height, width: rsiResize.width ? `${rsiResize.width}px` : '100%' }}
          >
            <RsiChart
              candles={candles}
              loading={loading}
              error={error}
              onDragHeight={rsiResize.beginDrag('height')}
              onDragWidth={rsiResize.beginDrag('width')}
            />
          </div>
        </div>
      </ChartCard>

      <ChartCard title="MACD Chart" subtitle="Signal convergence and histogram direction. Drag the price scale (right) to resize height, the time scale (below) to resize width.">
        <div className="mb-3 flex justify-end">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        <div ref={macdResize.wrapRef} className="overflow-x-auto overflow-y-hidden rounded-3xl">
          <div
            className="rounded-3xl border border-white/10 bg-slate-950/60 p-4"
            style={{ height: macdResize.height, width: macdResize.width ? `${macdResize.width}px` : '100%' }}
          >
            <MacdChart
              candles={candles}
              loading={loading}
              error={error}
              onDragHeight={macdResize.beginDrag('height')}
              onDragWidth={macdResize.beginDrag('width')}
            />
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
