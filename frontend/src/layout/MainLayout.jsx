import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-shell text-slate-900">
      <Navbar onToggleSidebar={() => setSidebarOpen((value) => !value)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="market-tape">
        <span><b>NASDAQ</b> 23,716.31 <em>+0.42%</em></span>
        <span><b>S&amp;P 500</b> 6,796.18 <em>+0.31%</em></span>
        <span><b>DOW</b> 48,901.22 <em className="negative">-0.08%</em></span>
        <span><b>XAI MODELS</b> Paper Suite + LSTM <em>Online</em></span>
      </div>
      <div className="relative mx-auto max-w-[1540px]">
        <main className="page-enter min-w-0 px-4 py-8 sm:px-7 lg:px-10"><Outlet /></main>
      </div>
      <Footer />
    </div>
  );
}
