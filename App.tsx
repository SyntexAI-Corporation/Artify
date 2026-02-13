
import React, { useState, useEffect } from 'react';
import { PlanType, ArtStyle, AspectRatio, Language } from './types';
import { PLAN_DETAILS, TRANSLATIONS } from './constants';
import { generateImage } from './services/geminiService';
import { saveToGallery, urlToBase64 } from './services/galleryService';
import { Generator } from './components/Generator';
import { ImageResult } from './components/ImageResult';
import { TokenDisplay } from './components/TokenDisplay';
import { PhotoEditor } from './components/PhotoEditor';
import { ToolsScreen } from './components/ToolsScreen';
import { UnitConverter } from './components/UnitConverter';
import { ColorAnalyzer } from './components/ColorAnalyzer';
import { CurrencyConverter } from './components/CurrencyConverter';
import { MathLabsScreen } from './components/MathLabsScreen';
import { Calculator } from './components/Calculator';
import { BasicCalculator } from './components/BasicCalculator';
import { GalleryScreen } from './components/GalleryScreen';
import { NotesScreen } from './components/NotesScreen';
import { Sketchbook } from './components/Sketchbook';
import { InfoModal } from './components/InfoModal';
import { SettingsModal } from './components/SettingsModal';
import { FeatureInfoModal, FeatureInfoContent } from './components/FeatureInfoModal';
import { Palette, Globe, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft, Wrench, Calculator as CalculatorIcon, Images, Info, Settings } from 'lucide-react';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation (1s before completion)
    const exitTimer = setTimeout(() => setIsExiting(true), 1000);
    // Complete splash screen (Total duration 2s)
    const completeTimer = setTimeout(onComplete, 2000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`flex flex-col items-center transition-transform duration-1000 ${isExiting ? 'scale-110' : 'scale-100 animate-in zoom-in-50 fade-in duration-1000'}`}>
        <div className="relative mb-8 group">
           <div className="absolute inset-0 bg-violet-600/50 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-1000"></div>
           <div className="relative bg-gradient-to-br from-violet-600 to-fuchsia-600 p-8 rounded-[2rem] shadow-2xl shadow-violet-500/20">
             <Palette className="w-20 h-20 text-white" />
           </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-lg">
          Artify
        </h1>
        <p className="text-xl text-slate-400 font-medium tracking-wide">
          Artify – O seu app de artes
        </p>
      </div>
    </div>
  );
};

const FEATURE_CONTENT: Record<string, FeatureInfoContent> = {
  editor: {
    title: "Editor de Imagens",
    description: "Edite imagens de forma simples e poderosa.",
    features: ["Ajustes básicos e avançados", "Edição criativa", "Melhorias automáticas", "Experimentos visuais"]
  },
  generator: {
     title: "Gerador de Imagens",
     description: "Crie imagens personalizadas usando inteligência artificial.",
     features: ["Geração de imagens por texto", "Fallback inteligente entre provedores", "Estilos variados", "Resultados rápidos"]
  },
  tools: {
     title: "Ferramentas",
     description: "Ferramentas rápidas para tarefas do dia a dia.",
     features: ["Color Analyzer – analisar e extrair cores", "Conversor de Moedas", "Bloco de Notas", "Sketchbook - Desenho Livre"]
  },
  'math-labs': {
     title: "Math Labs",
     description: "Laboratório de matemática para cálculos e experimentos lógicos.",
     features: ["Calculadora", "Calculadora Científica", "Conversor de Unidades", "Ferramentas matemáticas"]
  },
  gallery: {
     title: "Galeria",
     description: "Visualize e gerencie suas imagens criadas no Artify.",
     features: ["Ver imagens em tela cheia", "Organização interna", "Excluir imagens", "Histórico visual"]
  },
  sketchbook: {
     title: "Sketchbook",
     description: "Ferramenta de desenho offline completa para expressão artística.",
     features: ["Modo Simples e Avançado", "Sistema de Camadas", "Estabilizador de Traço", "Simetria"]
  }
};

