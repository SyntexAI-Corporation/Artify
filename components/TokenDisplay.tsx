import React from 'react';
import { CassetteTape, Infinity as InfinityIcon } from 'lucide-react';
import { PlanType, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface TokenDisplayProps {
  tokens: number;
  plan: PlanType;
  language: Language;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({ tokens, plan, language }) => {
  const t = TRANSLATIONS[language];
  
  return (
    <div className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 backdrop-blur-sm">
      <div className="relative">
        <CassetteTape className="w-5 h-5 text-fuchsia-400" />
        <div className="absolute inset-0 bg-fuchsia-500/20 blur-[6px] rounded-full"></div>
      </div>
      <span className="font-semibold text-slate-200">
        {plan === PlanType.PLUS ? (
          <span className="flex items-center gap-1 text-fuchsia-300">
            <InfinityIcon className="w-4 h-4" /> {t.tokens}
          </span>
        ) : (
          <span className="tabular-nums text-fuchsia-300">{tokens} {t.tokens}</span>
        )}
      </span>
    </div>
  );
};