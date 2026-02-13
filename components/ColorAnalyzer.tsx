
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, Image as ImageIcon, Copy, Check, Pause, Play, Upload, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './ui/Button';

interface ColorAnalyzerProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

interface ColorData {
  hex: string;
  rgb: string;
  hsl: string;
  cmyk: string;
  name: string;
}

// Basic closest color name finder logic
const COLOR_NAMES: { [key: string]: string } = {
  '#000000': 'Black', '#FFFFFF': 'White', '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue',
  '#FFFF00': 'Yellow', '#00FFFF': 'Cyan', '#FF00FF': 'Magenta', '#C0C0C0': 'Silver', '#808080': 'Gray',
  '#800000': 'Maroon', '#808000': 'Olive', '#008000': 'Dark Green', '#800080': 'Purple', '#008080': 'Teal',
  '#000080': 'Navy', '#FFA500': 'Orange', '#FFC0CB': 'Pink', '#4B0082': 'Indigo', '#F5F5DC': 'Beige',
};

const getColorName = (r: number, g: number, b: number) => {
  let minDist = Infinity;
  let closestName = 'Unknown';

  for (const [hex, name] of Object.entries(COLOR_NAMES)) {
    const cr = parseInt(hex.substring(1, 3), 16);
    const cg = parseInt(hex.substring(3, 5), 16);
    const cb = parseInt(hex.substring(5, 7), 16);
    const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closestName = name;
    }
  }
  return closestName;
};

const rgbToCmyk = (r: number, g: number, b: number) => {
  let c = 1 - (r / 255);
  let m = 1 - (g / 255);
  let y = 1 - (b / 255);
  let k = Math.min(c, Math.min(m, y));
  
  c = (c - k) / (1 - k);
  m = (m - k) / (1 - k);
  y = (y - k) / (1 - k);

  if (isNaN(c)) c = 0;
  if (isNaN(m)) m = 0;
  if (isNaN(y)) y = 0;
  if (isNaN(k)) k = 1;

  return `C${Math.round(c * 100)} M${Math.round(m * 100)} Y${Math.round(y * 100)} K${Math.round(k * 100)}`;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `H${Math.round(h * 360)}° S${Math.round(s * 100)}% L${Math.round(l * 100)}%`;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("").toUpperCase();
};

