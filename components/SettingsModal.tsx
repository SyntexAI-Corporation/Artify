
import React, { useState, useEffect } from 'react';
import { X, Settings, Moon, Sun, Monitor, Trash2, RefreshCw, Info, Check, ChevronRight, AlertTriangle, Palette } from 'lucide-react';
import { Button } from './ui/Button';
import { clearGallery } from '../services/galleryService';
import { clearNotes } from '../services/notesService';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onOpenInfo: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language, onOpenInfo }) => {
  const t = TRANSLATIONS[language];
  const [confirmAction, setConfirmAction] = useState<{ type: string; action: () => Promise<void> } | null>(null);
  
  // Settings State
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const loaded = localStorage.getItem('artify_settings');
    if (loaded) {
      const parsed = JSON.parse(loaded);
      setTheme(parsed.theme || 'system');
    }
  }, []);

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      root.classList.remove('dark', 'light');
      
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const saveSetting = (key: string, value: any) => {
    const current = JSON.parse(localStorage.getItem('artify_settings') || '{}');
    const updated = { ...current, [key]: value };
    localStorage.setItem('artify_settings', JSON.stringify(updated));
  };

  const handleThemeChange = (val: string) => { setTheme(val); saveSetting('theme', val); };

  const handleAction = async (type: string) => {
    if (type === 'cache') {
        localStorage.removeItem('currency_rates');
        localStorage.removeItem('artify_info_seen_v1');
    }
    if (type === 'gallery') await clearGallery();
    if (type === 'notes') await clearNotes();
    
    setConfirmAction(null);
    alert(t.settingsSuccess);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {confirmAction ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.settingsConfirmTitle}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{t.settingsConfirmDesc}</p>
              <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setConfirmAction(null)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">{t.settingsCancel}</Button>
                  <Button onClick={() => handleAction(confirmAction.type)} className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none">{t.settingsConfirm}</Button>
              </div>
          </div>
      ) : (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">{t.settings}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
           
           {/* Appearance */}
           <section className="space-y-4">
               <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest px-1">{t.settingsAppearance}</h3>
               <div className="space-y-3">
                   {/* Theme */}
                   <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 flex flex-col gap-3">
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.settingsTheme}</span>
                       <div className="grid grid-cols-3 gap-2">
                           {[
                               { id: 'light', icon: Sun, label: t.settingsThemeLight },
                               { id: 'dark', icon: Moon, label: t.settingsThemeDark },
                               { id: 'system', icon: Monitor, label: t.settingsThemeSystem },
                           ].map(opt => (
                               <button 
                                key={opt.id}
                                onClick={() => handleThemeChange(opt.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                    theme === opt.id 
                                    ? 'bg-violet-100 dark:bg-violet-600/20 border-violet-500 dark:border-violet-500/50 text-violet-700 dark:text-white shadow-sm' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                               >
                                   <opt.icon className="w-5 h-5 mb-1.5" />
                                   <span className="text-xs font-medium">{opt.label}</span>
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
           </section>

           {/* Data & Storage */}
           <section className="space-y-4">
               <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest px-1">{t.settingsData}</h3>
               <div className="space-y-3">
                   {[
                       { id: 'cache', label: t.settingsClearCache, icon: RefreshCw, color: 'text-slate-500 dark:text-slate-400' },
                       { id: 'gallery', label: t.settingsClearGallery, icon: Trash2, color: 'text-slate-500 dark:text-slate-400' },
                       { id: 'notes', label: t.settingsClearNotes, icon: Trash2, color: 'text-slate-500 dark:text-slate-400' },
                   ].map(item => (
                       <button 
                        key={item.id}
                        onClick={() => setConfirmAction({ type: item.id, action: async () => {} })}
                        className={`w-full bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group`}
                       >
                           <div className="flex items-center gap-3">
                               <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 group-hover:border-violet-300 dark:group-hover:border-violet-700 transition-colors">
                                   <item.icon className={`w-5 h-5 ${item.color}`} />
                               </div>
                               <span className={`text-sm font-medium text-slate-700 dark:text-slate-300`}>{item.label}</span>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" />
                       </button>
                   ))}
               </div>
           </section>

           {/* About */}
           <section className="space-y-4">
               <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest px-1">{t.settingsAbout}</h3>
               <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800/50 text-center">
                   <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-violet-500/20">
                       <Palette className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Artify</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">{t.settingsVersion}</p>
                   <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-line leading-relaxed max-w-sm mx-auto">{t.settingsAboutText}</p>
                   
                   <Button 
                    onClick={() => { onClose(); onOpenInfo(); }} 
                    variant="secondary" 
                    className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                   >
                       <Info className="w-4 h-4 mr-2" />
                       {t.settingsUsageInfo}
                   </Button>
               </div>
           </section>

        </div>
      </div>
      )}
    </div>
  );
};
