
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRightLeft, Copy, Check, ChevronDown, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface UnitConverterProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

type UnitCategory = 'length' | 'area' | 'volume' | 'mass' | 'temperature' | 'time' | 'digital';

const UNIT_DATA: Record<UnitCategory, Record<string, number | ((val: number, toBase: boolean) => number)>> = {
  length: { // Base: meter
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    inch: 0.0254,
    foot: 0.3048,
    yard: 0.9144,
    mile: 1609.34,
  },
  area: { // Base: square meter
    'cm²': 0.0001,
    'm²': 1,
    hectare: 10000,
    acre: 4046.86,
  },
  volume: { // Base: liter
    milliliters: 0.001,
    liters: 1,
    drops: 0.00005,
    teaspoons: 0.00492892,
    tablespoons: 0.0147868,
    cups: 0.24,
    'fluid ounces': 0.0295735,
    gallons: 3.78541,
  },
  mass: { // Base: gram
    mg: 0.001,
    g: 1,
    kg: 1000,
    ton: 1000000,
    ounce: 28.3495,
    pound: 453.592,
  },
  temperature: {
    // Custom formulas for temp
    Celsius: (val, toBase) => val, 
    Fahrenheit: (val, toBase) => toBase ? (val - 32) * 5/9 : (val * 9/5) + 32,
    Kelvin: (val, toBase) => toBase ? val - 273.15 : val + 273.15,
  },
  time: { // Base: second
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
  },
  digital: { // Base: byte
    bytes: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  }
};

const getUnitTranslation = (key: string, t: any) => {
  const tKey = `unit_${key.replace(/ /g, '_').replace('²', '2')}`;
  return t[tKey] || key;
};

// Custom Dropdown Component
const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  t 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  t: any 
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
    <div className="relative min-w-[140px] h-full" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full flex items-center justify-between bg-white dark:bg-slate-800 border ${isOpen ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-200 dark:border-slate-700'} rounded-2xl pl-5 pr-4 py-4 text-slate-900 dark:text-white outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600`}
      >
        <span className="truncate mr-2 text-left">{getUnitTranslation(value, t)}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in-95 duration-200">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-5 py-3 text-sm transition-colors ${
                value === opt 
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {getUnitTranslation(opt, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const UnitConverter: React.FC<UnitConverterProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  const [category, setCategory] = useState<UnitCategory>('length');
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('cm');
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Initialize units when category changes
  useEffect(() => {
    const units = Object.keys(UNIT_DATA[category]);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [category]);

  // Calculate result
  useEffect(() => {
    if (!inputValue || isNaN(Number(inputValue))) {
      setResult('---');
      return;
    }

    const val = Number(inputValue);
    const units = UNIT_DATA[category];
    
    // Guard clause: ensure units belong to current category
    if (!units[fromUnit] || !units[toUnit]) {
      return;
    }

    const fromFactor = units[fromUnit];
    const toFactor = units[toUnit];

    try {
      if (category === 'temperature') {
        if (typeof fromFactor !== 'function' || typeof toFactor !== 'function') return;
        
        const fromFn = fromFactor as (v: number, b: boolean) => number;
        const toFn = toFactor as (v: number, b: boolean) => number;
        
        // Convert to Celsius (Base)
        const baseVal = fromFn(val, true);
        // Convert from Celsius to Target
        const res = toFn(baseVal, false);
        setResult(res.toLocaleString(undefined, { maximumFractionDigits: 4 }));
      } else {
        if (typeof fromFactor !== 'number' || typeof toFactor !== 'number') return;

        const fFactor = fromFactor as number;
        const tFactor = toFactor as number;
        const baseVal = val * fFactor;
        const res = baseVal / tFactor;
        setResult(res.toLocaleString(undefined, { maximumFractionDigits: 6 }));
      }
    } catch (e) {
      console.error("Conversion error", e);
      setResult('Error');
    }
  }, [inputValue, fromUnit, toUnit, category]);

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const handleCopy = () => {
    if (result === '---') return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <div className="max-w-xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
            <button 
            onClick={onBack}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center transition-colors group w-fit"
            >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t.back}
            </button>

            <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-slate-700/50"
            >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>
        </div>

        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-400 dark:to-teal-400">
          {t.unitConverter}
        </h1>

        {/* Category Selector */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(UNIT_DATA) as UnitCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                category === cat 
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t[`uc${cat.charAt(0).toUpperCase() + cat.slice(1)}` as keyof typeof t] || cat}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          
          {/* Input Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t.ucInputLabel}</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-2xl text-slate-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-700"
                placeholder="0"
              />
              <CustomSelect 
                value={fromUnit}
                onChange={setFromUnit}
                options={Object.keys(UNIT_DATA[category])}
                t={t}
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button 
              onClick={handleSwap}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 text-cyan-500 hover:text-white rounded-full border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-all shadow-lg hover:shadow-cyan-500/30 hover:scale-110 active:scale-95"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Result Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{t.ucResultLabel}</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-2xl text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-between shadow-inner">
                <span className="truncate">{result}</span>
                <button 
                  onClick={handleCopy}
                  className="ml-2 p-2 hover:bg-slate-200 dark:hover:bg-slate-800/80 rounded-xl text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <CustomSelect 
                value={toUnit}
                onChange={setToUnit}
                options={Object.keys(UNIT_DATA[category])}
                t={t}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
