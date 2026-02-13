
import React from 'react';
import { ArrowLeft, Pipette, Banknote, Globe, FileText, PenTool } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ToolsScreenProps {
  onBack: () => void;
  onSelectTool: (tool: 'color-analyzer' | 'currency-converter' | 'notes' | 'sketchbook') => void;
  language: Language;
  toggleLanguage: () => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({ onBack, onSelectTool, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <button 
            onClick={onBack}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center transition-colors group px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 -ml-3 w-fit"
            >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
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

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{t.tools}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg">{t.toolsDesc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Color Analyzer Card */}
          <div 
            onClick={() => onSelectTool('color-analyzer')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-all duration-300 p-8 flex flex-col shadow-lg hover:shadow-pink-500/20"
          >
             <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-pink-600 dark:text-pink-400">
                <Pipette className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.colorAnalyzer}</h2>
             <p className="text-slate-600 dark:text-slate-400">{t.colorAnalyzerDesc}</p>
             <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500">
                <svg className="w-6 h-6 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
             </div>
          </div>

          {/* Currency Converter Card */}
          <div 
            onClick={() => onSelectTool('currency-converter')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-[#0F3D2E]/40 transition-all duration-300 p-8 flex flex-col shadow-lg hover:shadow-emerald-500/20"
          >
             <div className="w-16 h-16 bg-emerald-100 dark:bg-[#0F3D2E] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-emerald-600 dark:text-[#1DB954]">
                <Banknote className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.currencyConverter}</h2>
             <p className="text-slate-600 dark:text-slate-400">{t.currencyConverterDesc}</p>
             <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
                <svg className="w-6 h-6 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
             </div>
          </div>

          {/* Notes Card */}
          <div 
            onClick={() => onSelectTool('notes')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-300 p-8 flex flex-col shadow-lg hover:shadow-emerald-500/20"
          >
             <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-emerald-600 dark:text-emerald-400">
                <FileText className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.notes}</h2>
             <p className="text-slate-600 dark:text-slate-400">{t.notesDesc}</p>
             <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
                <svg className="w-6 h-6 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
             </div>
          </div>

          {/* Sketchbook Card */}
          <div 
            onClick={() => onSelectTool('sketchbook')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all duration-300 p-8 flex flex-col shadow-lg hover:shadow-violet-500/20"
          >
             <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-violet-600 dark:text-violet-400">
                <PenTool className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.sketchbook}</h2>
             <p className="text-slate-600 dark:text-slate-400">{t.sketchbookDesc}</p>
             <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500">
                <svg className="w-6 h-6 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