interface SelectionScreenProps {
  onSelect: (option: 'editor' | 'generator' | 'tools' | 'math-labs' | 'gallery') => void;
  language: Language;
  toggleLanguage: () => void;
  onOpenInfo: () => void;
  onOpenSettings: () => void;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ onSelect, language, toggleLanguage, onOpenInfo, onOpenSettings }) => {
  const t = TRANSLATIONS[language];
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [currentFeatureInfo, setCurrentFeatureInfo] = useState<FeatureInfoContent | null>(null);

  const openFeatureInfo = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setCurrentFeatureInfo(FEATURE_CONTENT[key]);
    setFeatureModalOpen(true);
  };

  const InfoButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-sm group-hover/btn:scale-110"
      title="Mais informações"
    >
      <Info className="w-5 h-5" />
    </button>
  );

  return (
    <>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-in fade-in duration-700 flex flex-col">
       {/* Simple Header */}
       <header className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-xl">
               <Palette className="w-5 h-5 text-white" />
             </div>
             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                {t.appTitle}
             </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300/50 dark:border-slate-700/50"
            >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-300/50 dark:border-slate-700/50"
              title={t.settings}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={onOpenInfo}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-300/50 dark:border-slate-700/50"
              title="Informações"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
       </header>

       <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Photo Editor Card - Enabled */}
          <div 
            onClick={() => onSelect('editor')}
            className="relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-indigo-500/20 min-h-[220px]"
          >
             <InfoButton onClick={(e) => openFeatureInfo(e, 'editor')} />
             <div className="absolute inset-0 bg-[#6C63FF] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <ImageIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.photoEditor}</h2>
                <p className="text-white/80 text-sm max-w-xs">{t.photoEditorDesc}</p>
             </div>
          </div>

          {/* AI Generator Card */}
          <div 
            onClick={() => onSelect('generator')}
            className="relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-orange-500/20 min-h-[220px]"
          >
             <InfoButton onClick={(e) => openFeatureInfo(e, 'generator')} />
             <div className="absolute inset-0 bg-[#FF6C63] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.aiGenerator}</h2>
                <p className="text-white/80 text-sm max-w-xs">{t.aiGeneratorDesc}</p>
             </div>
          </div>

          {/* Tools Card */}
          <div 
            onClick={() => onSelect('tools')}
            className="relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-teal-500/20 min-h-[220px]"
          >
             <InfoButton onClick={(e) => openFeatureInfo(e, 'tools')} />
             <div className="absolute inset-0 bg-[#06b6d4] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <Wrench className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.tools}</h2>
                <p className="text-white/80 text-sm max-w-xs">{t.toolsDesc}</p>
             </div>
          </div>

          {/* Math Labs Card */}
          <div 
            onClick={() => onSelect('math-labs')}
            className="relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-indigo-500/20 min-h-[220px]"
          >
             <InfoButton onClick={(e) => openFeatureInfo(e, 'math-labs')} />
             <div className="absolute inset-0 bg-[#6366f1] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <CalculatorIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.mathLabs}</h2>
                <p className="text-white/80 text-sm max-w-xs">{t.mathLabsDesc}</p>
             </div>
          </div>

          {/* Gallery Card */}
          <div 
            onClick={() => onSelect('gallery')}
            className="md:col-span-2 relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-purple-500/20 min-h-[220px]"
          >
             <InfoButton onClick={(e) => openFeatureInfo(e, 'gallery')} />
             <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
             
             {/* Use flex-col on mobile, flex-row on larger screens */}
             <div className="relative h-full flex flex-col sm:flex-row items-center sm:justify-between p-6 sm:p-10 text-white z-10 gap-6 sm:gap-0">
                <div className="flex flex-col text-center sm:text-left max-w-md">
                    <h2 className="text-3xl font-bold mb-3">{t.gallery}</h2>
                    <p className="text-white/80 text-lg">{t.galleryDesc}</p>
                    <div className="mt-6 flex items-center justify-center sm:justify-start text-sm font-bold uppercase tracking-wider bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors mx-auto sm:mx-0">
                        {t.viewGallery} <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                </div>
                <div className="p-6 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500 shadow-2xl shrink-0">
                   <Images className="w-12 h-12 text-white" />
                </div>
             </div>
          </div>

         </div>
       </main>
    </div>
    
    <FeatureInfoModal 
      isOpen={featureModalOpen}
      onClose={() => setFeatureModalOpen(false)}
      content={currentFeatureInfo}
    />
    </>
  );
};

