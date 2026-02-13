
import React from 'react';
import { X, Info, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';

export interface FeatureInfoContent {
  title: string;
  description: string;
  features: string[];
}

interface FeatureInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: FeatureInfoContent | null;
}

export const FeatureInfoModal: React.FC<FeatureInfoModalProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-600/10 to-transparent rounded-bl-full pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2 shrink-0 z-10">
          <div className="flex items-center gap-3">
             <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
               <Info className="w-5 h-5 text-violet-600 dark:text-violet-400" />
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">{content.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 space-y-6 z-10">
           <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
             {content.description}
           </p>

           <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">O que você pode fazer</h3>
              <ul className="space-y-3">
                 {content.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                       <span className="text-sm text-slate-700 dark:text-slate-200">{feature}</span>
                    </li>
                 ))}
              </ul>
           </div>

           <Button onClick={onClose} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700">
             Entendi
           </Button>
        </div>

      </div>
    </div>
  );
};
