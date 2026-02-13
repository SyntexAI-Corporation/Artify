
export enum PlanType {
  BASIC = 'basic',
  PLUS = 'plus',
}

export enum ArtStyle {
  NONE = 'none',
  ANIME = 'anime',
  CARICATURE = 'caricature',
  REALISTIC = 'realistic',
  CARTOON = 'cartoon',
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
  INFINITE = 'infinite',
}

export type Language = 'en' | 'pt';

export interface GenerationConfig {
  prompt: string;
  style: ArtStyle;
  plan: PlanType;
  referenceImage?: File | null;
  aspectRatio: AspectRatio;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

// Editor Types
export type EditorTool = 'adjust' | 'filter' | 'crop' | 'draw' | 'text' | 'sticker' | 'layers' | 'import' | null;

export interface Layer {
  id: string;
  type: 'image' | 'text' | 'sticker' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  visible: boolean;
  content: string | DrawingPath; // URL for image, Text for text, Path for drawing
  style?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    opacity?: number;
    filter?: Adjustments; // Per-layer adjustments (mainly for images)
  };
}

export interface Adjustments {
  brightness: number; // 100 is default
  contrast: number;   // 100 is default
  saturation: number; // 100 is default
  blur: number;       // 0 is default
  hue: number;        // 0 is default
  sepia: number;      // 0 is default
  sharpen?: number;   // 0 is default
}

export interface Transform {
  rotate: number; // degrees
  flipH: boolean;
  flipV: boolean;
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}
