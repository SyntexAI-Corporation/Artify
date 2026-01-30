import React from 'react';
import { Download, Share2, AlertCircle, Edit } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './ui/Button';

interface ImageResultProps {
  imageUrl: string | null;
  isLoading: boolean;
  language: Language;
  error?: string | null;
  onEdit?: () => void;
}

export const ImageResult: React.FC<ImageResultProps> = ({ imageUrl, isLoading, language, error, onEdit }) => {
  const t = TRANSLATIONS[language];

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'artify_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image automatically. Opening in new tab.');
      window.open(imageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    // Select the currently displayed image from the DOM
    const imgElement = document.querySelector('#imageContainer img') as HTMLImageElement;
    const urlToShare = imgElement ? imgElement.src : imageUrl;

    if (!urlToShare) return;

    try {
      await navigator.clipboard.writeText(urlToShare);
      const msg = language === 'pt' ? 'Link da imagem copiado!' : 'Image link copied!';
      alert(msg);
    } catch (error) {
      console.error('Share failed:', error);
      const msg = language === 'pt' ? 'Falha ao copiar o link.' : 'Failed to copy link.';
      alert(msg);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full h-96 min-h-[260px] rounded-2xl flex flex-col items-center justify-center transition-all duration-300 bg-slate-900 border border-slate-800 overflow-hidden">
        
        {/* Loading Layer - Prioritized Overlay (z-10) */}
        {/* Renders immediately when isLoading is true, on top of everything else */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center justify-center gap-[12px]">
                <div className="relative">
                  {/* Spinner 44px as requested */}
                  <div className="w-[44px] h-[44px] border-[3px] border-slate-800 border-t-violet-500 rounded-full animate-spin"></div>
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
                </div>
                <p className="text-slate-300 text-center max-w-xs font-medium text-base opacity-85 shadow-black drop-shadow-md">
                  {t.loadingDesc}
                </p>
            </div>
          </div>
        )}

        {/* Error Layer */}
        {!isLoading && error && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 bg-red-950/10">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-red-200 mb-2">Generation Failed</h3>
            <p className="text-red-400 text-center max-w-xs text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Empty State Layer */}
        {!isLoading && !error && !imageUrl && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 bg-slate-900/50 border-dashed border-slate-800">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-300 mb-2">{t.readyToCreate}</h3>
            <p className="text-slate-500 text-center max-w-sm">
              {t.readyDesc}
            </p>
          </div>
        )}

        {/* Result Layer */}
        {!error && imageUrl && (
          <div id="imageContainer" className="group relative w-full h-full flex items-center justify-center bg-black">
            <img src={imageUrl} alt="Generated Art" className="w-full h-full object-contain" />
            
            {/* Overlay Actions (Hidden during loading) */}
            {!isLoading && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-end translate-y-2 group-hover:translate-y-0">
                <div>
                    <span className="inline-block px-2 py-1 bg-violet-600/80 rounded text-xs text-white backdrop-blur-sm mb-1">
                      {t.generatedWith}
                    </span>
                </div>
                <div className="flex space-x-3">
                  <button
                    id="downloadBtn"
                    onClick={handleDownload}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                    title={t.download}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                      id="shareBtn"
                      onClick={handleShare}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                      title={t.share}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Button */}
      {!isLoading && !error && imageUrl && onEdit && (
        <div className="w-full animate-in slide-in-from-bottom-2 fade-in">
          <Button 
            id="editGeneratedImageBtn"
            onClick={onEdit} 
            className="w-full shadow-xl shadow-violet-900/20"
            size="lg"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t.editImage}
          </Button>
        </div>
      )}
    </div>
  );
};