export const ColorAnalyzer: React.FC<ColorAnalyzerProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  const [mode, setMode] = useState<'camera' | 'image'>('image');
  const [colorData, setColorData] = useState<ColorData>({ hex: '#000000', rgb: '0, 0, 0', hsl: 'H0 S0 L0', cmyk: 'C0 M0 Y0 K100', name: 'Black' });
  const [isFrozen, setIsFrozen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>();
  const visualizerRef = useRef<HTMLDivElement>(null);

  // Camera Logic
  useEffect(() => {
    if (mode === 'camera') {
      setIsFrozen(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        analyzeFrame();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please allow permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Check if video is paused (frozen)
    if (videoRef.current.paused || videoRef.current.ended) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const x = Math.floor(canvas.width / 2);
      const y = Math.floor(canvas.height / 2);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      updateColor(pixel[0], pixel[1], pixel[2]);
    }
    
    requestRef.current = requestAnimationFrame(analyzeFrame);
  };

  const toggleFreeze = () => {
    if (!videoRef.current) return;

    if (isFrozen) {
      // Unfreeze
      videoRef.current.play()
        .then(() => {
          setIsFrozen(false);
          analyzeFrame(); // Restart loop
        })
        .catch(e => console.error("Error playing video:", e));
    } else {
      // Freeze
      videoRef.current.pause();
      setIsFrozen(true);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  };

  const updateColor = (r: number, g: number, b: number) => {
    setColorData({
      hex: rgbToHex(r, g, b),
      rgb: `${r}, ${g}, ${b}`,
      hsl: rgbToHsl(r, g, b),
      cmyk: rgbToCmyk(r, g, b),
      name: getColorName(r, g, b),
    });
  };

  // Image Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const img = new Image();
      img.src = URL.createObjectURL(e.target.files[0]);
      img.onload = () => {
        const canvas = imageCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            setHasImage(true);
          }
        }
      };
    }
  };

  const pickColorFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    // Check bounds
    if (
        clientX < rect.left || 
        clientX > rect.right || 
        clientY < rect.top || 
        clientY > rect.bottom
    ) return;

    // Update cursor position relative to the visualizer container for the loupe
    if (visualizerRef.current) {
        const visRect = visualizerRef.current.getBoundingClientRect();
        setCursorPos({
            x: clientX - visRect.left,
            y: clientY - visRect.top
        });
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      updateColor(pixel[0], pixel[1], pixel[2]);
    }
  };

  const handleInteractStart = (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      pickColorFromEvent(e);
  };

  const handleInteractMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (isDragging) {
          pickColorFromEvent(e);
      }
  };

  const handleInteractEnd = () => {
      setIsDragging(false);
      setCursorPos(null);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
            <button 
            onClick={onBack}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center transition-colors group w-fit"
            >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
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

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 dark:from-pink-400 dark:to-rose-400">
            {t.colorAnalyzer}
          </h1>
          <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setMode('camera')}
              className={`p-2 rounded-md transition-all ${mode === 'camera' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Camera className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMode('image')}
              className={`p-2 rounded-md transition-all ${mode === 'image' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizer Area */}
        <div 
            ref={visualizerRef}
            className="relative w-full aspect-[4/3] bg-slate-200 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-center touch-none"
        >
          
          {mode === 'camera' ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              {/* Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 border-2 border-white rounded-full shadow-md backdrop-blur-sm"></div>
                <div className="w-1 h-1 bg-rose-500 rounded-full absolute"></div>
              </div>
              <div className="absolute bottom-4 right-4">
                <Button 
                  onClick={toggleFreeze}
                  variant="secondary"
                  className={`backdrop-blur-md border-slate-700/50 hover:bg-black/70 transition-colors ${isFrozen ? 'bg-rose-500/80 text-white' : 'bg-black/50 text-white'}`}
                >
                  {isFrozen ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
              </div>
            </>
          ) : (
            <div 
                className="w-full h-full relative bg-[#f0f0f0] dark:bg-[#1a1a1a] flex items-center justify-center"
                onMouseDown={handleInteractStart}
                onMouseMove={handleInteractMove}
                onMouseUp={handleInteractEnd}
                onMouseLeave={handleInteractEnd}
                onTouchStart={handleInteractStart}
                onTouchMove={handleInteractMove}
                onTouchEnd={handleInteractEnd}
            >
              <canvas 
                ref={imageCanvasRef} 
                className={`max-w-full max-h-full object-contain ${hasImage ? 'cursor-crosshair' : ''}`}
              />
              
              {!hasImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                        className="text-center p-6 pointer-events-auto cursor-pointer rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors" 
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition shadow-lg">
                            <Upload className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{t.caPickImage}</p>
                        <p className="text-slate-500 dark:text-slate-600 text-sm mt-1">{t.caDragDrop}</p>
                    </div>
                </div>
              )}
              
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              
              {hasImage && (
                 <div className="absolute top-4 right-4 pointer-events-none">
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} variant="secondary" className="pointer-events-auto">
                       {t.changeImage}
                    </Button>
                 </div>
              )}
              
              {hasImage && !isDragging && (
                 <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none transition-opacity duration-300">
                    <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                       {t.caInstruction}
                    </span>
                 </div>
              )}

              {/* Loupe / Color Indicator */}
              {cursorPos && hasImage && (
                  <div 
                    className="absolute w-20 h-20 rounded-full border-4 border-white shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-12 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center"
                    style={{ left: cursorPos.x, top: cursorPos.y }}
                  >
                      <div className="absolute inset-0" style={{ backgroundColor: colorData.hex }}></div>
                      <div className="relative z-10 text-[10px] font-bold text-white mix-blend-difference font-mono">
                          {colorData.hex}
                      </div>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-6 mb-6">
              <div 
                className="w-24 h-24 rounded-2xl shadow-inner border border-slate-200 dark:border-white/10"
                style={{ backgroundColor: colorData.hex }}
              ></div>
              <div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{colorData.hex}</h2>
                 <p className="text-slate-500 dark:text-slate-400">{colorData.name}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(colorData).filter(([k]) => k !== 'name').map(([key, value]) => (
                 <div key={key} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <div>
                       <p className="text-xs font-bold text-slate-500 uppercase">{key}</p>
                       <p className="text-slate-900 dark:text-slate-200 font-mono">{value as string}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(value as string, key)}
                      className="text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors"
                    >
                       {copiedField === key ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};
