import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const sampleData = [
  { name: 'Mon', value: 62 },
  { name: 'Tue', value: 68 },
  { name: 'Wed', value: 65 },
  { name: 'Thu', value: 71 },
  { name: 'Fri', value: 74 },
];

export default function Trends() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Trend Preview</h1>
        <p className="mt-2 text-slate-300">A placeholder chart view for future stock movement visualization.</p>
      </div>
      <div className="h-96 rounded-3xl border border-white/10 bg-white/5 p-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampleData}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
            <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="url(#trendFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
