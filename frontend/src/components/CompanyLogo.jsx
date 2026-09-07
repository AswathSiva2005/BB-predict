import { useState } from 'react';

export default function CompanyLogo({ stock, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const dimensions = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs';
  const initials = (stock?.company_name ?? stock?.symbol ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className={`${dimensions} ${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white p-2 font-bold text-slate-800 shadow-lg`}>
      {stock?.logo_url && !failed ? (
        <img
          src={stock.logo_url}
          alt={`${stock.company_name ?? stock.symbol} logo`}
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : initials}
    </span>
  );
}
