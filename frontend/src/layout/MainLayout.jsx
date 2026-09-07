import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { formatCurrency } from '../lib/market';
import { dashboardApi } from '../services/api';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    let active = true;
    dashboardApi
      .stocks()
      .then((response) => {
        if (active) {
          setStocks(response.data?.stocks ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setStocks([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const renderStockItem = (stock, keyPrefix) => {
    const changePct = stock.average_close ? ((stock.latest_close - stock.average_close) / stock.average_close) * 100 : 0;
    const isNegative = changePct < 0;
    return (
      <span className="market-tape-item" key={`${keyPrefix}-${stock.symbol}`}>
        {stock.logo_url ? (
          <img src={stock.logo_url} alt="" className="market-tape-logo" loading="lazy" referrerPolicy="no-referrer" />
        ) : null}
        <span className="market-tape-info">
          <b>{stock.symbol}</b>
          {formatCurrency(stock.latest_close)}
          <em className={isNegative ? 'negative' : ''}>
            {isNegative ? '' : '+'}
            {changePct.toFixed(2)}%
          </em>
        </span>
      </span>
    );
  };

  const renderTrack = (keyPrefix) => (
    <>
      <span className="market-tape-item" key={`${keyPrefix}-brand`}>
        <b>XAI MODELS</b> Paper Suite + XGBoost <em>Online</em>
      </span>
      {stocks.map((stock) => renderStockItem(stock, keyPrefix))}
    </>
  );

  return (
    <div className="app-shell text-slate-900">
      <Navbar onToggleSidebar={() => setSidebarOpen((value) => !value)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="market-tape">
        <div className="market-tape-track">
          {renderTrack('a')}
          {renderTrack('b')}
        </div>
      </div>
      <div className="relative mx-auto max-w-[1540px]">
        <main className="page-enter min-w-0 px-4 py-8 sm:px-7 lg:px-10"><Outlet /></main>
      </div>
      <Footer />
    </div>
  );
}
