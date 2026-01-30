import React, { useState, useRef } from 'react';
import { ArtStyle, PlanType, AspectRatio, Language } from '../types';
import { STYLE_DETAILS, ASPECT_RATIOS, PLAN_DETAILS, TRANSLATIONS } from '../constants';
import { Button } from './ui/Button';
import { X, Image as ImageIcon, Wand2 } from 'lucide-react';

interface GeneratorProps {
  plan: PlanType;
  onGenerate: (prompt: string, style: ArtStyle, image: File | null, aspectRatio: AspectRatio) => Promise<void>;
  isGenerating: boolean;
  canGenerate: boolean;
  language: Language;
}

export const Generator: React.FC<GeneratorProps> = ({ plan, onGenerate, isGenerating, canGenerate, language }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ArtStyle.NONE);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setReferenceImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await onGenerate(prompt, selectedStyle, referenceImage, selectedRatio);
  };

  const cost = PLAN_DETAILS[plan].costPerImage;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt Input */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl opacity-30 group-focus-within:opacity-100 transition duration-500 blur"></div>
        <div className="relative bg-slate-900 rounded-2xl p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.promptPlaceholder}
            className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 resize-none h-32 text-lg"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-3">
             <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center text-xs text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg"
                  disabled={isGenerating}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {referenceImage ? t.changeImage : t.addReference}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
             </div>
             <div className="text-xs text-slate-500">
               {prompt.length}/500
             </div>
          </div>
        </div>
      </div>

      {/* Reference Image Preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <img src={imagePreview} alt="Reference" className="h-24 w-24 object-cover rounded-xl border border-slate-700" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Style Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">{t.styleLabel}</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(STYLE_DETAILS) as [ArtStyle, typeof STYLE_DETAILS[ArtStyle]][]).map(([key, style]) => {
            const Icon = style.icon;
            const isSelected = selectedStyle === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedStyle(key)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-violet-900/30 border-violet-500 text-white ring-1 ring-violet-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                }`}
                disabled={isGenerating}
              >
                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-fuchsia-400' : 'text-slate-500'}`} />
                <span className="text-sm font-medium">{t[key as ArtStyle]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">{t.ratioLabel}</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {ASPECT_RATIOS.map((ratio) => {
            const Icon = ratio.icon;
            const isSelected = selectedRatio === ratio.value;
            return (
              <button
                key={ratio.value}
                type="button"
                onClick={() => setSelectedRatio(ratio.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-violet-900/30 border-violet-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                disabled={isGenerating}
              >
                <Icon className="w-4 h-4" />
                <span>{t[ratio.value as unknown as keyof typeof t] || ratio.value}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Generate Button */}
      <div className="pt-4">
        <Button
          type="submit"
          className="w-full py-4 text-lg shadow-violet-500/25"
          isLoading={isGenerating}
          disabled={!canGenerate || !prompt.trim()}
        >
          {isGenerating ? t.generating : (
            <span className="flex items-center">
              <Wand2 className="w-5 h-5 mr-2" />
              {t.generate}
              {cost > 0 && <span className="ml-2 text-sm opacity-80 bg-black/20 px-2 py-0.5 rounded-full">-{cost} {t.tokens}</span>}
            </span>
          )}
        </Button>
        {!canGenerate && (
          <p className="text-red-400 text-center mt-2 text-sm">
            {t.insufficientTokens}
          </p>
        )}
      </div>
    </form>
  );
};