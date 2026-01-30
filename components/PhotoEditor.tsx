import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Adjustments, Transform, DrawingPath, Language, EditorTool, Layer, AspectRatio, ArtStyle, PlanType } from '../types';
import { TRANSLATIONS, ASPECT_RATIOS } from '../constants';
import { generateImage } from '../services/geminiService';
import { 
  ArrowLeft, Download, RotateCw, FlipHorizontal, FlipVertical, 
  Sliders, Image as ImageIcon, Wand2, PenTool, Undo, Redo, 
  Type, Smile, Layers, Plus, Trash2, Maximize, Check, X, Upload, MoreHorizontal,
  ZoomIn, ZoomOut, Move, Sparkles, MousePointer2, ImagePlus, Globe, Scan, Loader2, Brush
} from 'lucide-react';
import { Button } from './ui/Button';

interface PhotoEditorProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
  initialImage?: string | null;
}

interface HistoryState {
  layers: Layer[];
  canvasSize: { width: number; height: number };
}

type EditorMode = 'manual' | 'ai' | null;

type ExtendedEditorTool = EditorTool | 'ai_object' | 'ai_enhance' | 'ai_brush' | 'ai_tools';

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
  sepia: 0,
};

const STICKERS = ["😀", "😍", "😎", "🔥", "✨", "❤️", "🎉", "🌈", "🐱", "🐶", "🍕", "🚀", "💡", "💯"];

const removeWhiteBackground = (imgSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imgSrc); return; }
      
      try {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // BFS Flood Fill to remove background starting from corners
        // This preserves internal white pixels ("textures") that are not connected to the border
        const queue: number[] = [];
        const visited = new Uint8Array(width * height);
        
        // Add corners to queue
        const corners = [0, width - 1, (height - 1) * width, width * height - 1];
        for (const c of corners) {
           if (c >= 0 && c < width * height) queue.push(c);
        }

        const threshold = 230; // White threshold

        let head = 0;
        while(head < queue.length) {
            const idx = queue[head++];
            if (visited[idx]) continue;
            visited[idx] = 1;

            const r = data[idx * 4];
            const g = data[idx * 4 + 1];
            const b = data[idx * 4 + 2];

            // If pixel is white-ish
            if (r > threshold && g > threshold && b > threshold) {
                data[idx * 4 + 3] = 0; // Set transparent

                const x = idx % width;
                const y = Math.floor(idx / width);

                if (x > 0) queue.push(idx - 1);
                if (x < width - 1) queue.push(idx + 1);
                if (y > 0) queue.push(idx - width);
                if (y < height - 1) queue.push(idx + width);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      } catch (e) {
        console.warn("Background removal failed (likely CORS)", e);
        resolve(imgSrc);
      }
    };
    img.onerror = () => resolve(imgSrc);
    img.src = imgSrc;
  });
};

