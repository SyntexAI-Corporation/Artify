import React, { useState, useEffect } from 'react';
import { PlanType, ArtStyle, AspectRatio, Language } from './types';
import { PLAN_DETAILS, TRANSLATIONS } from './constants';
import { generateImage } from './services/geminiService';
import { Generator } from './components/Generator';
import { ImageResult } from './components/ImageResult';
import { TokenDisplay } from './components/TokenDisplay';
import { PlanSelector } from './components/PlanSelector';
import { PhotoEditor } from './components/PhotoEditor';
import { ToolsScreen } from './components/ToolsScreen';
import { UnitConverter } from './components/UnitConverter';
import { ColorAnalyzer } from './components/ColorAnalyzer';
import { CurrencyConverter } from './components/CurrencyConverter';
import { Palette, Globe, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft, Wrench } from 'lucide-react';

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

interface SelectionScreenProps {
  onSelect: (option: 'editor' | 'generator' | 'tools') => void;
  language: Language;
  toggleLanguage: () => void;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ onSelect, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 animate-in fade-in duration-700 flex flex-col">
       {/* Simple Header */}
       <header className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-xl">
               <Palette className="w-5 h-5 text-white" />
             </div>
             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {t.appTitle}
             </span>
          </div>
          <button 
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/50"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
          </button>
       </header>

       <main className="flex-1 flex flex-col xl:flex-row items-stretch justify-center p-6 gap-6 max-w-7xl mx-auto w-full">
          
          {/* Photo Editor Card - Enabled */}
          <div 
            onClick={() => onSelect('editor')}
            className="flex-1 relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-indigo-500/20 min-h-[200px]"
          >
             <div className="absolute inset-0 bg-[#6C63FF] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 md:p-6 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <ImageIcon className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.photoEditor}</h2>
                <p className="text-white/80 text-base md:text-lg max-w-xs">{t.photoEditorDesc}</p>
                <div className="mt-8 w-12 h-12 rounded-full bg-white text-[#6C63FF] flex items-center justify-center transform group-hover:translate-x-2 transition-transform">
                   <ArrowRight className="w-6 h-6" />
                </div>
             </div>
          </div>

          {/* AI Generator Card */}
          <div 
            onClick={() => onSelect('generator')}
            className="flex-1 relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-orange-500/20 min-h-[200px]"
          >
             <div className="absolute inset-0 bg-[#FF6C63] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 md:p-6 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <Sparkles className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.aiGenerator}</h2>
                <p className="text-white/80 text-base md:text-lg max-w-xs">{t.aiGeneratorDesc}</p>
                <div className="mt-8 w-12 h-12 rounded-full bg-white text-[#FF6C63] flex items-center justify-center transform group-hover:translate-x-2 transition-transform">
                   <ArrowRight className="w-6 h-6" />
                </div>
             </div>
          </div>

          {/* Tools Card */}
          <div 
            onClick={() => onSelect('tools')}
            className="flex-1 relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-teal-500/20 min-h-[200px]"
          >
             <div className="absolute inset-0 bg-[#06b6d4] opacity-90 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
             
             <div className="relative h-full flex flex-col items-center justify-center p-8 text-center text-white z-10">
                <div className="mb-6 p-4 md:p-6 bg-white/20 backdrop-blur-md rounded-full ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                   <Wrench className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.tools}</h2>
                <p className="text-white/80 text-base md:text-lg max-w-xs">{t.toolsDesc}</p>
                <div className="mt-8 w-12 h-12 rounded-full bg-white text-[#06b6d4] flex items-center justify-center transform group-hover:translate-x-2 transition-transform">
                   <ArrowRight className="w-6 h-6" />
                </div>
             </div>
          </div>

       </main>
    </div>
  );
};

type Screen = 'splash' | 'selection' | 'generator' | 'editor' | 'tools' | 'unit-converter' | 'color-analyzer' | 'currency-converter';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('splash');
  const [currentPlan, setCurrentPlan] = useState<PlanType>(PlanType.BASIC);
  const [tokens, setTokens] = useState(PLAN_DETAILS[PlanType.BASIC].dailyTokens as number);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  // Reset tokens if plan changes to Basic (simulation)
  useEffect(() => {
    if (currentPlan === PlanType.BASIC) {
      setTokens(50);
    }
  }, [currentPlan]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'pt' : 'en');
  };

  const handleGenerate = async (prompt: string, style: ArtStyle, image: File | null, aspectRatio: AspectRatio) => {
    const cost = PLAN_DETAILS[currentPlan].costPerImage;

    if (currentPlan === PlanType.BASIC && tokens < cost) {
      setError(t.insufficientTokens);
      return;
    }

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
      }

      setGeneratedImage(resultUrl);

      if (currentPlan === PlanType.BASIC) {
        setTokens((prev) => Math.max(0, prev - cost));
      }
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

  if (screen === 'splash') {
    return <SplashScreen onComplete={() => setScreen('selection')} />;
  }

  if (screen === 'selection') {
    return (
      <SelectionScreen 
        onSelect={(option) => {
          if (option === 'generator') setScreen('generator');
          if (option === 'editor') setScreen('editor');
          if (option === 'tools') setScreen('tools');
        }} 
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'tools') {
    return (
      <ToolsScreen 
        onBack={() => setScreen('selection')}
        onSelectTool={(tool) => setScreen(tool)}
        language={language}
        toggleLanguage={toggleLanguage}
      />
    );
  }

  if (screen === 'unit-converter') {
    return (
      <UnitConverter 
        onBack={() => setScreen('tools')}
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
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 animate-in fade-in duration-700">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 rounded-xl">
               <Palette className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
              {t.appTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide">
             {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700/50"
              title={language === 'en' ? "Mudar para Português" : "Switch to English"}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
            </button>

            <PlanSelector currentPlan={currentPlan} onSelectPlan={setCurrentPlan} language={language} />
            <div className="hidden md:block w-px h-6 bg-slate-800"></div>
            <div className="hidden md:block">
               <TokenDisplay tokens={tokens} plan={currentPlan} language={language} />
            </div>
          </div>
        </div>
        
        {/* Mobile Token Display (Only visible on small screens) */}
        <div className="md:hidden border-t border-slate-800 bg-slate-950/50 px-4 py-2 flex justify-center">
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
                className="mb-6 text-slate-400 hover:text-white text-sm font-medium flex items-center transition-colors group px-3 py-2 rounded-lg hover:bg-white/5 -ml-3 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                {t.back}
              </button>
              <h2 className="text-3xl font-bold text-white mb-2">{t.createArt}</h2>
              <p className="text-slate-400">
                {t.desc} <span className="text-violet-400 mx-1">Gemini AI</span>.
              </p>
            </div>

            <Generator 
              plan={currentPlan}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={currentPlan === PlanType.PLUS || tokens >= PLAN_DETAILS[PlanType.BASIC].costPerImage}
              language={language}
            />
            
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
               <h4 className="text-sm font-semibold text-slate-300 mb-2">{t.currentPlan}: {PLAN_DETAILS[currentPlan].name}</h4>
               <ul className="space-y-2 text-xs text-slate-400">
                 <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2"></span>
                    {t.resolution}: {PLAN_DETAILS[currentPlan].resolution}
                 </li>
                 <li className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2"></span>
                    {t.tokens}: {typeof PLAN_DETAILS[currentPlan].dailyTokens === 'number' ? `${PLAN_DETAILS[currentPlan].dailyTokens}/${t.day}` : t.unlimited}
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
      
      <footer className="border-t border-slate-900 mt-auto py-8 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Syntex Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;