import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const data = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [
    {
      label: 'Sample Trend',
      data: [62, 68, 65, 71, 74],
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      tension: 0.35,
      fill: true,
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#e2e8f0',
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.06)',
      },
    },
    y: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.06)',
      },
    },
  },
};

export default function MarketChart() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Chart.js Preview</h2>
        <p className="text-sm text-slate-300">Placeholder market movement chart for future model outputs.</p>
      </div>
      <div className="h-80">
        <Line data={data} options={options} />
      </div>
    </section>
  );
}