
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Save, Undo, Redo, Plus, Trash2, 
  PenTool, Eraser, Circle, Square, Minus, Paintbrush, 
  Settings2, Move, Grid, Info, MousePointer2, ChevronDown, Layers, X, Check, FileDown, FilePlus
} from 'lucide-react';
import { Language, AspectRatio } from '../types';
import { TRANSLATIONS, ASPECT_RATIOS } from '../constants';
import { Button } from './ui/Button';
import { saveToGallery, saveSketchbookDraft, getSketchbookDraft, deleteSketchbookDraft, SketchbookDraft } from '../services/galleryService';

interface SketchbookProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
  onOpenInfo: () => void;
}

interface LayerData {
  id: string;
  visible: boolean;
  opacity: number;
}

interface ActiveShape {
  type: 'rect' | 'circle' | 'line';
  start: { x: number, y: number };
  end: { x: number, y: number };
  color: string;
  size: number;
}

type ToolType = 'pencil' | 'pen' | 'brush' | 'eraser' | 'rect' | 'circle' | 'line';

// --- Color Helpers ---
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

export const Sketchbook: React.FC<SketchbookProps> = ({ onBack, language, toggleLanguage, onOpenInfo }) => {
  const t = TRANSLATIONS[language];
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [color, setColor] = useState('#000000');
  const [hexInput, setHexInput] = useState('#000000');
  const [size, setSize] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [isSymmetry, setIsSymmetry] = useState(false);
  const [isStabilizer, setIsStabilizer] = useState(false);
  
  const [layers, setLayers] = useState<LayerData[]>([{ id: 'layer-1', visible: true, opacity: 1 }]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [backgroundColor, setBackgroundColor] = useState<'white' | 'black' | 'transparent'>('white');
  
  // Canvas Configuration
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 1200 });
  
  // UI State
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loupePos, setLoupePos] = useState<{x: number, y: number} | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Shape Manipulation State
  const [activeShape, setActiveShape] = useState<ActiveShape | null>(null);
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'resize_tl' | 'resize_tr' | 'resize_bl' | 'resize_br' | 'resize_start' | 'resize_end' | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // History
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorWheelRef = useRef<HTMLCanvasElement>(null);
  
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  
  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });

  // Stabilizer buffer
  const pointsBuffer = useRef<{x: number, y: number}[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draft = await getSketchbookDraft();
        if (draft) {
          setShowResumeDialog(true);
        } else {
          updateCanvasSize(AspectRatio.SQUARE);
        }
      } catch (e) {
        console.error("Draft check failed", e);
        updateCanvasSize(AspectRatio.SQUARE);
      }
    };
    checkDraft();
  }, []);

  // Sync Hex Input with Color State
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  // When changing tools, commit active shape if exists
  useEffect(() => {
    if (activeShape && !['rect', 'circle', 'line'].includes(activeTool)) {
      commitShape();
    }
  }, [activeTool]);

  // Autosave Draft
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Don't autosave if dialog is showing or no layers (initial state)
    if (showResumeDialog || layers.length === 0) return;

    saveTimeoutRef.current = setTimeout(async () => {
        const layerImages: Record<string, string> = {};
        let hasContent = false;

        // Serialize layers
        for (const layer of layers) {
            const canvas = canvasRefs.current[layer.id];
            if (canvas) {
               const data = canvas.toDataURL();
               if (data !== 'data:,') { // Basic check for empty, though modern browsers return large empty strings
                   layerImages[layer.id] = data;
                   hasContent = true;
               }
            }
        }

        if (hasContent) {
            const draft: SketchbookDraft = {
                id: 'latest',
                layers,
                canvasSize,
                layerImages,
                backgroundColor,
                timestamp: Date.now()
            };
            await saveSketchbookDraft(draft);
        }
    }, 2000); // 2 second debounce

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [layers, historyIndex, canvasSize, backgroundColor]); // Trigger on relevant changes

  const handleNewProject = async () => {
      setShowResumeDialog(false);
      await deleteSketchbookDraft();
      updateCanvasSize(AspectRatio.SQUARE);
  };

  const handleResumeProject = async () => {
      setShowResumeDialog(false);
      try {
          const draft = await getSketchbookDraft();
          if (!draft) {
              updateCanvasSize(AspectRatio.SQUARE);
              return;
          }

          setCanvasSize(draft.canvasSize);
          setLayers(draft.layers);
          setBackgroundColor(draft.backgroundColor);
          
          // Wait for render cycle to ensure canvas refs exist
          setTimeout(async () => {
              // Restore canvas content
              for (const layer of draft.layers) {
                  const dataUrl = draft.layerImages[layer.id];
                  if (dataUrl) {
                      const canvas = canvasRefs.current[layer.id];
                      if (canvas) {
                          canvas.width = draft.canvasSize.width;
                          canvas.height = draft.canvasSize.height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                              const img = new Image();
                              img.src = dataUrl;
                              await new Promise<void>((resolve) => {
                                  img.onload = () => {
                                      ctx.drawImage(img, 0, 0);
                                      resolve();
                                  };
                              });
                          }
                      }
                  }
              }
              // Set initial active layer
              if (draft.layers.length > 0) setActiveLayerId(draft.layers[draft.layers.length - 1].id);
              
              // Recalculate zoom to fit
              if (containerRef.current) {
                  const cw = containerRef.current.clientWidth;
                  const ch = containerRef.current.clientHeight;
                  const fitZoom = Math.min((cw - 40) / draft.canvasSize.width, (ch - 40) / draft.canvasSize.height);
                  const scale = Math.min(fitZoom, 1);
                  setZoom(scale);
                  setPan({
                      x: (cw - draft.canvasSize.width * scale) / 2,
                      y: (ch - draft.canvasSize.height * scale) / 2
                  });
              }
          }, 100);

      } catch (e) {
          console.error("Failed to resume", e);
          updateCanvasSize(AspectRatio.SQUARE);
      }
  };

  // Draw Color Wheel
  useEffect(() => {
    if (showColorPicker && colorWheelRef.current) {
        const canvas = colorWheelRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = width / 2;
        
        ctx.clearRect(0, 0, width, height);

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= radius) {
                    const angle = Math.atan2(dy, dx);
                    const hue = (angle * 180 / Math.PI + 360) % 360;
                    const sat = Math.min((dist / radius) * 100, 100);
                    
                    const s = sat / 100;
                    const l = 0.5;
                    const c = (1 - Math.abs(2 * l - 1)) * s;
                    const xVal = c * (1 - Math.abs(((hue / 60) % 2) - 1));
                    const m = l - c / 2;
                    
                    let r = 0, g = 0, b = 0;
                    if (0 <= hue && hue < 60) { r = c; g = xVal; b = 0; }
                    else if (60 <= hue && hue < 120) { r = xVal; g = c; b = 0; }
                    else if (120 <= hue && hue < 180) { r = 0; g = c; b = xVal; }
                    else if (180 <= hue && hue < 240) { r = 0; g = xVal; b = c; }
                    else if (240 <= hue && hue < 300) { r = xVal; g = 0; b = c; }
                    else if (300 <= hue && hue < 360) { r = c; g = 0; b = xVal; }
                    
                    const index = (y * width + x) * 4;
                    data[index] = (r + m) * 255;
                    data[index + 1] = (g + m) * 255;
                    data[index + 2] = (b + m) * 255;
                    data[index + 3] = 255;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
  }, [showColorPicker]);

  const getDimensions = (ratio: AspectRatio) => {
      switch (ratio) {
          case AspectRatio.PORTRAIT: return { width: 900, height: 1200 };
          case AspectRatio.LANDSCAPE: return { width: 1200, height: 900 };
          case AspectRatio.WIDE: return { width: 1600, height: 900 };
          case AspectRatio.TALL: return { width: 900, height: 1600 };
          case AspectRatio.INFINITE: return { width: 4000, height: 4000 };
          case AspectRatio.SQUARE: default: return { width: 1200, height: 1200 };
      }
  };

  const updateCanvasSize = (ratio: AspectRatio) => {
      const newSize = getDimensions(ratio);
      setAspectRatio(ratio);
      setCanvasSize(newSize);
      
      if (containerRef.current) {
          const cw = containerRef.current.clientWidth;
          const ch = containerRef.current.clientHeight;
          const fitZoom = Math.min((cw - 40) / newSize.width, (ch - 40) / newSize.height);
          const scale = ratio === AspectRatio.INFINITE ? Math.max(0.2, fitZoom) : Math.min(fitZoom, 1);
          
          setZoom(scale);
          setPan({
              x: (cw - newSize.width * scale) / 2,
              y: (ch - newSize.height * scale) / 2
          });
      }

      setTimeout(() => {
          layers.forEach(layer => {
              const canvas = canvasRefs.current[layer.id];
              if (canvas) {
                  canvas.width = newSize.width;
                  canvas.height = newSize.height;
              }
          });
          if (previewCanvasRef.current) {
              previewCanvasRef.current.width = newSize.width;
              previewCanvasRef.current.height = newSize.height;
          }
          setHistory([]);
          setHistoryIndex(-1);
          
          const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
          if (ctx) saveState(ctx);
      }, 0);
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const saveState = (ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    if (newHistory.length > 20) newHistory.shift(); 
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const imageData = history[newIndex];
      const canvas = canvasRefs.current[activeLayerId];
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        setHistoryIndex(newIndex);
        setActiveShape(null); // Clear any active shape on undo
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const imageData = history[newIndex];
      const canvas = canvasRefs.current[activeLayerId];
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        setHistoryIndex(newIndex);
        setActiveShape(null);
      }
    }
  };

  const setupContext = (ctx: CanvasRenderingContext2D, sColor = color, sSize = size) => {
      ctx.lineWidth = sSize;
      ctx.strokeStyle = sColor;
      ctx.fillStyle = sColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (activeTool === 'eraser') {
          ctx.globalAlpha = opacity;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.shadowBlur = 0;
      } else {
          ctx.globalAlpha = opacity;
          ctx.globalCompositeOperation = 'source-over';
          
          if (activeTool === 'brush') {
              ctx.shadowBlur = sSize * 0.5;
              ctx.shadowColor = sColor;
          } else {
              ctx.shadowBlur = 0;
          }
      }
  };

  const drawSymmetry = (ctx: CanvasRenderingContext2D, x: number, y: number, prevX: number, prevY: number) => {
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.stroke();

      if (isSymmetry) {
          const centerX = canvasSize.width / 2;
          const mirrorX = centerX + (centerX - x);
          const mirrorPrevX = centerX + (centerX - prevX);
          
          ctx.beginPath();
          ctx.moveTo(mirrorPrevX, prevY);
          ctx.lineTo(mirrorX, y);
          ctx.stroke();
      }
  };

  // Draws the active shape plus handles if it's currently selected
  const drawActiveShape = (ctx: CanvasRenderingContext2D, shape: ActiveShape, showHandles: boolean = true) => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      setupContext(ctx, shape.color, shape.size);
      
      ctx.beginPath();
      
      if (shape.type === 'line') {
          ctx.moveTo(shape.start.x, shape.start.y);
          ctx.lineTo(shape.end.x, shape.end.y);
      } else if (shape.type === 'rect') {
          const w = shape.end.x - shape.start.x;
          const h = shape.end.y - shape.start.y;
          ctx.rect(shape.start.x, shape.start.y, w, h);
      } else if (shape.type === 'circle') {
          const radius = Math.sqrt(Math.pow(shape.end.x - shape.start.x, 2) + Math.pow(shape.end.y - shape.start.y, 2));
          ctx.arc(shape.start.x, shape.start.y, radius, 0, 2 * Math.PI);
      }
      
      ctx.stroke();

      if (isSymmetry && shape.type !== 'line') {
          // Simplified symmetry for shapes - mirror logic could be complex for manipulated shapes
          // For now, we only draw the main shape in manip mode to avoid confusion
      }

      if (showHandles) {
          ctx.strokeStyle = '#00B4FF';
          ctx.lineWidth = 1;
          ctx.fillStyle = '#FFFFFF';
          
          const handleSize = 10 / zoom; // Scale handle size
          const drawHandle = (x: number, y: number) => {
              ctx.beginPath();
              ctx.rect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
              ctx.fill();
              ctx.stroke();
          };

          if (shape.type === 'line') {
              drawHandle(shape.start.x, shape.start.y);
              drawHandle(shape.end.x, shape.end.y);
          } else {
              drawHandle(shape.start.x, shape.start.y); // TL
              drawHandle(shape.end.x, shape.start.y); // TR
              drawHandle(shape.end.x, shape.end.y); // BR
              drawHandle(shape.start.x, shape.end.y); // BL
          }
      }
  };

  const commitShape = () => {
      if (!activeShape) return;
      const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
      if (ctx) {
          setupContext(ctx, activeShape.color, activeShape.size);
          ctx.beginPath();
          if (activeShape.type === 'line') {
              ctx.moveTo(activeShape.start.x, activeShape.start.y);
              ctx.lineTo(activeShape.end.x, activeShape.end.y);
          } else if (activeShape.type === 'rect') {
              const w = activeShape.end.x - activeShape.start.x;
              const h = activeShape.end.y - activeShape.start.y;
              ctx.rect(activeShape.start.x, activeShape.start.y, w, h);
          } else if (activeShape.type === 'circle') {
              const radius = Math.sqrt(Math.pow(activeShape.end.x - activeShape.start.x, 2) + Math.pow(activeShape.end.y - activeShape.start.y, 2));
              ctx.arc(activeShape.start.x, activeShape.start.y, radius, 0, 2 * Math.PI);
          }
          ctx.stroke();
          saveState(ctx);
      }
      setActiveShape(null);
      // Clear preview
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx) previewCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  };

  const isPointNear = (p1: {x: number, y: number}, p2: {x: number, y: number}, threshold: number) => {
      const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      return dist <= threshold;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (showResumeDialog) return;
    if (e.nativeEvent instanceof MouseEvent && (e.nativeEvent.button === 1 || e.nativeEvent.button === 2)) return;
    
    // Pan Logic
    if (activeTool === 'pencil' && e.ctrlKey) {
        isPanning.current = true;
        let clientX, clientY;
        if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY; }
        startPan.current = { x: clientX - pan.x, y: clientY - pan.y };
        return;
    }

    const pos = getCanvasPoint(e);

    // Shape Manipulation Logic
    if (['rect', 'circle', 'line'].includes(activeTool)) {
        if (activeShape) {
            // Check Hit Test for Handles
            const threshold = 20 / zoom;
            if (activeShape.type === 'line') {
                if (isPointNear(pos, activeShape.start, threshold)) { setDragMode('resize_start'); return; }
                if (isPointNear(pos, activeShape.end, threshold)) { setDragMode('resize_end'); return; }
            } else {
                if (isPointNear(pos, activeShape.start, threshold)) { setDragMode('resize_tl'); return; }
                if (isPointNear(pos, { x: activeShape.end.x, y: activeShape.start.y }, threshold)) { setDragMode('resize_tr'); return; }
                if (isPointNear(pos, activeShape.end, threshold)) { setDragMode('resize_br'); return; }
                if (isPointNear(pos, { x: activeShape.start.x, y: activeShape.end.y }, threshold)) { setDragMode('resize_bl'); return; }
            }

            // Check Hit Test for Move (Inside Bounding Box)
            const minX = Math.min(activeShape.start.x, activeShape.end.x);
            const maxX = Math.max(activeShape.start.x, activeShape.end.x);
            const minY = Math.min(activeShape.start.y, activeShape.end.y);
            const maxY = Math.max(activeShape.start.y, activeShape.end.y);

            if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
                setDragMode('move');
                dragOffset.current = { x: pos.x - activeShape.start.x, y: pos.y - activeShape.start.y }; // Relative to start
                return;
            }

            // Clicked outside -> Commit and start new
            commitShape();
        }
        
        // Start creating new shape
        setDragMode('create');
        setActiveShape({
            type: activeTool as 'rect' | 'circle' | 'line',
            start: pos,
            end: pos,
            color: color,
            size: size
        });
        return;
    }

    // Standard Drawing Logic
    isDrawing.current = true;
    lastPos.current = pos;
    startPos.current = pos;
    pointsBuffer.current = [pos];

    if (activeTool === 'eraser') {
        const canvas = canvasRefs.current[activeLayerId];
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            setupContext(ctx);
            drawSymmetry(ctx, pos.x, pos.y, pos.x, pos.y);
        }
    } else {
        const previewCtx = previewCanvasRef.current?.getContext('2d');
        if (previewCtx) {
            setupContext(previewCtx);
            drawSymmetry(previewCtx, pos.x, pos.y, pos.x, pos.y);
        }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning.current) {
        let clientX, clientY;
        if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY; }
        setPan({ x: clientX - startPan.current.x, y: clientY - startPan.current.y });
        return;
    }

    const pos = getCanvasPoint(e);

    // Shape Manipulation Logic
    if (['rect', 'circle', 'line'].includes(activeTool) && activeShape && dragMode) {
        const previewCtx = previewCanvasRef.current?.getContext('2d');
        if (!previewCtx) return;

        let newShape = { ...activeShape };

        if (dragMode === 'create') {
            newShape.end = pos;
        } else if (dragMode === 'move') {
            const width = activeShape.end.x - activeShape.start.x;
            const height = activeShape.end.y - activeShape.start.y;
            newShape.start = { x: pos.x - dragOffset.current.x, y: pos.y - dragOffset.current.y };
            newShape.end = { x: newShape.start.x + width, y: newShape.start.y + height };
        } else if (dragMode === 'resize_start' || dragMode === 'resize_tl') {
            newShape.start = pos;
        } else if (dragMode === 'resize_end' || dragMode === 'resize_br') {
            newShape.end = pos;
        } else if (dragMode === 'resize_tr') {
            newShape.start.y = pos.y;
            newShape.end.x = pos.x;
        } else if (dragMode === 'resize_bl') {
            newShape.start.x = pos.x;
            newShape.end.y = pos.y;
        }

        setActiveShape(newShape);
        drawActiveShape(previewCtx, newShape);
        return;
    }

    if (!isDrawing.current || !lastPos.current) return;

    let targetCtx: CanvasRenderingContext2D | null | undefined = null;
    
    if (activeTool === 'eraser') {
        targetCtx = canvasRefs.current[activeLayerId]?.getContext('2d');
    } else {
        targetCtx = previewCanvasRef.current?.getContext('2d');
    }

    if (targetCtx) {
        setupContext(targetCtx);

        if (isStabilizer) {
            pointsBuffer.current.push(pos);
            if (pointsBuffer.current.length > 3) {
                const p1 = pointsBuffer.current[pointsBuffer.current.length - 3];
                const p2 = pointsBuffer.current[pointsBuffer.current.length - 2];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                drawSymmetry(targetCtx, midX, midY, lastPos.current.x, lastPos.current.y);
                lastPos.current = { x: midX, y: midY };
            }
        } else {
            drawSymmetry(targetCtx, pos.x, pos.y, lastPos.current.x, lastPos.current.y);
            lastPos.current = pos;
        }
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning.current) {
        isPanning.current = false;
        return;
    }

    // If using shape tools, we just stop dragging but KEEP the shape active
    if (['rect', 'circle', 'line'].includes(activeTool)) {
        setDragMode(null);
        return; 
    }

    if (!isDrawing.current) return;
    
    if (activeTool !== 'eraser' && previewCanvasRef.current && canvasRefs.current[activeLayerId]) {
        const previewCanvas = previewCanvasRef.current;
        const activeCtx = canvasRefs.current[activeLayerId]?.getContext('2d');
        const previewCtx = previewCanvas.getContext('2d');

        if (activeCtx && previewCtx) {
            activeCtx.globalAlpha = 1; 
            activeCtx.globalCompositeOperation = 'source-over';
            activeCtx.shadowBlur = 0; 
            activeCtx.drawImage(previewCanvas, 0, 0);
            
            previewCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
            saveState(activeCtx);
        }
    } else if (activeTool === 'eraser') {
        const ctx = canvasRefs.current[activeLayerId]?.getContext('2d');
        if (ctx) saveState(ctx);
    }

    isDrawing.current = false;
    pointsBuffer.current = [];
    startPos.current = null;
  };

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    setLayers([...layers, { id: newId, visible: true, opacity: 1 }]);
    setActiveLayerId(newId);
    setTimeout(() => {
        const canvas = canvasRefs.current[newId];
        if (canvas) {
            canvas.width = canvasSize.width;
            canvas.height = canvasSize.height;
        }
    }, 50);
  };

  const clearLayer = () => {
      const canvas = canvasRefs.current[activeLayerId];
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              saveState(ctx);
          }
      }
  };

  const handleSave = async () => {
      // Ensure any active shape is committed before saving
      commitShape();

      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvasSize.width;
      compositeCanvas.height = canvasSize.height;
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) return;

      if (backgroundColor === 'white') {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      } else if (backgroundColor === 'black') {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      }

      layers.forEach(layer => {
          if (!layer.visible) return;
          const layerCanvas = canvasRefs.current[layer.id];
          if (layerCanvas) {
              ctx.globalAlpha = layer.opacity;
              ctx.drawImage(layerCanvas, 0, 0);
          }
      });

      try {
          await saveToGallery({
              id: crypto.randomUUID(),
              url: compositeCanvas.toDataURL(),
              type: 'edited',
              timestamp: Date.now(),
              prompt: 'Sketchbook Art'
          });
          alert(t.sbSaved);
      } catch (e) {
          alert('Error saving artwork');
      }
  };

  const handleColorInteractionStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (e.type === 'touchstart') e.preventDefault();
      
      if (!colorWheelRef.current) return;
      
      const processColor = (clientX: number, clientY: number) => {
          const rect = colorWheelRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          setLoupePos({ x, y });

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = rect.width / 2;
          
          if (dist <= radius) {
              const angle = Math.atan2(dy, dx);
              const hue = (angle * 180 / Math.PI + 360) % 360;
              const sat = Math.min((dist / radius) * 100, 100);
              const currentL = hexToHsl(color).l; 
              const targetL = (currentL < 10 || currentL > 90) ? 50 : currentL;
              setColor(hslToHex(hue, sat, targetL));
          }
      };

      const getClientCoords = (ev: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
          if ('touches' in ev) {
              return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
          }
          return { x: (ev as any).clientX, y: (ev as any).clientY };
      };

      const { x, y } = getClientCoords(e);
      processColor(x, y);

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
          const coords = getClientCoords(moveEvent);
          processColor(coords.x, coords.y);
      };
      
      const handleUp = () => {
          setLoupePos(null);
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('touchend', handleUp);
      };
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const l = parseInt(e.target.value);
      const { h, s } = hexToHsl(color);
      setColor(hslToHex(h, s, l));
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setHexInput(val);
      if (/^#[0-9A-F]{6}$/i.test(val)) {
          setColor(val);
      }
  };
  
  const { h: currentH, s: currentS, l: currentL } = hexToHsl(color);
  const pureColor = hslToHex(currentH, currentS, 50);

  // Calculate position of the selector ring on the wheel
  const angleRad = currentH * (Math.PI / 180);
  const radiusPx = (currentS / 100) * (200 / 2);
  const indicatorX = 100 + radiusPx * Math.cos(angleRad);
  const indicatorY = 100 + radiusPx * Math.sin(angleRad);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col z-50">
      
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 shadow-sm">
         <div className="flex items-center gap-3">
             <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                 <ArrowLeft className="w-6 h-6" />
             </button>
             <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">{t.sketchbook}</h1>
             
             {/* Aspect Ratio Selector */}
             <div className="relative">
                <button 
                    onClick={() => setShowRatioMenu(!showRatioMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <Square className="w-4 h-4" />
                    <span className="uppercase">{aspectRatio === AspectRatio.INFINITE ? 'Infinite' : aspectRatio}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showRatioMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowRatioMenu(false)}></div>
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
                            {ASPECT_RATIOS.map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => { updateCanvasSize(r.value); setShowRatioMenu(false); }}
                                    className={`flex items-center w-full px-4 py-3 text-xs font-bold transition-colors ${aspectRatio === r.value ? 'bg-violet-50 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    <r.icon className="w-4 h-4 mr-2" />
                                    {t[r.value] || r.value}
                                </button>
                            ))}
                        </div>
                    </>
                )}
             </div>
         </div>

         <div className="flex items-center gap-2">
             {/* Active Shape Commit Button */}
             {activeShape && (
                 <Button size="sm" onClick={commitShape} className="bg-green-600 hover:bg-green-500 text-white mr-2 border border-green-400/50 animate-pulse">
                     <Check className="w-4 h-4 mr-1" /> Apply Shape
                 </Button>
             )}

             <button onClick={() => setBackgroundColor(p => p === 'white' ? 'black' : p === 'black' ? 'transparent' : 'white')} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/50 rounded-lg" title="Toggle BG">
                {backgroundColor === 'white' ? <Square className="w-5 h-5 fill-white text-slate-900 dark:text-white" /> : backgroundColor === 'black' ? <Square className="w-5 h-5 fill-black text-slate-600" /> : <Grid className="w-5 h-5" />}
             </button>
             
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

             <button onClick={onOpenInfo} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <Info className="w-5 h-5" />
             </button>
             <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30">
                <Undo className="w-5 h-5" />
             </button>
             <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30">
                <Redo className="w-5 h-5" />
             </button>
             <Button size="sm" onClick={handleSave} className="ml-2">
                <Save className="w-4 h-4 mr-2" /> {t.sbSave}
             </Button>
         </div>
      </div>

      {/* Resume Dialog Overlay */}
      {showResumeDialog && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-violet-100 dark:bg-violet-600/20 rounded-full flex items-center justify-center mb-6 text-violet-600 dark:text-violet-400">
                      <Save className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Resume Project?</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8">We found an unsaved drawing from your last session. Would you like to continue working on it?</p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full">
                      <Button 
                          variant="secondary" 
                          onClick={handleNewProject}
                          className="h-auto py-4 flex flex-col items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/50 text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                          <FilePlus className="w-6 h-6" />
                          <span>New Drawing</span>
                      </Button>
                      <Button 
                          onClick={handleResumeProject}
                          className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-none text-white"
                      >
                          <FileDown className="w-6 h-6" />
                          <span>Resume</span>
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Workspace - Always keep background dark for drawing focus */}
      <div className="flex-1 relative overflow-hidden bg-[#e5e5e5] dark:bg-[#1a1a1a]" ref={containerRef}>
         <div 
            className="absolute origin-top-left shadow-2xl transition-transform duration-75"
            style={{ 
                width: canvasSize.width, 
                height: canvasSize.height,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
                backgroundImage: backgroundColor === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                cursor: ['rect', 'circle', 'line'].includes(activeTool) && activeShape ? 'move' : 'crosshair'
            }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
         >
            {/* Active Layers */}
            {layers.map(layer => (
                <canvas
                    key={layer.id}
                    ref={el => canvasRefs.current[layer.id] = el}
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                        opacity: layer.visible ? layer.opacity : 0,
                        zIndex: activeLayerId === layer.id ? 10 : 1 
                    }}
                />
            ))}
            
            {/* Interaction / Preview Layer */}
            <canvas
                ref={previewCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 50 }}
            />
         </div>
         
         {/* Zoom Controls */}
         <div className="absolute bottom-4 right-4 flex gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg backdrop-blur shadow-sm">
             <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 p-1 rounded"><Minus className="w-4 h-4" /></button>
             <span className="text-xs text-slate-800 dark:text-white w-12 text-center my-auto">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 p-1 rounded"><Plus className="w-4 h-4" /></button>
         </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 z-50 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
         <div className="flex flex-col gap-3 max-w-5xl mx-auto">
             
             {/* Row 1: Tools + Color + Properties */}
             <div className="flex items-center gap-4 px-2 overflow-x-auto scrollbar-hide pb-1">
                {/* Tools Group */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl">
                    {[
                        { id: 'pencil', icon: MousePointer2, label: t.sbPencil },
                        { id: 'pen', icon: PenTool, label: t.sbPen },
                        { id: 'brush', icon: Paintbrush, label: t.sbBrush },
                        { id: 'eraser', icon: Eraser, label: t.sbEraser },
                    ].map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id as ToolType)}
                            className={`p-3 rounded-xl flex flex-col items-center justify-center min-w-[56px] transition-all ${activeTool === tool.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-900/50 scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <tool.icon className="w-5 h-5 mb-1" />
                        </button>
                    ))}
                </div>
                
                {/* Color Wheel Picker Trigger */}
                <div className="relative group flex items-center justify-center">
                    <button 
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-[56px] h-[56px] rounded-full p-0.5 border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-white transition-all bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg relative"
                    >
                         {/* Conic Gradient Wheel Icon */}
                         <div 
                           className="w-full h-full rounded-full relative"
                           style={{ 
                             background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' 
                           }}
                         >
                             {/* Inner circle showing selected color */}
                             <div className="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: color }}></div>
                         </div>
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>

                {/* Sliders (Opacity & Size) - Expanded to fill remaining space */}
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <div className="flex-1">
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                            <span>{t.sbSize}</span>
                            <span>{size}px</span>
                        </div>
                        <input 
                            type="range" min="1" max="100" value={size} 
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                            <span>{t.sbOpacity}</span>
                            <span>{(opacity * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="1" step="0.1" value={opacity} 
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
                        />
                    </div>
                </div>
             </div>

             {/* Row 2: Shapes + Advanced Tools + Layers */}
             <div className="flex items-center justify-between gap-4 px-2 pt-2 border-t border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                 
                 {/* Layer Controls (Left) */}
                 <div className="flex items-center gap-2">
                     <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 pr-2">
                         <div className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg mr-2">
                            <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                         </div>
                         <select 
                            value={activeLayerId} 
                            onChange={(e) => setActiveLayerId(e.target.value)}
                            className="bg-transparent text-slate-900 dark:text-white text-xs border-none outline-none w-20 cursor-pointer"
                         >
                             {layers.map((l, i) => (
                                 <option key={l.id} value={l.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Layer {i + 1}</option>
                             ))}
                         </select>
                     </div>
                     <div className="flex gap-1">
                        <button onClick={addLayer} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title={t.sbAddLayer}>
                            <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={clearLayer} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title={t.sbClearLayer}>
                            <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                 </div>

                 {/* Shapes (Center) */}
                 <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/30 p-1 rounded-xl">
                     {[
                         { id: 'line', icon: Minus },
                         { id: 'rect', icon: Square },
                         { id: 'circle', icon: Circle },
                     ].map(shape => (
                         <button 
                            key={shape.id} 
                            onClick={() => setActiveTool(shape.id as ToolType)}
                            className={`p-2 rounded-lg transition-all ${activeTool === shape.id ? 'bg-violet-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                         >
                             <shape.icon className="w-4 h-4" />
                         </button>
                     ))}
                 </div>

                 {/* Helpers (Right) */}
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setIsSymmetry(!isSymmetry)} 
                        className={`p-2 rounded-xl transition-all ${isSymmetry ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title={t.sbSymmetry}
                    >
                         <Move className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => setIsStabilizer(!isStabilizer)} 
                        className={`p-2 rounded-xl transition-all ${isStabilizer ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title={t.sbStabilizer}
                    >
                         <Settings2 className="w-4 h-4" />
                     </button>
                 </div>
             </div>
         </div>
      </div>
      
      {/* Mini Color Wheel Popover - MOVED OUTSIDE OVERFLOW CONTAINER */}
      {showColorPicker && (
          <>
             <div className="fixed inset-0 z-[99]" onClick={() => setShowColorPicker(false)}></div>
             <div className="fixed bottom-24 left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-2xl z-[100] w-64 animate-in slide-in-from-bottom-2 zoom-in-95">
                 <div className="flex justify-between items-center mb-3">
                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Color Picker</span>
                     <button onClick={() => setShowColorPicker(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"><X className="w-4 h-4"/></button>
                 </div>
                 <div className="flex justify-center mb-4 relative">
                     <canvas 
                         ref={colorWheelRef}
                         width={200}
                         height={200}
                         className="rounded-full cursor-crosshair shadow-lg border border-slate-200 dark:border-slate-800 touch-none"
                         onMouseDown={handleColorInteractionStart}
                         onTouchStart={handleColorInteractionStart}
                     />

                     {/* Persistent Indicator on Wheel */}
                     <div 
                        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-sm pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ 
                            left: indicatorX, 
                            top: indicatorY,
                            backgroundColor: color
                        }}
                     />
                     
                     {/* Loupe / Color Magnifier */}
                     {loupePos && (
                        <div 
                          className="absolute w-16 h-16 rounded-full border-4 border-white shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-16 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center z-20"
                          style={{ left: loupePos.x, top: loupePos.y }}
                        >
                            <div className="absolute inset-0" style={{ backgroundColor: color }}></div>
                            <div className="w-1 h-1 bg-white/50 rounded-full z-10"></div>
                        </div>
                     )}
                 </div>
                 <div className="space-y-2">
                     <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                         <span>Lightness</span>
                         <span>{currentL}%</span>
                     </div>
                     <input 
                          type="range" 
                          min="0" max="100" 
                          value={currentL}
                          onChange={handleLightnessChange}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                          style={{ 
                              background: `linear-gradient(to right, #000000, ${pureColor}, #ffffff)` 
                          }}
                     />
                 </div>
                 <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                     <div className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700" style={{ backgroundColor: color }}></div>
                     <input 
                        type="text" 
                        value={hexInput}
                        onChange={handleHexChange}
                        className="bg-transparent border-none outline-none font-mono text-xs text-slate-600 dark:text-slate-300 uppercase text-right w-20 focus:text-slate-900 dark:focus:text-white focus:border-b focus:border-violet-500"
                        maxLength={7}
                     />
                 </div>
             </div>
          </>
      )}
    </div>
  );
};