type Screen = 'splash' | 'selection' | 'generator' | 'editor' | 'tools' | 'unit-converter' | 'color-analyzer' | 'currency-converter' | 'math-labs' | 'calculator' | 'basic-calculator' | 'gallery' | 'notes' | 'sketchbook';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [currentPlan] = useState<PlanType>(PlanType.BASIC);
  const [tokens] = useState(Infinity);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Sketchbook info modal state
  const [showSketchbookInfo, setShowSketchbookInfo] = useState(false);

  const t = TRANSLATIONS[language];

  // Auto-open info modal on first visit or based on settings
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('artify_settings') || '{}');
    const autoOpen = settings.autoOpenInfo ?? true;
    
    // Legacy check + new setting check
    if (autoOpen && screen === 'selection') {
        const hasVisited = localStorage.getItem('artify_info_seen_v1');
        // If "Always" or "First Time" logic required, we can adapt.
        // For now, respect legacy behavior + setting toggle.
        if (!hasVisited) {
            setShowInfo(true);
            localStorage.setItem('artify_info_seen_v1', 'true');
        } else if (settings.showTips === 'always') {
             // If setting is 'always', show it every time user lands on selection
             // But careful not to annoy on back navigation.
             // Maybe only on splash -> selection transition.
        }
    }
  }, [screen]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'pt' : 'en');
  };

  const handleGenerate = async (prompt: string, style: ArtStyle, image: File | null, aspectRatio: AspectRatio) => {
    // 1. Set Loading State
    setIsGenerating(true);
    // Clear previous image so loading screen is visible immediately
    setGeneratedImage(null);
    setError(null);
    
    // 2. Render Loading UI (Force wait)
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // 3. Start API Request
      const resultUrl = await generateImage({
        prompt,
        style,
        plan: currentPlan,
        referenceImage: image,
        aspectRatio,
      });

      // 4. Preload Image
      if (resultUrl) {
         await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); 
            img.src = resultUrl;
            setTimeout(resolve, 12000); 
         });

         // 5. Save to Internal Gallery (Auto add on generation)
         await saveToGallery({
            id: crypto.randomUUID(),
            url: resultUrl,
            type: 'generated',
            timestamp: Date.now(),
            prompt: prompt
         });
      }

      setGeneratedImage(resultUrl);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = () => {
    if (generatedImage) {
      setImageToEdit(generatedImage);
      setScreen('editor');
    }
  };

  const handleEditFromGallery = (url: string) => {
      setImageToEdit(url);
      setScreen('editor');
  };

  const GlobalSettingsModal = () => (
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        language={language}
        onOpenInfo={() => { setShowSettings(false); setShowInfo(true); }}
      />
  );

  if (screen === 'splash') {
    return <SplashScreen onComplete={() => setScreen('selection')} />;
  }

  if (screen === 'selection') {
    return (
      <>
        <SelectionScreen 
          onSelect={(option) => {
            if (option === 'generator') setScreen('generator');
            if (option === 'editor') setScreen('editor');
            if (option === 'tools') setScreen('tools');
            if (option === 'math-labs') setScreen('math-labs');
            if (option === 'gallery') setScreen('gallery');
          }} 
          language={language}
          toggleLanguage={toggleLanguage}
          onOpenInfo={() => setShowInfo(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
        <GlobalSettingsModal />
      </>
    );
  }

  if (screen === 'gallery') {
    return (
      <>
      <GalleryScreen 
        onBack={() => setScreen('selection')}
        language={language}
        toggleLanguage={toggleLanguage}
        onEdit={handleEditFromGallery}
      />
      <GlobalSettingsModal />
      </>
    );
  }

  if (screen === 'tools') {
    return (
      <>
      <ToolsScreen 
        onBack={() => setScreen('selection')}
        onSelectTool={(tool) => setScreen(tool as any)}
        language={language}
        toggleLanguage={toggleLanguage}
      />
      <GlobalSettingsModal />
      </>
    );
  }

  if (screen === 'math-labs') {
    return (
      <>
      <MathLabsScreen 
        onBack={() => setScreen('selection')}
        onSelectTool={(tool) => setScreen(tool as any)}
        language={language}
        toggleLanguage={toggleLanguage}
      />
      <GlobalSettingsModal />
      </>
    );
  }

  if (screen === 'calculator') {
    return (
      <Calculator 
        onBack={() => setScreen('math-labs')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'basic-calculator') {
    return (
      <BasicCalculator 
        onBack={() => setScreen('math-labs')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'unit-converter') {
    return (
      <UnitConverter 
        onBack={() => setScreen('math-labs')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'color-analyzer') {
    return (
      <ColorAnalyzer 
        onBack={() => setScreen('tools')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'currency-converter') {
    return (
      <CurrencyConverter 
        onBack={() => setScreen('tools')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'notes') {
    return (
      <NotesScreen 
        onBack={() => setScreen('tools')}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'sketchbook') {
    return (
      <>
        <Sketchbook 
          onBack={() => setScreen('tools')}
          language={language}
          toggleLanguage={toggleLanguage}
          onOpenInfo={() => setShowSketchbookInfo(true)}
        />
        <FeatureInfoModal 
          isOpen={showSketchbookInfo}
          onClose={() => setShowSketchbookInfo(false)}
          content={FEATURE_CONTENT['sketchbook']}
        />
      </>
    );
  }

  if (screen === 'editor') {
    return (
      <PhotoEditor 
        onBack={() => {
           setScreen('selection');
           setImageToEdit(null);
        }} 
        language={language} 
        toggleLanguage={toggleLanguage}
        initialImage={imageToEdit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 animate-in fade-in duration-700">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-xl">
               <Palette className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 hidden sm:block">
              {t.appTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide">
             {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300/50 dark:border-slate-700/50"
              title={language === 'en' ? "Mudar para Português" : "Switch to English"}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>

            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-300/50 dark:border-slate-700/50"
              title={t.settings}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Info Button */}
            <button 
              onClick={() => setShowInfo(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-300/50 dark:border-slate-700/50"
              title="Informações"
            >
              <Info className="w-5 h-5" />
            </button>

            <div className="hidden md:block">
               <TokenDisplay tokens={tokens} plan={currentPlan} language={language} />
            </div>
          </div>
        </div>
        
        {/* Mobile Token Display (Only visible on small screens) */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-4 py-2 flex justify-center">
            <TokenDisplay tokens={tokens} plan={currentPlan} language={language} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Generator Form */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <button 
                onClick={() => setScreen('selection')}
                className="mb-6 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center transition-colors group px-3 py-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 -ml-3 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                {t.back}
              </button>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.createArt}</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t.desc} <span className="text-violet-500 dark:text-violet-400 mx-1">Gemini AI</span>.
              </p>
            </div>

            <Generator 
              plan={currentPlan}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={true}
              language={language}
            />
            
            <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
               <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.currentPlan}: {PLAN_DETAILS[currentPlan].name}</h4>
               <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                 <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2"></span>
                    {t.resolution}: {PLAN_DETAILS[currentPlan].resolution}
                 </li>
                 <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2"></span>
                    {t.tokens}: {t.unlimited}
                 </li>
                 <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2"></span>
                    {t.model}: {PLAN_DETAILS[currentPlan].model}
                 </li>
               </ul>
            </div>
          </div>

          {/* Right Column: Result Display */}
          <div className="lg:col-span-7">
            <div className="sticky top-24">
              <ImageResult 
                imageUrl={generatedImage} 
                isLoading={isGenerating} 
                language={language} 
                error={error} 
                onEdit={handleEditImage}
              />
            </div>
          </div>

        </div>
      </main>
      
      <footer className="border-t border-slate-200 dark:border-slate-900 mt-auto py-8 text-center text-slate-500 dark:text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Syntex Inc. All rights reserved.</p>
      </footer>
      
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
      <GlobalSettingsModal />
    </div>
  );
};

export default App;