export const PhotoEditor: React.FC<PhotoEditorProps> = ({ onBack, language, toggleLanguage, initialImage }) => {
  const t = TRANSLATIONS[language];
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  
  const [activeTool, setActiveTool] = useState<ExtendedEditorTool>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6C63FF');
  const [brushSize, setBrushSize] = useState(5);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [newText, setNewText] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  const [aiMaskOperations, setAiMaskOperations] = useState<{ type: 'add' | 'subtract', points: {x: number, y: number}[], size: number }[]>([]);
  const [aiActivePath, setAiActivePath] = useState<{x: number, y: number}[]>([]);
  
  const [aiBrushSize, setAiBrushSize] = useState(30);
  const [aiStrength, setAiStrength] = useState(0.6);
  const [isAiProcessingBrush, setIsAiProcessingBrush] = useState(false);
  
  const [cropRect, setCropRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  const isDraggingRef = useRef(false);
  const cropDragRef = useRef<{ 
    startX: number; 
    startY: number; 
    startRect: { x: number, y: number, width: number, height: number };
    handle: string | null; 
  } | null>(null);

  const uuid = () => Math.random().toString(36).substr(2, 9);

  // Initialize with passed image if available
  useEffect(() => {
    if (initialImage && layers.length === 0) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = initialImage;
      img.onload = () => {
         const size = { width: img.width, height: img.height };
         setCanvasSize(size);
         
         const bgLayer: Layer = {
           id: 'background',
           type: 'image',
           x: 0,
           y: 0,
           width: img.width,
           height: img.height,
           rotation: 0,
           scale: 1,
           visible: true,
           content: initialImage,
           style: { filter: { ...DEFAULT_ADJUSTMENTS } }
         };
         
         const initialLayers = [bgLayer];
         setLayers(initialLayers);
         setHistory([{ layers: initialLayers, canvasSize: size }]);
         setHistoryIndex(0);
      };
    }
  }, [initialImage]);

  useEffect(() => {
    if (activeTool === 'crop') {
      setCropRect({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height });
    } else {
      setCropRect(null);
    }
  }, [activeTool, canvasSize]);

  useEffect(() => {
    if (editorMode !== 'ai') {
      setAiMaskOperations([]);
      setAiActivePath([]);
    }
  }, [editorMode]);

  const saveHistory = (newLayers: Layer[], newSize = canvasSize) => {
    if (historyIndex >= 0 && history[historyIndex]) {
       const current = history[historyIndex];
       if (current.layers === newLayers && 
           current.canvasSize.width === newSize.width && 
           current.canvasSize.height === newSize.height) {
          return;
       }
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ layers: newLayers, canvasSize: newSize });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setHistoryIndex(prevIndex);
      setLayers(prevState.layers);
      setCanvasSize(prevState.canvasSize);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setLayers(nextState.layers);
      setCanvasSize(nextState.canvasSize);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.src = event.target.result as string;
          img.onload = () => {
             const size = { width: img.width, height: img.height };
             setCanvasSize(size);
             
             const bgLayer: Layer = {
               id: 'background',
               type: 'image',
               x: 0,
               y: 0,
               width: img.width,
               height: img.height,
               rotation: 0,
               scale: 1,
               visible: true,
               content: event.target?.result as string,
               style: { filter: { ...DEFAULT_ADJUSTMENTS } }
             };
             
             const initialLayers = [bgLayer];
             setLayers(initialLayers);
             setHistory([{ layers: initialLayers, canvasSize: size }]);
             setHistoryIndex(0);
             setActiveTool(editorMode === 'manual' ? 'adjust' : null);
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.src = event.target.result as string;
          img.onload = () => {
             const newLayer: Layer = {
               id: uuid(),
               type: 'image',
               x: canvasSize.width / 2 - img.width / 4,
               y: canvasSize.height / 2 - img.height / 4,
               width: img.width / 2,
               height: img.height / 2,
               rotation: 0,
               scale: 1,
               visible: true,
               content: event.target?.result as string,
               style: { filter: { ...DEFAULT_ADJUSTMENTS } }
             };
             const newLayers = [...layers, newLayer];
             setLayers(newLayers);
             saveHistory(newLayers);
             setSelectedLayerId(newLayer.id);
             if (editorMode === 'manual') setActiveTool('adjust');
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextLayer = () => {
    if (!newText.trim()) return;
    const ctx = canvasRef.current?.getContext('2d');
    ctx!.font = "40px sans-serif";
    const textWidth = ctx!.measureText(newText).width;
    
    const layer: Layer = {
      id: uuid(),
      type: 'text',
      x: (canvasSize.width - textWidth) / 2,
      y: canvasSize.height / 2,
      width: textWidth,
      height: 40,
      rotation: 0,
      scale: 1,
      visible: true,
      content: newText,
      style: { color: brushColor, fontSize: 40, fontFamily: 'Arial' }
    };
    const newLayers = [...layers, layer];
    setLayers(newLayers);
    saveHistory(newLayers);
    setSelectedLayerId(layer.id);
    setNewText("");
  };

  const addStickerLayer = (sticker: string) => {
    const layer: Layer = {
      id: uuid(),
      type: 'sticker',
      x: canvasSize.width / 2 - 25,
      y: canvasSize.height / 2 - 25,
      width: 50,
      height: 50,
      rotation: 0,
      scale: 2,
      visible: true,
      content: sticker
    };
    const newLayers = [...layers, layer];
    setLayers(newLayers);
    saveHistory(newLayers);
    setSelectedLayerId(layer.id);
  };

  const handleAiGenerateSticker = async () => {
      if (!aiPrompt.trim()) return;
      setIsAiGenerating(true);
      try {
          const prompt = `${aiPrompt}, isolated on white background, sticker style, high quality, vector art`;
          const url = await generateImage({
              prompt: prompt,
              style: ArtStyle.CARTOON,
              plan: PlanType.BASIC,
              aspectRatio: AspectRatio.SQUARE
          });
          const processedUrl = await removeWhiteBackground(url);
          const img = new Image();
          img.onload = () => {
               const newLayer: Layer = {
                 id: uuid(),
                 type: 'image',
                 x: canvasSize.width / 2 - 128,
                 y: canvasSize.height / 2 - 128,
                 width: 256,
                 height: 256,
                 rotation: 0,
                 scale: 1,
                 visible: true,
                 content: processedUrl,
                 style: { filter: { ...DEFAULT_ADJUSTMENTS } }
               };
               const newLayers = [...layers, newLayer];
               setLayers(newLayers);
               saveHistory(newLayers);
               setSelectedLayerId(newLayer.id);
               setAiPrompt("");
          };
          img.src = processedUrl;
      } catch (error) {
          console.error("Failed to generate AI sticker", error);
          alert("Failed to generate object. Please try again.");
      } finally {
          setIsAiGenerating(false);
      }
  };

  const handleAiEnhance = () => {
      if (selectedLayerId) {
          updateSelectedLayer({ brightness: 110, contrast: 115, saturation: 110 }, true);
      } else {
          updateBackgroundLayer({ brightness: 110, contrast: 115, saturation: 110 }, true);
      }
      alert(t.aiSuccessEnhance);
  };

  const handleAiBrushApply = async () => {
    if (aiMaskOperations.length === 0) {
      alert(t.aiImproveNoMask);
      return;
    }

    const targetId = selectedLayerId || (layers.find(l => l.id === 'background') ? 'background' : null);
    if (!targetId) return;

    const layer = layers.find(l => l.id === targetId);
    if (!layer || layer.type !== 'image') {
      alert("Target layer must be an image.");
      return;
    }

    setIsAiProcessingBrush(true);

    try {
       await new Promise(resolve => setTimeout(resolve, 2000));

       const offCanvas = document.createElement('canvas');
       offCanvas.width = layer.width;
       offCanvas.height = layer.height;
       const offCtx = offCanvas.getContext('2d');
       if (!offCtx) throw new Error("Could not get context");

       const img = new Image();
       img.src = layer.content as string;
       await new Promise<void>((resolve) => {
         if (img.complete) resolve();
         else img.onload = () => resolve();
       });

       offCtx.drawImage(img, 0, 0, layer.width, layer.height);
       
       const enhancedCanvas = document.createElement('canvas');
       enhancedCanvas.width = layer.width;
       enhancedCanvas.height = layer.height;
       const enhancedCtx = enhancedCanvas.getContext('2d');
       if (!enhancedCtx) throw new Error("Could not get context");
       
       const s = aiStrength; 
       const contrast = 100 + (30 * s);
       const saturate = 100 + (20 * s);
       const brightness = 100 + (10 * s);
       
       enhancedCtx.filter = `contrast(${contrast}%) saturate(${saturate}%) brightness(${brightness}%) drop-shadow(0 0 1px rgba(0,0,0,0.5))`;
       enhancedCtx.drawImage(offCanvas, 0, 0);

       const maskCanvas = document.createElement('canvas');
       maskCanvas.width = layer.width;
       maskCanvas.height = layer.height;
       const maskCtx = maskCanvas.getContext('2d');
       if (!maskCtx) throw new Error("Could not get mask context");

       maskCtx.lineCap = 'round';
       maskCtx.lineJoin = 'round';
       
       // Replay Operations
       aiMaskOperations.forEach(op => {
         if (op.points.length < 1) return;
         // Since eraser is removed, we only handle 'add' / 'source-over'
         maskCtx.globalCompositeOperation = 'source-over';
         maskCtx.strokeStyle = 'white'; 
         maskCtx.lineWidth = op.size / layer.scale;
         maskCtx.beginPath();
         maskCtx.moveTo((op.points[0].x - layer.x) / layer.scale, (op.points[0].y - layer.y) / layer.scale);
         for (let i = 1; i < op.points.length; i++) {
           maskCtx.lineTo((op.points[i].x - layer.x) / layer.scale, (op.points[i].y - layer.y) / layer.scale);
         }
         maskCtx.stroke();
       });

       const compositeCanvas = document.createElement('canvas');
       compositeCanvas.width = layer.width;
       compositeCanvas.height = layer.height;
       const compCtx = compositeCanvas.getContext('2d');
       if(!compCtx) throw new Error("Context error");

       compCtx.drawImage(enhancedCanvas, 0, 0);
       compCtx.globalCompositeOperation = 'destination-in';
       compCtx.drawImage(maskCanvas, 0, 0);
       
       offCtx.globalCompositeOperation = 'source-over';
       offCtx.drawImage(compositeCanvas, 0, 0);

       const newContent = offCanvas.toDataURL();
       const newLayers = layers.map(l => l.id === layer.id ? { ...l, content: newContent } : l);
       setLayers(newLayers);
       saveHistory(newLayers);
       
       setAiMaskOperations([]);
       setAiActivePath([]);
       alert(t.aiImproveSuccess);

    } catch (e) {
      console.error(e);
      alert(t.aiImproveFail);
    } finally {
      setIsAiProcessingBrush(false);
    }
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
       canvas.width = canvasSize.width;
       canvas.height = canvasSize.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale, layer.scale);
      ctx.translate(-centerX, -centerY);

      if (layer.type === 'image') {
        const src = layer.content as string;
        let img = imageCache.current[src];
        if (!img) {
            img = new Image();
            img.src = src;
            imageCache.current[src] = img;
        }
        if (layer.style?.filter) {
           const f = layer.style.filter;
           ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) hue-rotate(${f.hue}deg) sepia(${f.sepia}%)`;
        }
        if (img.complete) {
            ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
        } else {
            img.onload = () => ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
        }
      } else if (layer.type === 'text') {
        ctx.font = `${layer.style?.fontSize}px ${layer.style?.fontFamily || 'Arial'}`;
        ctx.fillStyle = layer.style?.color || '#ffffff';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(layer.content as string, layer.x, layer.y);
      } else if (layer.type === 'sticker') {
        ctx.font = `${layer.width}px Arial`; 
        ctx.textBaseline = 'top';
        ctx.fillText(layer.content as string, layer.x, layer.y);
      } else if (layer.type === 'drawing') {
         const path = layer.content as DrawingPath;
         if (path.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
               ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.stroke();
         }
      }
      ctx.restore();

      if (selectedLayerId === layer.id && activeTool !== 'draw' && activeTool !== 'crop' && activeTool !== 'ai_brush') {
         ctx.save();
         ctx.strokeStyle = editorMode === 'ai' ? '#A78BFA' : '#6C63FF';
         ctx.lineWidth = 2;
         ctx.setLineDash([5, 5]);
         ctx.strokeRect(layer.x - 2, layer.y - 2, layer.width * layer.scale + 4, layer.height * layer.scale + 4);
         ctx.restore();
      }
    });

    if (isDrawing && currentPath.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
           ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.stroke();
    }

    // AI MASK RENDERING - REDESIGNED
    if (editorMode === 'ai' && (aiMaskOperations.length > 0 || aiActivePath.length > 0)) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        
        if (maskCtx) {
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            
            // Draw Persistent Mask (Opaque)
            aiMaskOperations.forEach(op => {
               if(op.points.length < 1) return;
               maskCtx.globalCompositeOperation = op.type === 'add' ? 'source-over' : 'destination-out';
               maskCtx.strokeStyle = op.type === 'add' ? '#00B4FF' : '#000000';
               maskCtx.lineWidth = op.size;
               maskCtx.beginPath();
               maskCtx.moveTo(op.points[0].x, op.points[0].y);
               for(let i=1; i<op.points.length; i++) maskCtx.lineTo(op.points[i].x, op.points[i].y);
               maskCtx.stroke();
            });

            // Draw Active Stroke
            if (aiActivePath.length > 0 && activeTool === 'ai_brush') {
               maskCtx.globalCompositeOperation = 'source-over';
               maskCtx.strokeStyle = '#00B4FF';
               maskCtx.lineWidth = aiBrushSize;
               maskCtx.beginPath();
               maskCtx.moveTo(aiActivePath[0].x, aiActivePath[0].y);
               for(let i=1; i<aiActivePath.length; i++) maskCtx.lineTo(aiActivePath[i].x, aiActivePath[i].y);
               maskCtx.stroke();
            }
            
            // Composite Mask to Main Canvas with Transparency
            ctx.save();
            ctx.globalAlpha = 0.35; // Uniform transparency for the entire mask
            ctx.drawImage(maskCanvas, 0, 0);
            ctx.restore();
        }
    }

  }, [layers, selectedLayerId, isDrawing, currentPath, brushColor, brushSize, canvasSize, activeTool, editorMode, aiMaskOperations, aiActivePath, aiBrushSize]);

  useEffect(() => {
     renderCanvas();
  }, [renderCanvas]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAiProcessingBrush) return;

    if (activeTool === 'ai_brush') {
       setIsDrawing(true);
       const coords = getCanvasCoordinates(e);
       setAiActivePath([coords]);
       return;
    }

    if (activeTool === 'crop') return;

    if (activeTool === 'draw') {
       setIsDrawing(true);
       const coords = getCanvasCoordinates(e);
       setCurrentPath([coords]);
       return;
    }

    const coords = getCanvasCoordinates(e);
    for (let i = layers.length - 1; i >= 0; i--) {
       const layer = layers[i];
       if (!layer.visible) continue;
       if (layer.id === 'background') continue; 

       const right = layer.x + layer.width * layer.scale;
       const bottom = layer.y + layer.height * layer.scale;
       
       if (coords.x >= layer.x && coords.x <= right && coords.y >= layer.y && coords.y <= bottom) {
          setSelectedLayerId(layer.id);
          dragStartRef.current = coords;
          if (editorMode === 'manual' && activeTool !== 'adjust') {
              setActiveTool('adjust');
          }
          return; 
       }
    }
    setSelectedLayerId(null);
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
     if (activeTool === 'crop') {
        handleCropPointerMove(e);
        return;
     }

     const coords = getCanvasCoordinates(e);
     
     if (activeTool === 'ai_brush' && isDrawing) {
        setAiActivePath(prev => [...prev, coords]);
        return;
     }

     if (activeTool === 'draw' && isDrawing) {
        setCurrentPath(prev => [...prev, coords]);
        return;
     }

     if (selectedLayerId && dragStartRef.current) {
        const dx = coords.x - dragStartRef.current.x;
        const dy = coords.y - dragStartRef.current.y;
        isDraggingRef.current = true;
        setLayers(prev => prev.map(l => {
           if (l.id === selectedLayerId) {
              return { ...l, x: l.x + dx, y: l.y + dy };
           }
           return l;
        }));
        dragStartRef.current = coords; 
     }
  };

  const handleDragEnd = () => {
     if (activeTool === 'crop') {
         cropDragRef.current = null;
         return;
     }

     setIsDrawing(false);
     
     if (activeTool === 'ai_brush' && aiActivePath.length > 0) {
        setAiMaskOperations(prev => [...prev, { type: 'add', points: aiActivePath, size: aiBrushSize }]);
        setAiActivePath([]);
        return;
     }

     if (currentPath.length > 0 && activeTool === 'draw') {
         const layer: Layer = {
             id: uuid(),
             type: 'drawing',
             x: 0, y: 0, width: canvasSize.width, height: canvasSize.height,
             rotation: 0, scale: 1, visible: true,
             content: { points: currentPath, color: brushColor, size: brushSize },
         };
         const newLayers = [...layers, layer];
         setLayers(newLayers);
         saveHistory(newLayers);
         setCurrentPath([]);
     } else if (isDraggingRef.current) {
        saveHistory(layers);
        isDraggingRef.current = false;
     }
     
     dragStartRef.current = null;
  };

  const handleCropPointerDown = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!cropRect) return;

    cropDragRef.current = {
       startX: e.clientX,
       startY: e.clientY,
       startRect: { ...cropRect },
       handle
    };
  };

  const handleCropPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!cropDragRef.current || !cropRect) return;

      let clientX, clientY;
      if ('touches' in e) {
         clientX = e.touches[0].clientX;
         clientY = e.touches[0].clientY;
      } else {
         clientX = (e as React.MouseEvent).clientX;
         clientY = (e as React.MouseEvent).clientY;
      }

      const deltaX = (clientX - cropDragRef.current.startX) / zoomLevel;
      const deltaY = (clientY - cropDragRef.current.startY) / zoomLevel;

      const { startRect, handle } = cropDragRef.current;
      let newRect = { ...startRect };

      if (handle === 'move') {
          newRect.x += deltaX;
          newRect.y += deltaY;
      } else {
          if (handle.includes('l')) {
              newRect.x += deltaX;
              newRect.width -= deltaX;
          }
          if (handle.includes('r')) {
              newRect.width += deltaX;
          }
          if (handle.includes('t')) {
              newRect.y += deltaY;
              newRect.height -= deltaY;
          }
          if (handle.includes('b')) {
              newRect.height += deltaY;
          }
      }

      if (newRect.width < 50) newRect.width = 50;
      if (newRect.height < 50) newRect.height = 50;

      if (newRect.x < 0) newRect.x = 0;
      if (newRect.y < 0) newRect.y = 0;
      if (newRect.x + newRect.width > canvasSize.width) newRect.width = canvasSize.width - newRect.x;
      if (newRect.y + newRect.height > canvasSize.height) newRect.height = canvasSize.height - newRect.y;

      setCropRect(newRect);
  };

  const applyCrop = () => {
    if (!cropRect) return;
    setCanvasSize({ width: Math.round(cropRect.width), height: Math.round(cropRect.height) });
    const newLayers = layers.map(l => ({
        ...l,
        x: l.x - cropRect.x,
        y: l.y - cropRect.y
    }));
    setLayers(newLayers);
    saveHistory(newLayers, { width: Math.round(cropRect.width), height: Math.round(cropRect.height) });
    setActiveTool(null);
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const updateSelectedLayer = (updates: Partial<Layer> | Partial<Adjustments>, save = false) => {
    if (!selectedLayerId) return;
    const newLayers = layers.map(l => {
       if (l.id === selectedLayerId) {
          if ('brightness' in updates || 'contrast' in updates || 'saturation' in updates || 'blur' in updates || 'hue' in updates || 'sepia' in updates) { 
             return { ...l, style: { ...l.style, filter: { ...l.style?.filter, ...updates as Adjustments } } };
          }
          return { ...l, ...updates };
       }
       return l;
    });
    setLayers(newLayers);
    if (save) saveHistory(newLayers);
  };
  
  const updateBackgroundLayer = (updates: Partial<Adjustments>, save = false) => {
    const newLayers = layers.map(l => 
        l.id === 'background' ? { ...l, style: { ...l.style, filter: { ...l.style?.filter, ...updates } as Adjustments } } : l
    );
    setLayers(newLayers);
    if (save) saveHistory(newLayers);
  };

  const deleteSelectedLayer = () => {
    if (selectedLayerId && selectedLayerId !== 'background') {
      const newLayers = layers.filter(l => l.id !== selectedLayerId);
      setLayers(newLayers);
      saveHistory(newLayers);
      setSelectedLayerId(null);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `artify-edit-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const getSelectedLayer = () => layers.find(l => l.id === selectedLayerId);

  const renderToolPanel = () => {
     const selected = getSelectedLayer();
     
     switch(activeTool) {
        case 'ai_object':
            return (
                <div className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto">
                    <h3 className="text-sm font-medium text-violet-300 uppercase tracking-wide">{t.aiTitleGenerate}</h3>
                    <div className="bg-violet-900/20 p-3 rounded-xl border border-violet-500/30">
                        <label className="text-xs text-slate-300 mb-2 block font-medium">{t.aiLabelSticker}</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder={t.aiPromptPlaceholder}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-violet-500 outline-none"
                            />
                            <Button 
                                size="sm" 
                                onClick={handleAiGenerateSticker}
                                isLoading={isAiGenerating}
                            >
                                {isAiGenerating ? <span className="text-xs">{t.generatingShort}</span> : t.aiBtnGenerate}
                            </Button>
                        </div>
                    </div>
                    {selected && selected.id !== 'background' && (
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>{t.aiSizeScale}</span>
                                <span>{selected.scale.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range" min="0.1" max="5" step="0.1"
                                value={selected.scale || 1}
                                onChange={(e) => updateSelectedLayer({ scale: Number(e.target.value) })}
                                onMouseUp={() => saveHistory(layers)}
                                onTouchEnd={() => saveHistory(layers)}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                        </div>
                    )}
                </div>
            );
        
        case 'ai_enhance':
            return (
                <div className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto text-center">
                    <h3 className="text-sm font-medium text-violet-300 uppercase tracking-wide">{t.aiTitleEnhance}</h3>
                    <p className="text-xs text-slate-400">{t.aiDescEnhance}</p>
                    <Button onClick={handleAiEnhance} className="w-full">
                       <Sparkles className="w-4 h-4 mr-2" /> {t.aiBtnEnhance}
                    </Button>
                </div>
            );

        case 'ai_brush':
            return (
                <div className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto">
                    <div className="text-center">
                        <h3 className="text-sm font-medium text-violet-300 uppercase tracking-wide">{t.aiImproveTitle}</h3>
                        <p className="text-xs text-slate-400">{t.aiImproveDesc}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>{t.aiBrushSize}</span>
                                <span>{aiBrushSize}px</span>
                             </div>
                             <input 
                               type="range" min="10" max="120" value={aiBrushSize} 
                               onChange={(e) => setAiBrushSize(Number(e.target.value))}
                               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                             />
                        </div>
                        <div>
                             <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>{t.aiStrength}</span>
                                <span>{(aiStrength * 100).toFixed(0)}%</span>
                             </div>
                             <input 
                               type="range" min="0.2" max="1.0" step="0.1" value={aiStrength} 
                               onChange={(e) => setAiStrength(Number(e.target.value))}
                               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                             />
                        </div>
                        <div className="flex gap-2 pt-2">
                             <Button 
                                variant="secondary"
                                onClick={() => { setAiMaskOperations([]); setAiActivePath([]); }}
                                className="flex-1"
                                disabled={isAiProcessingBrush || aiMaskOperations.length === 0}
                             >
                                {t.aiClear}
                             </Button>
                             <Button 
                                onClick={handleAiBrushApply} 
                                className="flex-1"
                                disabled={isAiProcessingBrush || aiMaskOperations.length === 0}
                             >
                                {isAiProcessingBrush ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t.aiImproving}
                                    </>
                                ) : t.aiApply}
                             </Button>
                        </div>
                    </div>
                </div>
            );

        case 'adjust':
           if (editorMode === 'ai') {
               if (selectedLayerId && selectedLayerId !== 'background') {
                   return (
                       <div className="flex justify-center px-4">
                           <Button onClick={deleteSelectedLayer} variant="secondary" className="text-red-400 border-red-900/50 bg-red-900/10">
                               <Trash2 className="w-4 h-4 mr-2" /> {t.editorDeleteObject}
                           </Button>
                       </div>
                   );
               }
               return null; 
           }

           const targetId = selectedLayerId || (layers.find(l => l.id === 'background') ? 'background' : null);
           if (!targetId) return <div className="text-center text-slate-500 py-4">{t.editorNoLayers}</div>;
           const targetLayer = layers.find(l => l.id === targetId);
           const currentFilter = targetLayer?.style?.filter || DEFAULT_ADJUSTMENTS;
           const isOverlay = targetId !== 'background';

           return (
             <div className="space-y-4 px-4 pb-2">
               <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                 <span>{t.editorAdjust}: {targetId === 'background' ? 'Background' : 'Layer'}</span>
                 {isOverlay && (
                    <button onClick={deleteSelectedLayer} className="text-red-400 text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> {t.editorDeleteLayer}
                    </button>
                 )}
               </div>

               {isOverlay && (
                   <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Size / Scale</span>
                        <span>{targetLayer?.scale?.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range" min="0.1" max="5" step="0.1"
                        value={targetLayer?.scale || 1}
                        onChange={(e) => updateSelectedLayer({ scale: Number(e.target.value) })}
                        onMouseUp={() => saveHistory(layers)}
                        onTouchEnd={() => saveHistory(layers)}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                   </div>
               )}

               <div className="grid grid-cols-1 gap-4">
                 {[
                   { key: 'brightness', label: t.editorBrightness, min: 0, max: 200 },
                   { key: 'contrast', label: t.editorContrast, min: 0, max: 200 },
                   { key: 'saturation', label: t.editorSaturation, min: 0, max: 200 },
                   { key: 'blur', label: t.editorBlur, min: 0, max: 20 },
                 ].map((adj) => {
                   const val = currentFilter[adj.key as keyof Adjustments];
                   const defaultVal = adj.key === 'blur' ? 0 : 100;
                   const displayVal = val ?? defaultVal;
                   return (
                     <div key={adj.key}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{adj.label}</span>
                          <span>{displayVal}</span>
                        </div>
                        <input
                          type="range" min={adj.min} max={adj.max}
                          value={displayVal}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (selectedLayerId) updateSelectedLayer({ [adj.key]: val } as any);
                            else updateBackgroundLayer({ [adj.key]: val } as any);
                          }}
                          onMouseUp={() => saveHistory(layers)}
                          onTouchEnd={() => saveHistory(layers)}
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                     </div>
                   );
                 })}
               </div>
             </div>
           );

        case 'filter':
           const previewLayer = selected?.type === 'image' ? selected : layers.find(l => l.id === 'background');
           const imageSrc = previewLayer?.type === 'image' ? previewLayer.content as string : null;
           return (
             <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide">
                {[
                  { name: t.filterNone, filter: { ...DEFAULT_ADJUSTMENTS } },
                  { name: t.filterGrayscale, filter: { ...DEFAULT_ADJUSTMENTS, saturation: 0 } },
                  { name: t.filterSepia, filter: { ...DEFAULT_ADJUSTMENTS, sepia: 100 } },
                  { name: t.filterWarm, filter: { ...DEFAULT_ADJUSTMENTS, sepia: 30, hue: -10, saturation: 120 } },
                  { name: t.filterCool, filter: { ...DEFAULT_ADJUSTMENTS, hue: 180, saturation: 80, brightness: 110 } },
                  { name: t.filterVintage, filter: { ...DEFAULT_ADJUSTMENTS, sepia: 50, contrast: 120, brightness: 90 } },
                ].map((f, i) => (
                  <button key={i} onClick={() => {
                      if (selectedLayerId) updateSelectedLayer(f.filter as any, true);
                      else updateBackgroundLayer(f.filter as any, true);
                  }} className="flex flex-col items-center flex-shrink-0 space-y-2 group">
                     <div className="w-16 h-16 rounded-lg bg-slate-800 border-2 border-transparent group-hover:border-violet-500 overflow-hidden relative">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ 
                           backgroundImage: imageSrc ? `url(${imageSrc})` : 'none',
                           filter: `brightness(${f.filter.brightness}%) contrast(${f.filter.contrast}%) saturate(${f.filter.saturation}%) sepia(${f.filter.sepia}%) hue-rotate(${f.filter.hue}deg)` 
                        }} />
                     </div>
                     <span className="text-xs text-slate-400">{f.name}</span>
                  </button>
                ))}
             </div>
           );
           
        case 'crop':
           return (
             <div className="flex flex-col gap-4 px-4 pb-2">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {[
                  { label: t.editorCropOriginal, w: 0, h: 0, ratio: 'Free' },
                  { label: t.editorCropPortrait, w: 9, h: 16, ratio: '9:16' },
                  { label: t.editorCropLandscape, w: 16, h: 9, ratio: '16:9' },
                  { label: t.editorCropSquare, w: 1, h: 1, ratio: '1:1' },
                  { label: '3:4', w: 3, h: 4, ratio: '3:4' },
                  { label: '4:3', w: 4, h: 3, ratio: '4:3' },
                ].map((r, i) => (
                   <button key={i} onClick={() => {
                      if (r.w === 0) {
                         setCropRect({ x: 0, y: 0, width: canvasSize.width, height: canvasSize.height });
                         return;
                      }
                      const targetRatio = r.w / r.h;
                      let w = canvasSize.width;
                      let h = canvasSize.width / targetRatio;
                      if (h > canvasSize.height) {
                          h = canvasSize.height;
                          w = canvasSize.height * targetRatio;
                      }
                      setCropRect({
                          x: (canvasSize.width - w) / 2,
                          y: (canvasSize.height - h) / 2,
                          width: w,
                          height: h
                      });
                   }} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-slate-700 min-w-[70px]">
                      <div className={`border-2 border-slate-400 mb-2 rounded-sm`} 
                           style={{ 
                               width: r.w === 0 ? '16px' : `${Math.min(24, r.w * 3)}px`, 
                               height: r.h === 0 ? '16px' : `${Math.min(24, r.h * 3)}px`,
                               aspectRatio: r.w && r.h ? `${r.w}/${r.h}` : 'auto'
                           }}></div>
                      <span className="text-xs text-slate-300 whitespace-nowrap">{r.label}</span>
                   </button>
                ))}
                </div>
                <div className="flex justify-end border-t border-slate-800 pt-3">
                   <Button size="sm" onClick={applyCrop} className="flex items-center gap-2">
                      <Check className="w-4 h-4" /> {t.editorCrop}
                   </Button>
                </div>
             </div>
           );

        case 'text':
           return (
             <div className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto">
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={newText} 
                   onChange={(e) => setNewText(e.target.value)}
                   placeholder={t.editorTextPlaceholder}
                   className="flex-1 bg-slate-800 border-none rounded-lg px-4 text-white focus:ring-1 focus:ring-violet-500"
                 />
                 <Button size="sm" onClick={addTextLayer}>{t.editorAddText}</Button>
               </div>
               
               {selected?.type === 'text' && (
                 <div className="py-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span>Size</span>
                       <span>{selected.scale.toFixed(1)}x</span>
                    </div>
                    <input 
                       type="range" min="0.5" max="5" step="0.1"
                       value={selected.scale}
                       onChange={(e) => updateSelectedLayer({ scale: Number(e.target.value) })}
                       onMouseUp={() => saveHistory(layers)}
                       onTouchEnd={() => saveHistory(layers)}
                       className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                 </div>
               )}

               <div className="flex gap-2 justify-center">
                  {['#ffffff', '#000000', '#FF5757', '#FFBD59', '#8CFF57', '#5757FF'].map(c => (
                     <button key={c} onClick={() => setBrushColor(c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-full border-2 ${brushColor === c ? 'border-white' : 'border-transparent'}`} />
                  ))}
               </div>
             </div>
           );

        case 'sticker':
           return (
             <div className="px-4 pb-4">
               {selected?.type === 'sticker' && (
                 <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span>Sticker Size</span>
                       <span>{selected.scale.toFixed(1)}x</span>
                    </div>
                    <input 
                       type="range" min="0.5" max="5" step="0.1"
                       value={selected.scale}
                       onChange={(e) => updateSelectedLayer({ scale: Number(e.target.value) })}
                       onMouseUp={() => saveHistory(layers)}
                       onTouchEnd={() => saveHistory(layers)}
                       className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                 </div>
               )}

               <div className="grid grid-cols-7 gap-2">
                  {STICKERS.map(s => (
                     <button key={s} onClick={() => addStickerLayer(s)} className="text-2xl hover:bg-slate-800 rounded p-2 transition">
                        {s}
                     </button>
                  ))}
               </div>
             </div>
           );

        case 'draw':
           return (
             <div className="flex flex-col items-center gap-4 px-4 w-full max-w-md mx-auto">
               <div className="w-full">
                 <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t.editorBrushSize}</span>
                    <span>{brushSize}px</span>
                 </div>
                 <input 
                   type="range" min="1" max="50" value={brushSize} 
                   onChange={(e) => setBrushSize(Number(e.target.value))}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                 />
               </div>
               <div className="flex gap-2 justify-center flex-wrap">
                 {['#ffffff', '#000000', '#FF5757', '#FFBD59', '#FFFF57', '#8CFF57', '#57FFBD', '#5757FF', '#BD57FF', '#FF57BD'].map(color => (
                   <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${brushColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
            </div>
           );

        case 'layers':
           return (
             <div className="space-y-2 px-4 max-h-48 overflow-y-auto">
                {layers.slice().reverse().map(l => (
                   <div key={l.id} 
                        onClick={() => setSelectedLayerId(l.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border ${selectedLayerId === l.id ? 'bg-violet-900/20 border-violet-500' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="flex items-center gap-3">
                         {l.type === 'image' && <ImageIcon className="w-4 h-4 text-slate-400" />}
                         {l.type === 'text' && <Type className="w-4 h-4 text-slate-400" />}
                         {l.type === 'sticker' && <Smile className="w-4 h-4 text-slate-400" />}
                         {l.type === 'drawing' && <PenTool className="w-4 h-4 text-slate-400" />}
                         <span className="text-sm font-medium text-slate-200">
                            {l.id === 'background' ? 'Background' : `${l.type} layer`}
                         </span>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={(e) => { 
                             e.stopPropagation(); 
                             const newLayers = layers.map(pl => pl.id === l.id ? { ...pl, visible: !pl.visible } : pl);
                             setLayers(newLayers);
                             saveHistory(newLayers);
                         }} className="text-slate-500 hover:text-white">
                            {l.visible ? '👁️' : '👁️‍🗨️'}
                         </button>
                         {l.id !== 'background' && (
                            <button onClick={(e) => { 
                                e.stopPropagation(); 
                                const newLayers = layers.filter(pl => pl.id !== l.id);
                                setLayers(newLayers);
                                saveHistory(newLayers);
                            }} className="text-red-400 hover:text-red-300">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         )}
                      </div>
                   </div>
                ))}
                {layers.length === 0 && <p className="text-center text-slate-500 text-sm">{t.editorNoLayers}</p>}
             </div>
           );
        
        default:
           return null;
     }
  };

  const renderToolbarItems = () => {
      if (editorMode === 'ai') {
          const tools: { id: string; icon: any; label: string; disabled?: boolean }[] = [
              { id: 'ai_object', icon: ImagePlus, label: t.aiToolAddObject },
              { id: 'ai_enhance', icon: Sparkles, label: t.aiToolEnhance },
              { id: 'ai_brush', icon: Brush, label: t.aiImproveTitle }, 
              // Eraser removed completely
          ];

          return tools.map((tool) => (
             <button
               key={tool.id}
               type="button"
               disabled={tool.disabled}
               onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as ExtendedEditorTool)}
               className={`flex flex-col items-center justify-center px-4 py-2 min-w-[72px] rounded-xl transition-all ${activeTool === tool.id ? 'text-violet-400 bg-violet-900/10' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${tool.disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
             >
                <tool.icon className={`w-6 h-6 mb-1 ${activeTool === tool.id ? 'fill-current opacity-20' : ''}`} />
                <span className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">{tool.label}</span>
             </button>
           ));
      }

      return [
          { id: 'adjust', icon: Sliders, label: t.editorAdjust },
          { id: 'filter', icon: Wand2, label: t.editorFilters },
          { id: 'crop', icon: Maximize, label: t.editorCrop },
          { id: 'text', icon: Type, label: t.editorText },
          { id: 'sticker', icon: Smile, label: t.editorSticker },
          { id: 'draw', icon: PenTool, label: t.editorDraw },
          { id: 'import', icon: ImageIcon, label: t.editorImport, action: () => importInputRef.current?.click() },
          { id: 'layers', icon: Layers, label: t.editorLayers },
      ].map((tool) => (
         <button
           key={tool.id}
           type="button"
           onClick={() => {
              if (tool.action) tool.action();
              else setActiveTool(activeTool === tool.id ? null : tool.id as EditorTool);
           }}
           className={`flex flex-col items-center justify-center px-4 py-2 min-w-[72px] rounded-xl transition-all ${activeTool === tool.id ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
         >
            <tool.icon className={`w-6 h-6 mb-1 ${activeTool === tool.id ? 'fill-current opacity-20' : ''}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">{tool.label}</span>
         </button>
      ));
  };

  if (editorMode === null) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
           <button onClick={onBack} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
           </button>
           
           <h1 className="text-4xl font-bold text-white mb-2">{t.selectModeTitle}</h1>
           <p className="text-slate-400 mb-12">{t.selectModeDesc}</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              <div 
                  onClick={() => setEditorMode('manual')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-300 p-8 flex flex-col items-center text-center"
              >
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-slate-300">
                      <Sliders className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{t.modeManual}</h2>
                  <p className="text-slate-400">{t.modeManualDesc}</p>
              </div>

              <div 
                  onClick={() => setEditorMode('ai')}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl bg-slate-900 border border-violet-900/50 hover:border-violet-500 hover:bg-violet-900/10 transition-all duration-300 p-8 flex flex-col items-center text-center shadow-lg shadow-violet-900/20"
              >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-violet-600/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-violet-400 relative z-10">
                      <Sparkles className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 relative z-10">{t.modeAI}</h2>
                  <p className="text-slate-400 relative z-10">{t.modeAIDesc}</p>
              </div>
           </div>
        </div>
      );
  }

  if (layers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
         <button onClick={() => setEditorMode(null)} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full transition-colors">
           <ArrowLeft className="w-6 h-6" />
         </button>
         
         <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-lg aspect-[4/3] border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer group relative overflow-hidden">
            {editorMode === 'ai' && <div className="absolute top-0 right-0 bg-violet-600 text-white text-xs px-3 py-1 rounded-bl-xl font-bold">{t.aiModeBadge}</div>}
            
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${editorMode === 'ai' ? 'bg-violet-900/30' : 'bg-slate-800'}`}>
               <Upload className={`w-10 h-10 ${editorMode === 'ai' ? 'text-violet-400' : 'text-slate-400'}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t.editorUpload}</h2>
            <p className="text-slate-400">{t.editorDragDrop}</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-[100] animate-in slide-in-from-bottom duration-300">
      <div className="h-16 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur border-b border-slate-900 z-10 relative">
        <div className="flex items-center gap-3">
            <button onClick={() => { setLayers([]); setHistory([]); setEditorMode(null); }} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            {editorMode === 'ai' && (
                <span className="px-2 py-0.5 rounded-full bg-violet-900/50 border border-violet-500/30 text-[10px] font-bold text-violet-300 tracking-wider">
                    {t.aiModeBadge}
                </span>
            )}
        </div>
        
        <div className="flex items-center space-x-2">
           <button 
             onClick={toggleLanguage}
             className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors mr-1"
             title="Switch Language"
           >
             <Globe className="w-5 h-5" />
           </button>

           <button 
             type="button"
             onClick={handleUndo} 
             disabled={historyIndex <= 0}
             className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
           >
             <Undo className="w-5 h-5" />
           </button>
           <button 
             type="button"
             onClick={handleRedo} 
             disabled={historyIndex >= history.length - 1}
             className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
           >
             <Redo className="w-5 h-5" />
           </button>
           <Button variant="primary" size="sm" onClick={handleDownload} className="ml-2 !rounded-full !px-6">
             {t.editorSave}
           </Button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-auto relative flex items-center justify-center bg-[#0a0a0a] touch-none"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <div className="absolute bottom-4 left-4 flex gap-2 z-20 bg-slate-900/80 p-1 rounded-lg backdrop-blur border border-slate-800">
           <button onClick={handleZoomOut} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded">
             <ZoomOut className="w-5 h-5" />
           </button>
           <div className="px-2 py-2 text-xs font-mono text-slate-400 border-x border-slate-700 min-w-[3rem] text-center">
             {Math.round(zoomLevel * 100)}%
           </div>
           <button onClick={handleZoomIn} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded">
             <ZoomIn className="w-5 h-5" />
           </button>
        </div>

        <div style={{ transform: `scale(${zoomLevel})` }} className="origin-center p-20 flex items-center justify-center">
            <div style={{ width: canvasSize.width, height: canvasSize.height, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <canvas
                  ref={canvasRef}
                  className="bg-[#1a1a1a]"
                  onMouseDown={handlePointerDown}
                  onTouchStart={handlePointerDown}
                  style={{ cursor: activeTool === 'draw' || activeTool === 'ai_brush' ? 'crosshair' : (selectedLayerId && editorMode === 'manual' ? 'move' : 'default') }}
                />
                
                {activeTool === 'crop' && cropRect && (
                  <>
                     <div className="absolute inset-0 pointer-events-none" style={{
                        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`
                     }}></div>
                     <div 
                        className="absolute border-2 border-white"
                        style={{ 
                           left: cropRect.x, top: cropRect.y, 
                           width: cropRect.width, height: cropRect.height,
                           boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                           touchAction: 'none'
                        }}
                        onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                     >
                        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-30">
                           <div className="flex-1 border-b border-white/50"></div>
                           <div className="flex-1 border-b border-white/50"></div>
                           <div className="flex-1"></div>
                        </div>
                        <div className="absolute inset-0 flex pointer-events-none opacity-30">
                           <div className="flex-1 border-r border-white/50"></div>
                           <div className="flex-1 border-r border-white/50"></div>
                           <div className="flex-1"></div>
                        </div>

                        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-2 border-l-2 border-white bg-transparent cursor-nw-resize" onPointerDown={(e) => handleCropPointerDown(e, 'tl')} />
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-2 border-r-2 border-white bg-transparent cursor-ne-resize" onPointerDown={(e) => handleCropPointerDown(e, 'tr')} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-2 border-l-2 border-white bg-transparent cursor-sw-resize" onPointerDown={(e) => handleCropPointerDown(e, 'bl')} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-2 border-r-2 border-white bg-transparent cursor-se-resize" onPointerDown={(e) => handleCropPointerDown(e, 'br')} />
                     </div>
                  </>
                )}
                
                {(isAiProcessingBrush) && (
                    <div className="absolute inset-0 z-50 bg-black/40 cursor-wait flex items-center justify-center backdrop-blur-[1px]">
                    </div>
                )}
            </div>
        </div>
        <input type="file" ref={importInputRef} className="hidden" accept="image/*" onChange={handleImportLayer} />
      </div>

      <div className="bg-slate-950 border-t border-slate-900 pb-safe transition-all duration-300 z-10">
        <div className={`transition-all duration-300 ${activeTool ? 'h-auto py-4 border-b border-slate-900' : 'h-0 overflow-hidden'}`}>
           {renderToolPanel()}
        </div>
        <div className="flex justify-between items-center px-2 py-2 bg-slate-950 overflow-x-auto scrollbar-hide">
            {renderToolbarItems()}
        </div>
      </div>
    </div>
  );
};