
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ProcessingState {
  isProcessing: boolean;
  total: number;
  current: number;
  status: string;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
}

export interface BrandingConfig {
  watermarkOpacity: number;
  watermarkScale: number;
  logoScale: number;
  logoPadding: number;
}
