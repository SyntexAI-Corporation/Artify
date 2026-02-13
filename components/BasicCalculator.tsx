
import React, { useState } from 'react';
import { ArrowLeft, Delete, Equal, Divide, X, Minus, Plus, Percent, Calculator, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface BasicCalculatorProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

export const BasicCalculator: React.FC<BasicCalculatorProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isResult, setIsResult] = useState(false);

  const handleNumber = (num: string) => {
    if (isResult) {
      setDisplay(num);
      setEquation(num);
      setIsResult(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
      setEquation(equation + num);
    }
  };

  const handleOperator = (op: string) => {
    setIsResult(false);
    if (equation === '') return;
    const lastChar = equation.slice(-1);
    if (['+', '-', '*', '/', '%'].includes(lastChar)) {
       setEquation(equation.slice(0, -1) + op);
       return;
    }
    setEquation(equation + op);
    // Clear display for all operators including % to allow clear entry of next number
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsResult(false);
  };

  const handleDelete = () => {
    if (isResult) {
       handleClear();
       return;
    }
    if (equation.length > 0) {
       const newEq = equation.slice(0, -1);
       setEquation(newEq);
       if (newEq === '') setDisplay('0');
       else {
          const match = newEq.match(/([0-9.]+)$/);
          setDisplay(match ? match[1] : '0');
       }
    }
  };

  const calculate = () => {
    try {
      if (/[^0-9+\-*/.%]/.test(equation)) return;
      
      let evalEq = equation;

      // 1. Strict Percentage: Replace 10% with (10/100)
      // This ensures 500 * 10% becomes 500 * (10/100) = 50
      evalEq = evalEq.replace(/(\d+(?:\.\d+)?|\.\d+)%/g, '($1/100)');
      evalEq = evalEq.replace(/%/g, '/100');

      // 2. Implicit Multiplication
      // Since % introduces parentheses, e.g., 10%50 becomes (10/100)50
      // We must insert * between ) and the number: (10/100)*50
      evalEq = evalEq.replace(/\)(\d)/g, ')*$1');

      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${evalEq}`)();
      
      if (!isFinite(result) || isNaN(result)) {
          setDisplay('Error');
          return;
      }

      const formattedResult = Number(parseFloat(result.toPrecision(12))).toString();
      
      setDisplay(formattedResult);
      setEquation(formattedResult);
      setIsResult(true);
    } catch (e) {
      console.error(e);
      setDisplay('Error');
      setIsResult(true);
    }
  };

  const btnBase = "rounded-2xl text-2xl font-medium transition-all active:scale-95 flex items-center justify-center shadow-sm select-none";
  // Updated button styles for light/dark
  const numBtn = `${btnBase} bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 border border-slate-200 dark:border-transparent`;
  const opBtn = `${btnBase} bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700`;
  const topBtn = `${btnBase} bg-slate-200 dark:bg-slate-300 text-slate-700 dark:text-slate-900 hover:bg-slate-300 dark:hover:bg-slate-200 active:bg-slate-400 font-semibold`;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0 h-12">
          <button 
          onClick={onBack}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center transition-colors px-2 rounded hover:bg-slate-200 dark:hover:bg-white/5"
          >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-sm font-bold uppercase hidden sm:inline">{t.back}</span>
          </button>

          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="bg-violet-100 dark:bg-violet-500/20 p-1.5 rounded-lg">
                <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">{t.basicCalculator}</span>
          </div>

          <button 
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-slate-700/50"
          >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
          </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full pb-6">
         
         {/* Display */}
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-end items-end h-48 shrink-0 shadow-inner">
             <div className="text-slate-500 text-lg font-mono mb-2 h-6 tracking-wide overflow-hidden w-full text-right">{equation}</div>
             <div className="text-6xl font-medium text-slate-900 dark:text-white tracking-tight break-all text-right">{display}</div>
         </div>

         {/* Keypad */}
         <div className="flex-1 grid grid-cols-4 gap-4">
             <button onClick={handleClear} className={topBtn}>AC</button>
             <button onClick={handleDelete} className={topBtn}><Delete className="w-7 h-7" /></button>
             <button onClick={() => handleOperator('%')} className={topBtn}><Percent className="w-7 h-7" /></button>
             <button onClick={() => handleOperator('/')} className={opBtn}><Divide className="w-8 h-8" /></button>

             <button onClick={() => handleNumber('7')} className={numBtn}>7</button>
             <button onClick={() => handleNumber('8')} className={numBtn}>8</button>
             <button onClick={() => handleNumber('9')} className={numBtn}>9</button>
             <button onClick={() => handleOperator('*')} className={opBtn}><X className="w-7 h-7" /></button>

             <button onClick={() => handleNumber('4')} className={numBtn}>4</button>
             <button onClick={() => handleNumber('5')} className={numBtn}>5</button>
             <button onClick={() => handleNumber('6')} className={numBtn}>6</button>
             <button onClick={() => handleOperator('-')} className={opBtn}><Minus className="w-7 h-7" /></button>

             <button onClick={() => handleNumber('1')} className={numBtn}>1</button>
             <button onClick={() => handleNumber('2')} className={numBtn}>2</button>
             <button onClick={() => handleNumber('3')} className={numBtn}>3</button>
             <button onClick={() => handleOperator('+')} className={opBtn}><Plus className="w-7 h-7" /></button>

             <button onClick={() => handleNumber('0')} className={`${numBtn} col-span-2 rounded-2xl pl-8 justify-start`}>0</button>
             <button onClick={() => handleNumber('.')} className={numBtn}>.</button>
             <button onClick={calculate} className={opBtn}><Equal className="w-8 h-8" /></button>
         </div>
      </div>
    </div>
  );
};
