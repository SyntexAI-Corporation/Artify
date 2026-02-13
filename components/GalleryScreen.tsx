
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, X, Maximize, Globe, Image as ImageIcon } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { getGalleryImages, GalleryItem } from '../services/galleryService';
import { Button } from './ui/Button';

interface GalleryScreenProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
  onEdit: (imageUrl: string) => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack, language, toggleLanguage, onEdit }) => {
  const t = TRANSLATIONS[language];
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const items = await getGalleryImages();
      setImages(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (item: GalleryItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `artify-${item.type}-${item.timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
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

        <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-xl">
               <ImageIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.gallery}</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8 ml-1">{t.galleryDesc}</p>

        {/* Grid */}
        {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
            </div>
        ) : images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-20">
                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">{t.galleryEmpty}</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                {images.map((img) => (
                    <div 
                        key={img.id} 
                        onClick={() => setSelectedImage(img)}
                        className="group relative aspect-square bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 transition-all shadow-sm"
                    >
                        <img src={img.url} alt={img.prompt || "Artify Image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        
                        {/* Overlay - ensuring visibility on active for touch */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <p className="text-white text-xs font-medium truncate mb-2">{new Date(img.timestamp).toLocaleDateString()}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                                    {img.type}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Fullscreen Modal */}
        {selectedImage && (
            <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                <div className="flex justify-between items-center p-4 bg-slate-100/50 dark:bg-black/50">
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => {
                                onEdit(selectedImage.url);
                                setSelectedImage(null);
                            }}
                            className="text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <Maximize className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button 
                            onClick={() => handleDownload(selectedImage)}
                            className="text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-transparent">
                    <img 
                        src={selectedImage.url} 
                        alt="Full view" 
                        className="max-w-full max-h-full object-contain shadow-2xl"
                    />
                </div>
                
                <div className="p-6 bg-slate-100/50 dark:bg-black/50 text-center">
                    {selectedImage.prompt && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-2xl mx-auto italic">"{selectedImage.prompt}"</p>
                    )}
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        {new Date(selectedImage.timestamp).toLocaleString()} • {selectedImage.type.toUpperCase()}
                    </p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
