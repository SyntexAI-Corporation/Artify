
import React from 'react';
import { X, Info, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-violet-100 dark:bg-violet-600/20 p-2 rounded-xl">
               <Info className="w-6 h-6 text-violet-600 dark:text-violet-400" />
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wide">INFORMAÇÕES IMPORTANTÍSSIMAS SOBRE USO</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
           
           <div className="space-y-4">
              <p className="text-lg font-medium text-slate-900 dark:text-white">Olá Amigo(a)! Tudo bem?</p>
              <p>Seja bem-vindo(a) ao MELHOR app de arte no geral que existe. Aqui temos TODAS as maneiras de demonstrar arte. Você pode ser o próximo Michelangelo com o Artify — venha nos conhecer!</p>
              
              <p>Artify é um app MULTIFUNCIONAL para criação, organização e experimentação.
              Aqui você pode criar, calcular, analisar, anotar e explorar — TUDO no mesmo lugar.</p>
           </div>

           <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl p-4 flex gap-4 items-start">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
              <div>
                 <h3 className="text-red-600 dark:text-red-400 font-bold text-sm uppercase mb-1">Aviso Importante</h3>
                 <p className="text-red-500 dark:text-red-200/80 text-sm">O Artify foi criado para fins criativos, educacionais e experimentais.
                 Evite gerar conteúdos ofensivos, ilegais ou prejudiciais.</p>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-violet-500 pl-4">Guia COMPLETO de como se localizar no Artify</h3>
              <ul className="space-y-3">
                 {[
                   { text: "Precisa de ajuda com cálculos?", action: "Acesse a opção Math Labs" },
                   { text: "Quer uma edição COMPLETA de imagens de pessoas LINDAS como você?", action: "Acesse o Editor de Imagens" },
                   { text: "Usa de tudo sem se preocupar com bugs?", action: "Acesse a função Ferramentas" },
                   { text: "Quer imagens personalizadas no seu estilo com fallback inteligente?", action: "Acesse o Gerador de Imagens" },
                   { text: "Quer ver suas imagens lindas geradas ou editadas?", action: "Acesse a opção Galeria" },
                 ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                       <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />
                       <span className="text-sm">
                          {item.text} <span className="text-violet-600 dark:text-violet-300 font-semibold block mt-1">→ {item.action}</span>
                       </span>
                    </li>
                 ))}
              </ul>
           </div>

           <div className="text-center pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-violet-600 dark:text-violet-400 font-medium italic whitespace-pre-line">
                Muito obrigado pela sua atenção.{'\n'}Que D'us te abençoe sempre!
              </p>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl shrink-0">
           <Button onClick={onClose} className="w-full">Entendi, vamos começar!</Button>
        </div>

      </div>
    </div>
  );
};
