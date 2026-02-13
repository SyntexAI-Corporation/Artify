
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Globe, Settings2, RotateCcw, Check, Ruler, Flag, Pause, Play, AlertTriangle, Crosshair, RefreshCw, Trash2, Info } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './ui/Button';

interface DigitalRulerProps {
  onBack: () => void;
  language: Language;
  toggleLanguage: () => void;
}

type Unit = 'px' | 'cm' | 'mm' | 'in';

export const DigitalRuler: React.FC<DigitalRulerProps> = ({ onBack, language, toggleLanguage }) => {
  const t = TRANSLATIONS[language];
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State
  const [isActive, setIsActive] = useState(false); 
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenImage, setFrozenImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Measurement Points (Separate States per Requirement)
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [draggingTarget, setDraggingTarget] = useState<'start' | 'end' | null>(null);
  
  // Settings & Calibration
  const [unit, setUnit] = useState<Unit>('cm');
  // Default Calibration: approx 96 DPI (37.8 px/cm). 
  const [pixelsPerUnit, setPixelsPerUnit] = useState(37.8); 
  const [showSettings, setShowSettings] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState<string>("");
  const [clickFeedback, setClickFeedback] = useState<{x: number, y: number} | null>(null);

  // --- Real-time Distance Calculation via Effect ---
  // Calculates Euclidean distance whenever startPoint or endPoint changes
  useEffect(() => {
    if (startPoint && endPoint) {
        const dist = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) + 
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        setDistance(dist);
    } else {
        setDistance(0);
    }
  }, [startPoint, endPoint]);

  const formattedDistance = (() => {
      if (distance === 0) return "0.00";
      
      let val = distance;
      
      // Convert pixels to target unit based on calibration
      if (unit !== 'px') {
          val = distance / pixelsPerUnit; 
          
          if (unit === 'mm') val *= 10;
          if (unit === 'in') val /= 2.54;
      }

      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  // --- Camera Lifecycle Management ---

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (isFrozen) return;

    setCameraError(null);
    try {
      if (streamRef.current) stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment', 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play error:", e));
            setIsActive(true);
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setCameraError("Camera access failed. Please check permissions.");
      setIsActive(false);
    }
  }, [isFrozen, stopCamera]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      } else {
        if (!isFrozen) startCamera();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startCamera();

    return () => {
      stopCamera();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startCamera, stopCamera, isFrozen]);

  const toggleFreeze = () => {
    if (isFrozen) {
        setFrozenImage(null);
        setIsFrozen(false);
        startCamera();
    } else {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            if (video.videoWidth && video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    setFrozenImage(canvas.toDataURL());
                    stopCamera();
                    setIsFrozen(true);
                }
            }
        }
    }
  };

  const addPoint = (x?: number, y?: number) => {
      // Don't add if both points already exist (must reset first)
      if (startPoint && endPoint) return;
      
      let newX = x;
      let newY = y;

      // If no coordinates provided (e.g. bottom button click), use center of container
      if (newX === undefined || newY === undefined) {
          if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              newX = rect.width / 2;
              newY = rect.height / 2;
          } else {
              return;
          }
      }

      setClickFeedback({ x: newX, y: newY });
      setTimeout(() => setClickFeedback(null), 300);

      if (!startPoint) {
          setStartPoint({ x: newX, y: newY });
      } else {
          // If auto-placing the second point, offset it slightly if it's too close to start
          if (x === undefined && y === undefined) {
              const dist = Math.sqrt(Math.pow(newX - startPoint.x, 2) + Math.pow(newY - startPoint.y, 2));
              if (dist < 40) {
                  newX += 50;
                  newY += 50;
              }
          }
          setEndPoint({ x: newX, y: newY });
      }
  };

  const handleReset = () => {
      setStartPoint(null);
      setEndPoint(null);
      setDistance(0);
  };

  const handleCalibrate = () => {
      if (distance === 0) {
          alert("Place 2 points on a known object first to calibrate.");
          return;
      }
      
      const val = parseFloat(calibrationValue);
      if (isNaN(val) || val <= 0) {
          alert("Please enter a valid number for real size.");
          return;
      }

      let cmDist = val;
      if (unit === 'mm') cmDist = val / 10;
      else if (unit === 'in') cmDist = val * 2.54;
      else if (unit === 'px') {
          alert("Cannot calibrate using pixels. Please select a physical unit.");
          return;
      }

      // Calculate new ratio: current_pixels / real_cm
      const newPixelsPerUnit = distance / cmDist;
      
      setPixelsPerUnit(newPixelsPerUnit);
      setShowSettings(false);
      setCalibrationValue("");
      alert(`Calibrated! Scale set to ${newPixelsPerUnit.toFixed(2)} px/cm`);
  };

  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, target: 'start' | 'end') => {
      e.stopPropagation(); 
      e.preventDefault();
      setDraggingTarget(target);
  };

  const handleContainerTap = (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingTarget !== null) return;
      if (startPoint && endPoint) return;

      let clientX, clientY;
      if ('touches' in e) {
          if (e.touches.length > 1) return;
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          addPoint(x, y);
      }
  };

  const handleContainerMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingTarget === null || !containerRef.current) return;
      e.preventDefault(); 

      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

      if (draggingTarget === 'start') {
          setStartPoint({ x, y });
      } else {
          setEndPoint({ x, y });
      }
  };

  const handleDragEnd = () => {
      setDraggingTarget(null);
  };

  const renderPoint = (p: {x: number, y: number}, isStart: boolean) => {
      const isDragging = draggingTarget === (isStart ? 'start' : 'end');
      return (
          <div
            key={isStart ? 'start' : 'end'}
            onMouseDown={(e) => handlePointerDown(e, isStart ? 'start' : 'end')}
            onTouchStart={(e) => handlePointerDown(e, isStart ? 'start' : 'end')}
            className="absolute w-12 h-12 -ml-6 -mt-12 flex flex-col items-center justify-end cursor-grab active:cursor-grabbing z-30 group touch-manipulation"
            style={{ left: p.x, top: p.y }}
          >
              <div className={`transition-transform duration-200 ${isDragging ? 'scale-125 -translate-y-6' : 'hover:scale-110'}`}>
                  <Flag className={`w-8 h-8 ${isStart ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'} drop-shadow-lg`} />
              </div>
              <div className="w-2 h-2 bg-white rounded-full shadow-sm mt-[-2px] ring-1 ring-black/20"></div>
              
              {isDragging && (
                  <div className="absolute bottom-20 w-24 h-24 rounded-full border-2 border-white pointer-events-none overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center shadow-2xl z-50">
                      <div className="w-full h-px bg-white/50 absolute"></div>
                      <div className="h-full w-px bg-white/50 absolute"></div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-md border-b border-white/10 z-50 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-3">
            <button 
                onClick={onBack}
                className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-violet-500" />
                {t.digitalRuler}
            </h1>
          </div>

          <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-violet-500/20 text-violet-400' : 'text-white hover:bg-white/10'}`}
             >
                 <Settings2 className="w-5 h-5" />
             </button>
             <button 
                onClick={toggleLanguage}
                className="p-2 text-white hover:bg-white/10 rounded-lg"
             >
                <Globe className="w-5 h-5" />
             </button>
          </div>
      </div>

      {/* Settings / Calibration Modal */}
      {showSettings && (
          <div className="absolute top-20 right-4 left-4 z-50 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm mx-auto animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-violet-500" />
                      {t.drCalibrate}
                  </h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><Settings2 className="w-4 h-4"/></button>
              </div>
              
              <div className="space-y-4">
                  <div className="bg-slate-800/50 p-3 rounded-lg flex gap-3 items-start border border-slate-700">
                      <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                      <p className="text-slate-300 text-xs leading-relaxed">{t.drCalibrationDesc}</p>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{t.drRealSize}</label>
                      <div className="flex gap-2">
                          <input 
                            type="number"
                            value={calibrationValue}
                            onChange={(e) => setCalibrationValue(e.target.value)}
                            placeholder="e.g. 8.56"
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500"
                          />
                          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm flex items-center justify-center font-bold min-w-[3rem] uppercase">
                              {unit}
                          </div>
                      </div>
                  </div>
                  <Button onClick={handleCalibrate} className="w-full">{t.drCalibrate}</Button>
              </div>
          </div>
      )}

      {/* Main Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-black touch-none overflow-hidden flex items-center justify-center"
        onMouseDown={handleContainerTap}
        onTouchStart={handleContainerTap}
        onMouseMove={handleContainerMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleContainerMove}
        onTouchEnd={handleDragEnd}
      >
          {/* Video Feed */}
          {!frozenImage && (
              <video 
                ref={videoRef} 
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                playsInline 
                muted 
                autoPlay
              />
          )}
          
          {/* Loading / Error State */}
          {!isActive && !frozenImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 p-6 text-center">
                  {cameraError ? (
                      <>
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <p className="text-white mb-6">{cameraError}</p>
                        <Button onClick={() => { setCameraError(null); startCamera(); }} variant="secondary">
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Camera
                        </Button>
                      </>
                  ) : (
                      <>
                        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-zinc-400 text-sm">Initializing Camera...</p>
                      </>
                  )}
              </div>
          )}
          
          {/* Frozen Image */}
          {frozenImage && (
              <img src={frozenImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" alt="Frozen view" />
          )}
          
          {/* Hidden Canvas for Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Center Aim Point - Helper for "Add Point" button */}
          {(!startPoint || !endPoint) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center opacity-50">
                  <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                  <div className="absolute w-6 h-px bg-white/50 rounded-full" />
                  <div className="absolute h-6 w-px bg-white/50 rounded-full" />
              </div>
          )}

          {/* Click Feedback */}
          {clickFeedback && (
              <div 
                className="absolute w-12 h-12 -ml-6 -mt-6 border-2 border-white rounded-full animate-ping opacity-75 pointer-events-none z-40"
                style={{ left: clickFeedback.x, top: clickFeedback.y }}
              />
          )}

          {/* SVG Overlay for Measurement Line */}
          {startPoint && endPoint && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                  <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="black" floodOpacity="0.8" />
                      </filter>
                  </defs>
                  <line 
                    x1={startPoint.x} y1={startPoint.y} 
                    x2={endPoint.x} y2={endPoint.y} 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="5,5"
                    filter="url(#shadow)"
                  />
                  {/* Distance Label with Dynamic Positioning */}
                  {(() => {
                      const midX = (startPoint.x + endPoint.x) / 2;
                      const midY = (startPoint.y + endPoint.y) / 2;
                      
                      let labelY = midY + 25;
                      // If points are very close, push label further down to avoid overlap
                      if (distance < 60) labelY += 20;

                      return (
                          <foreignObject 
                            x={midX - 60} 
                            y={labelY} 
                            width="120" 
                            height="40"
                          >
                              <div className="flex justify-center items-center">
                                  <div className="bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border border-white/20 select-none flex items-center gap-2">
                                      <span>{formattedDistance}</span>
                                      <span className="text-gray-400 text-[10px] uppercase">{unit}</span>
                                  </div>
                              </div>
                          </foreignObject>
                      );
                  })()}
              </svg>
          )}

          {/* Markers */}
          {startPoint && renderPoint(startPoint, true)}
          {endPoint && renderPoint(endPoint, false)}

          {/* Empty State Instruction */}
          {(!startPoint || !endPoint) && (
              <div className="absolute inset-x-0 bottom-32 flex justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg border border-white/10 animate-in slide-in-from-bottom-4 fade-in">
                      <Crosshair className="w-3 h-3" />
                      {t.drTapToPlace || "Tap screen or use button to place point"}
                  </div>
              </div>
          )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-safe z-50">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
              
              {/* Freeze Toggle */}
              <button 
                onClick={toggleFreeze}
                className={`p-3 rounded-full border transition-all ${isFrozen ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}`}
                title={isFrozen ? t.drUnfreeze : t.drFreeze}
              >
                  {isFrozen ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
              </button>

              {/* Main Action: Add Point */}
              <div className="flex-1 flex justify-center">
                  <button
                    onClick={() => addPoint()} 
                    disabled={!!startPoint && !!endPoint}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${(startPoint && endPoint) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:scale-105 active:scale-95'}`}
                  >
                      {(startPoint && endPoint) ? <Check className="w-8 h-8" /> : <Flag className="w-8 h-8" />}
                  </button>
              </div>

              {/* Reset */}
              <button 
                onClick={handleReset}
                className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-700 hover:bg-slate-700 transition-all"
                title={t.drReset}
              >
                  {(startPoint || endPoint) ? <Trash2 className="w-6 h-6 text-red-400" /> : <RotateCcw className="w-6 h-6" />}
              </button>
          </div>

          {/* Unit Selector Row */}
          <div className="flex justify-center mt-4">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['px', 'cm', 'mm', 'in'] as Unit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${unit === u ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                          {u}
                      </button>
                  ))}
              </div>
          </div>
      </div>

    </div>
  );
};
