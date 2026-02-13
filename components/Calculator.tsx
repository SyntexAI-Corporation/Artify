
import React, { useState } from 'react';
import { ArrowLeft, Delete, Equal, Divide, X, Minus, Plus, Percent, Sigma, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface CalculatorProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isResult, setIsResult] = useState(false);
  const [isRad, setIsRad] = useState(false); 

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
    // Prevent double operators
    if (['+', '-', '*', '/', '%', '^'].includes(lastChar)) {
       setEquation(equation.slice(0, -1) + op);
       return;
    }
    setEquation(equation + op);
    // Clear display for all operators to allow clear entry of next number
    setDisplay('0');
  };

  const handleFunction = (func: string) => {
    setIsResult(false);
    const funcWithParen = func + '(';
    if (display === '0' && equation === '') {
        setEquation(funcWithParen);
        setDisplay(funcWithParen);
    } else {
        const lastChar = equation.slice(-1);
        // Implicit multiplication for things like 2sin(30) -> 2*sin(30)
        if (/[0-9)πe]/.test(lastChar)) {
             setEquation(equation + '*' + funcWithParen);
        } else {
             setEquation(equation + funcWithParen);
        }
        setDisplay(funcWithParen);
    }
  };

  const handleConstant = (constName: string, constVal: string) => {
      if (isResult) {
          setEquation(constName);
          setDisplay(constName);
          setIsResult(false);
          return;
      }
      const lastChar = equation.slice(-1);
      if (/[0-9.)]/.test(lastChar)) {
           setEquation(equation + '*' + constName);
      } else {
           setEquation(equation + constName);
      }
      setDisplay(constName);
  }

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
      // Basic validation check for unsafe characters
      if (/[^0-9+\-*/.%()a-z^!.,]/.test(equation)) return;
      
      let evalEq = equation;

      // 1. Strict Percentage Logic: % means /100
      evalEq = evalEq.replace(/(\d+(?:\.\d+)?|\.\d+)%/g, '($1/100)');
      evalEq = evalEq.replace(/%/g, '/100');

      // 2. Implicit Multiplication
      // Handle cases like:
      // (10/100)500 -> (10/100)*500  (This fixes the 10%500 bug)
      // 5(10) -> 5*(10)
      // (5)(10) -> (5)*(10)
      evalEq = evalEq.replace(/(\d)\(/g, '$1*(');
      evalEq = evalEq.replace(/\)(\d)/g, ')*$1');
      evalEq = evalEq.replace(/\)\(/g, ')*(');

      // Constants and Powers
      evalEq = evalEq
        .replace(/π/g, 'pi')
        .replace(/\^/g, '**');

      // Handle Factorial
      let prevEq = "";
      let factSafety = 0;
      while (prevEq !== evalEq && factSafety < 10) {
          prevEq = evalEq;
          // Matches number! or (...)!
          evalEq = evalEq.replace(/(\d+(?:\.\d+)?|\((?:[^()]+)\))!/g, 'fact($1)');
          factSafety++;
      }

      const scope = {
         sin: (x: number) => isRad ? Math.sin(x) : Math.sin(x * Math.PI / 180),
         cos: (x: number) => isRad ? Math.cos(x) : Math.cos(x * Math.PI / 180),
         tan: (x: number) => isRad ? Math.tan(x) : Math.tan(x * Math.PI / 180),
         asin: (x: number) => isRad ? Math.asin(x) : Math.asin(x) * 180 / Math.PI,
         acos: (x: number) => isRad ? Math.acos(x) : Math.acos(x) * 180 / Math.PI,
         atan: (x: number) => isRad ? Math.atan(x) : Math.atan(x) * 180 / Math.PI,
         log: Math.log10,
         ln: Math.log,
         sqrt: Math.sqrt,
         pi: Math.PI,
         e: Math.E,
         fact: (n: number) => {
             if (n < 0 || !Number.isInteger(n)) return NaN; // Factorial defined for non-negative integers
             let res = 1;
             for (let i = 2; i <= n; i++) res *= i;
             return res;
         }
      };

      const keys = Object.keys(scope);
      const values = Object.values(scope);
      
      // eslint-disable-next-line no-new-func
      const func = new Function(...keys, `return ${evalEq}`);
      const result = func(...values);
      
      if (!isFinite(result) || isNaN(result)) {
          setDisplay('Error');
          return;
      }

      const formattedResult = Number(result.toFixed(10)).toString();
      setDisplay(formattedResult);
      setEquation(formattedResult);
      setIsResult(true);

    } catch (e) {
      console.error(e);
      setDisplay('Error');
      setIsResult(true);
    }
  };

  const btnClass = "h-full w-full rounded-lg text-sm md:text-base font-medium transition-all active:scale-95 flex items-center justify-center select-none shadow-sm";
  const numBtn = `${btnClass} bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 border border-slate-200 dark:border-slate-700/50 text-lg`;
  const opBtn = `${btnClass} bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 text-xl font-bold border border-transparent`;
  const sciBtn = `${btnClass} bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-800 text-xs sm:text-sm`;
  const topBtn = `${btnClass} bg-slate-300 dark:bg-slate-300 text-slate-900 hover:bg-slate-200 active:bg-slate-400 font-semibold border border-slate-300`;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-2 sm:p-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 shrink-0 h-12">
            <button 
                onClick={onBack}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center transition-colors px-2 rounded hover:bg-slate-200 dark:hover:bg-white/5"
            >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm font-bold uppercase hidden sm:inline">{t.back}</span>
            </button>
            
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-1.5 rounded-lg">
                    <Sigma className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">{t.calculator}</span>
            </div>

            <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-slate-700/50"
            >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>
        </div>

        {/* Display Area */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-end items-end p-4 rounded-2xl shrink-0 h-[18vh] min-h-[110px] mb-4 shadow-sm dark:shadow-inner">
            <div className="text-slate-500 text-sm font-mono h-5 mb-1 tracking-wider overflow-hidden w-full text-right">{equation}</div>
            <div className="text-4xl sm:text-6xl font-light text-slate-900 dark:text-white w-full text-right truncate tracking-tight">{display}</div>
        </div>

        {/* Keypad Grid */}
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col gap-1">
            
            {/* Scientific Functions Area (Top rows) */}
            <div className="grid grid-cols-5 gap-1 shrink-0 h-[30%] min-h-[120px]">
                {/* Row 1 */}
                <button onClick={() => setIsRad(!isRad)} className={`${sciBtn} uppercase text-[10px]`}>{isRad ? 'Rad' : 'Deg'}</button>
                <button onClick={() => handleFunction('sin')} className={sciBtn}>sin</button>
                <button onClick={() => handleFunction('cos')} className={sciBtn}>cos</button>
                <button onClick={() => handleFunction('tan')} className={sciBtn}>tan</button>
                <button onClick={() => handleConstant('π', 'pi')} className={sciBtn}>π</button>
                
                {/* Row 2 */}
                <button onClick={() => handleFunction('asin')} className={sciBtn}>sin⁻¹</button>
                <button onClick={() => handleFunction('acos')} className={sciBtn}>cos⁻¹</button>
                <button onClick={() => handleFunction('atan')} className={sciBtn}>tan⁻¹</button>
                <button onClick={() => handleConstant('e', 'e')} className={sciBtn}>e</button>
                <button onClick={() => handleFunction('log')} className={sciBtn}>log</button>
                
                {/* Row 3 */}
                <button onClick={() => handleOperator('^')} className={sciBtn}>x^y</button>
                <button onClick={() => handleOperator('(')} className={sciBtn}>(</button>
                <button onClick={() => handleOperator(')')} className={sciBtn}>)</button>
                <button onClick={() => handleFunction('sqrt')} className={sciBtn}>√</button>
                <button onClick={() => handleFunction('ln')} className={sciBtn}>ln</button>
            </div>

            {/* Standard Keypad Area (Bottom - Larger buttons) */}
            <div className="flex-1 grid grid-cols-4 gap-2 pt-2">
                
                {/* Functional Top Row */}
                <button onClick={handleClear} className={topBtn}>AC</button>
                <button onClick={handleDelete} className={topBtn}><Delete className="w-5 h-5" /></button>
                <button onClick={() => handleOperator('%')} className={topBtn}><Percent className="w-5 h-5" /></button>
                <button onClick={() => handleOperator('/')} className={opBtn}><Divide className="w-6 h-6" /></button>

                {/* Number Row 1 */}
                <button onClick={() => handleNumber('7')} className={numBtn}>7</button>
                <button onClick={() => handleNumber('8')} className={numBtn}>8</button>
                <button onClick={() => handleNumber('9')} className={numBtn}>9</button>
                <button onClick={() => handleOperator('*')} className={opBtn}><X className="w-6 h-6" /></button>

                {/* Number Row 2 */}
                <button onClick={() => handleNumber('4')} className={numBtn}>4</button>
                <button onClick={() => handleNumber('5')} className={numBtn}>5</button>
                <button onClick={() => handleNumber('6')} className={numBtn}>6</button>
                <button onClick={() => handleOperator('-')} className={opBtn}><Minus className="w-6 h-6" /></button>

                {/* Number Row 3 */}
                <button onClick={() => handleNumber('1')} className={numBtn}>1</button>
                <button onClick={() => handleNumber('2')} className={numBtn}>2</button>
                <button onClick={() => handleNumber('3')} className={numBtn}>3</button>
                <button onClick={() => handleOperator('+')} className={opBtn}><Plus className="w-6 h-6" /></button>

                {/* Bottom Row */}
                <button onClick={() => handleNumber('0')} className={`${numBtn} col-span-2 pl-6 justify-start`}>0</button>
                <button onClick={() => handleNumber('.')} className={numBtn}>.</button>
                <button onClick={calculate} className={opBtn}><Equal className="w-6 h-6" /></button>

            </div>
        </div>
    </div>
  );
};
