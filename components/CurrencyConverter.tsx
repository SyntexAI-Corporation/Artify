import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRightLeft, RefreshCw, ChevronDown, Check, TrendingUp, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './ui/Button';

interface CurrencyConverterProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

const COMMON_CURRENCIES = [
  "USD", "EUR", "BRL", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "HKD", "INR", "MXN", "NZD", "SEK", "SGD", "KRW", "TRY"
];

// Reusing CustomSelect logic within the component for self-containment
const CurrencySelect = ({ 
  value, 
  onChange, 
  options,
  className = ""
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[];
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative min-w-[110px] sm:min-w-[130px] h-full ${className} ${isOpen ? 'z-50' : ''}`} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full flex items-center justify-between bg-emerald-950/30 border ${isOpen ? 'border-[#1DB954] ring-1 ring-[#1DB954]/50' : 'border-emerald-900/50'} rounded-xl pl-3 pr-2 py-0 text-white outline-none transition-all hover:border-emerald-700 hover:bg-emerald-900/20`}
      >
        <div className="flex items-center gap-2">
           <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isOpen ? 'bg-[#1DB954] text-black' : 'bg-emerald-800 text-emerald-200'}`}>
              {value.substring(0,1)}
           </div>
           <span className="font-bold tracking-wide text-lg">{value}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-500/70 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180 text-[#1DB954]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-emerald-900/50 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in-95 duration-200">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                value === opt 
                  ? 'text-[#1DB954] bg-emerald-950/40' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="font-medium text-base">{opt}</span>
              {value === opt && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  
  const [amount, setAmount] = useState<string>("1");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [targetCurrency, setTargetCurrency] = useState("BRL");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem('currency_rates');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        // Check if cache is for current pair and not too old (24h)
        const age = Date.now() - data.timestamp;
        if (data.base === baseCurrency && data.target === targetCurrency && age < 86400000) {
            setExchangeRate(data.rate);
            setLastUpdated(new Date(data.timestamp).toLocaleDateString());
        } else {
            fetchRates();
        }
      } catch (e) {
        fetchRates();
      }
    } else {
      fetchRates();
    }
  }, []);

  // Fetch on pair change
  useEffect(() => {
    fetchRates();
  }, [baseCurrency, targetCurrency]);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const rate = data.rates[targetCurrency];
      setExchangeRate(rate);
      const date = new Date().toLocaleDateString();
      setLastUpdated(date);

      // Cache
      localStorage.setItem('currency_rates', JSON.stringify({
        base: baseCurrency,
        target: targetCurrency,
        rate: rate,
        timestamp: Date.now()
      }));

    } catch (err) {
      console.error(err);
      // Try to recover cache if failed
      const cached = localStorage.getItem('currency_rates');
      if (cached) {
          const data = JSON.parse(cached);
          if (data.base === baseCurrency && data.target === targetCurrency) {
              setExchangeRate(data.rate);
              setError("Network error. Using cached rates.");
          } else {
              setError("Failed to fetch rates.");
          }
      } else {
          setError("Failed to fetch rates.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setBaseCurrency(targetCurrency);
    setTargetCurrency(baseCurrency);
  };

  const convertedAmount = exchangeRate && !isNaN(parseFloat(amount)) 
    ? (parseFloat(amount) * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : "---";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
            <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white flex items-center transition-colors group w-fit"
            >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t.back}
            </button>

            <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/50"
            >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>
        </div>

        <div className="flex items-center gap-3">
            <div className="bg-[#0F3D2E] p-3 rounded-xl border border-[#1DB954]/30">
                <TrendingUp className="w-8 h-8 text-[#1DB954]" />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-emerald-200">
            {t.currencyConverter}
            </h1>
        </div>

        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
          {/* Decorative Background Blob - Isolated in clipped container */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#1DB954]/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-6 flex flex-col gap-6 relative">
            {/* FROM Section */}
            {/* Set relative but allow default stacking for input. Pass high z-index to Select. */}
            <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t.ccFrom}</label>
                <div className="flex gap-3 h-[64px]">
                    <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 w-full h-full bg-slate-950 border border-slate-700 rounded-xl px-4 text-2xl text-white outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954]/50 transition-all placeholder-slate-700"
                        placeholder="0.00"
                    />
                    <CurrencySelect 
                        value={baseCurrency}
                        onChange={setBaseCurrency}
                        options={COMMON_CURRENCIES}
                        className="z-30"
                    />
                </div>
            </div>

            {/* Swap Button */}
            {/* Z-40 places it clearly above inputs (z-0) and To section (z-10), but below From Select (z-50) */}
            <div className="relative h-0 z-40 flex justify-center items-center">
                <div className="bg-slate-900 rounded-full p-1 -translate-y-1/2">
                    <button 
                    onClick={handleSwap}
                    className="p-3 bg-slate-800 hover:bg-[#1DB954] text-[#1DB954] hover:text-white rounded-full border border-slate-700 hover:border-[#1DB954] transition-all shadow-xl hover:shadow-[#1DB954]/30 hover:scale-110 active:scale-95 group"
                    >
                    <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* TO Section */}
            <div className="space-y-2 relative z-10">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t.ccTo}</label>
                <div className="flex gap-3 h-[64px]">
                    <div className="flex-1 w-full h-full bg-[#0F3D2E]/40 border border-[#1DB954]/30 rounded-xl px-4 text-2xl text-[#34D399] font-bold flex items-center shadow-inner overflow-hidden">
                        <span className="truncate">{convertedAmount}</span>
                    </div>
                    <CurrencySelect 
                        value={targetCurrency}
                        onChange={setTargetCurrency}
                        options={COMMON_CURRENCIES}
                    />
                </div>
            </div>

            {/* Info & Action */}
            <div className="pt-2 flex flex-col gap-4 border-t border-slate-800/50 mt-2 relative z-0">
                <div className="flex justify-between items-center text-xs text-slate-500 mt-4">
                    <span>{t.ccLastUpdate} {lastUpdated || '...'}</span>
                    {exchangeRate && <span className="font-mono">1 {baseCurrency} = {exchangeRate} {targetCurrency}</span>}
                </div>
                
                <Button 
                    onClick={fetchRates} 
                    isLoading={loading}
                    className="w-full !bg-gradient-to-r !from-[#1DB954] !to-[#34D399] border !border-[#34D399]/20 active:scale-95 transition-transform"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t.ccUpdate}
                </Button>
                
                {error && <p className="text-center text-xs text-orange-400">{error}</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};