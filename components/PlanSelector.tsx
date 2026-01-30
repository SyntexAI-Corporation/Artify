import React from 'react';
import { PlanType, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Sparkles, Zap } from 'lucide-react';

interface PlanSelectorProps {
  currentPlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
  language: Language;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({ currentPlan, onSelectPlan, language }) => {
  const t = TRANSLATIONS[language];
  
  return (
    <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
      <button
        onClick={() => onSelectPlan(PlanType.BASIC)}
        className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          currentPlan === PlanType.BASIC
            ? 'bg-slate-800 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Zap className="w-4 h-4 mr-2" />
        {t.basicPlan}
      </button>
      <button
        onClick={() => onSelectPlan(PlanType.PLUS)}
        className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          currentPlan === PlanType.PLUS
            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {t.plusPlan}
      </button>
    </div>
  );
};