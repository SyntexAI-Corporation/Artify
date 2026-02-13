
import { PlanType, GenerationConfig, ArtStyle, AspectRatio } from "../types";
import { STYLE_DETAILS } from "../constants";

const getDimensions = (plan: PlanType, ratio: AspectRatio): { width: number, height: number } => {
  // Define base size based on plan rules (768 for Basic, 1024 for Plus)
  const baseSize = plan === PlanType.PLUS ? 1024 : 768;
  const baseArea = baseSize * baseSize;
  
  // Helper to snap to nearest multiple of 64
  const snap = (val: number) => Math.round(val / 64) * 64;

  let targetRatio = 1;
  switch (ratio) {
    case AspectRatio.PORTRAIT: targetRatio = 3/4; break;
    case AspectRatio.LANDSCAPE: targetRatio = 4/3; break;
    case AspectRatio.WIDE: targetRatio = 16/9; break;
    case AspectRatio.TALL: targetRatio = 9/16; break;
    case AspectRatio.SQUARE: 
    case AspectRatio.INFINITE: // Infinite falls back to square for generation
    default: 
        targetRatio = 1; 
        break;
  }

  // Calculate dimensions maintaining the same pixel count (Area) as the square base
  const width = Math.sqrt(baseArea * targetRatio);
  const height = Math.sqrt(baseArea / targetRatio);

  return { width: snap(width), height: snap(height) };
};

// --- PROVIDER IMPLEMENTATIONS ---

// 1. Kie AI / GPT4 (Primary)
// Maps to the t2i.mcpcore.xyz endpoint
async function generateKieAI(
  prompt: string, 
  style: ArtStyle, 
  width: number, 
  height: number, 
  signal: AbortSignal
): Promise<string> {
  const modelMap: Record<string, string> = {
    [ArtStyle.ANIME]: 'flux',
    [ArtStyle.CARTOON]: 'magic',
    [ArtStyle.CARICATURE]: 'magic',
    [ArtStyle.REALISTIC]: 'turbo',
    [ArtStyle.NONE]: 'turbo'
  };
  
  const model = modelMap[style] || 'turbo';

  const response = await fetch("https://t2i.mcpcore.xyz/api/free/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model,
      width,
      height
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`KieAI Provider Error: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle various potential response formats
  if (data.url) return data.url;
  if (data.image) return data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
  if (data.output?.url) return data.output.url;
  
  throw new Error("Invalid response format from KieAI");
}

// 2. Pollinations (Secondary)
// We fetch the blob to ensure it loads correctly before returning
async function generatePollinations(
  prompt: string, 
  style: ArtStyle, 
  width: number, 
  height: number,
  signal: AbortSignal
): Promise<string> {
  const safePrompt = encodeURIComponent(prompt.slice(0, 1000));
  const seed = Math.floor(Math.random() * 1000000000);
  
  let model = 'flux';
  if (style === ArtStyle.REALISTIC) model = 'flux-realism';
  if (style === ArtStyle.ANIME) model = 'flux-anime';
  if (style === ArtStyle.NONE) model = 'turbo';
  
  const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Pollinations Error: ${response.status}`);
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// 3. HuggingFace SDXL (Tertiary)
async function generateHuggingFace(prompt: string, signal: AbortSignal): Promise<string> {
  const endpoint = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt }),
    credentials: 'omit',
    signal
  });

  if (!response.ok) {
    throw new Error(`HF API Error: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// --- MAIN GENERATION FUNCTION (CORE EXECUTOR) ---

export const generateImage = async (config: GenerationConfig): Promise<string> => {
  const { prompt, style, plan, aspectRatio } = config;
  const { width, height } = getDimensions(plan, aspectRatio);
  const styleSuffix = STYLE_DETAILS[style]?.promptSuffix || "";
  
  // Prompt Adapter Logic
  const coreSubject = prompt.trim().slice(0, 300);
  const adapterTemplate = `${coreSubject}, realistic proportions, correct anatomy, high detail, clean background, professional style`;
  const finalPrompt = `${adapterTemplate}${styleSuffix}`;

  // Execution Helper: Runs a provider with an isolated timeout
  // This ensures that if one provider hangs, it doesn't abort the controllers for subsequent providers
  const executeProvider = async (
    name: string, 
    fn: (signal: AbortSignal) => Promise<string>,
    timeoutMs: number = 45000 
  ): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      console.log(`[Artify Core] Attempting Provider: ${name}`);
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
         console.warn(`[Artify Core] Provider ${name} timed out after ${timeoutMs}ms`);
      } else {
         console.warn(`[Artify Core] Provider ${name} failed:`, error.message || error);
      }
      throw error;
    }
  };

  // 1. Try Primary: Kie AI
  try {
    return await executeProvider("KieAI", (signal) => 
      generateKieAI(finalPrompt, style, width, height, signal)
    );
  } catch (e) {
    // Fallback to next
  }

  // 2. Try Secondary: Pollinations
  try {
    return await executeProvider("Pollinations", (signal) => 
      generatePollinations(finalPrompt, style, width, height, signal)
    );
  } catch (e) {
    // Fallback to next
  }

  // 3. Try Tertiary: HuggingFace SDXL
  try {
    return await executeProvider("HuggingFace", (signal) => 
      generateHuggingFace(finalPrompt, signal)
    );
  } catch (e) {
    // All failed
  }

  throw new Error("All image generation providers failed. Please check your connection or try again later.");
};
