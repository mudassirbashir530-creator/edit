
import { Corner, BrandingConfig } from "../types";

export const processImage = async (
  backgroundImage: HTMLImageElement,
  logoImage: HTMLImageElement,
  bestCorner: Corner,
  config: BrandingConfig
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  
  if (!ctx) throw new Error("Could not initialize 2D context");

  // HD Resolution
  canvas.width = backgroundImage.naturalWidth;
  canvas.height = backgroundImage.naturalHeight;

  // 1. Draw Background
  ctx.drawImage(backgroundImage, 0, 0);

  // 2. Draw Subtle Central Watermark
  // Forced 1.1 Aspect Ratio (Width / Height = 1.1)
  const wmWidth = canvas.width * config.watermarkScale;
  const wmHeight = wmWidth / 1.1; 
  
  ctx.save();
  ctx.globalAlpha = config.watermarkOpacity; 
  ctx.drawImage(
    logoImage,
    (canvas.width - wmWidth) / 2,
    (canvas.height - wmHeight) / 2,
    wmWidth,
    wmHeight
  );
  ctx.restore();

  // 3. Draw Corner Brand Logo
  // Forced 1.1 Aspect Ratio (Width / Height = 1.1)
  const cornerLogoWidth = canvas.width * config.logoScale;
  const cornerLogoHeight = cornerLogoWidth / 1.1;
  const pad = config.logoPadding; 

  let x = pad;
  let y = pad;

  switch (bestCorner) {
    case 'top-left':
      x = pad;
      y = pad;
      break;
    case 'top-right':
      x = canvas.width - cornerLogoWidth - pad;
      y = pad;
      break;
    case 'bottom-left':
      x = pad;
      y = canvas.height - cornerLogoHeight - pad;
      break;
    case 'bottom-right':
      x = canvas.width - cornerLogoWidth - pad;
      y = canvas.height - cornerLogoHeight - pad;
      break;
  }

  // Corner logo is full opacity (1.0)
  ctx.drawImage(logoImage, x, y, cornerLogoWidth, cornerLogoHeight);

  // 4. Export to Ultra HD
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to blob"));
      },
      'image/jpeg',
      1.0 // Quality 100
    );
  });
};

export const fileToImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
  });
};
