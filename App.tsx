
import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  Settings, 
  Image as ImageIcon, 
  Trash2, 
  Play, 
  Download, 
  AlertCircle,
  CheckCircle2,
  Box,
  Key
} from 'lucide-react';
import { ProcessingState, ImageFile, BrandingConfig } from './types';
import { findBestCorner } from './services/geminiService';
import { processImage, fileToImage, imageToBase64 } from './services/imageProcessor';

const App: React.FC = () => {
  const [logo, setLogo] = useState<ImageFile | null>(null);
  const [products, setProducts] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    total: 0,
    current: 0,
    status: ''
  });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Updated Config: Increased scales and targeting a 1.1 aspect ratio for the logo display
  const [config] = useState<BrandingConfig>({
    watermarkOpacity: 0.3,
    watermarkScale: 0.65, // Increased to 65% of width
    logoScale: 0.35,      // Increased to 35% of width
    logoPadding: 50       // 50px margin
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (logo) URL.revokeObjectURL(logo.previewUrl);
      setLogo({ file, previewUrl: URL.createObjectURL(file) });
      setError(null);
    }
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newProducts = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setProducts(prev => [...prev, ...newProducts]);
    setError(null);
  };

  const clearProducts = () => {
    products.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setProducts([]);
    setZipBlob(null);
    setProcessing({ isProcessing: false, total: 0, current: 0, status: '' });
  };

  const startProcessing = async () => {
    if (!logo || products.length === 0) {
      setError("Please upload both a Brand Logo and at least one Product Image.");
      return;
    }

    setProcessing({
      isProcessing: true,
      total: products.length,
      current: 0,
      status: 'Initializing batch...'
    });
    setZipBlob(null);
    setError(null);

    const zip = new JSZip();
    let logoImg: HTMLImageElement | null = await fileToImage(logo.file);

    try {
      // Process one-by-one to avoid memory bloat
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        setProcessing(prev => ({ 
          ...prev, 
          current: i + 1, 
          status: `Processing image ${i + 1} of ${products.length}...` 
        }));

        // 1. AI Analysis (using scaled down b64 for speed)
        const b64 = await imageToBase64(product.file);
        const corner = await findBestCorner(b64);

        // 2. HD Canvas Processing
        let productImg: HTMLImageElement | null = await fileToImage(product.file);
        if (logoImg) {
          const resultBlob = await processImage(productImg, logoImg, corner, config);

          // 3. Add to ZIP
          const fileName = product.file.name.replace(/\.[^/.]+$/, "") + "_branded.jpg";
          zip.file(fileName, resultBlob);
        }

        // 4. Aggressive GC Emulation: Revoke ObjectURLs and delete references
        if (productImg) {
          URL.revokeObjectURL(productImg.src);
          productImg = null;
        }
      }

      setProcessing(prev => ({ ...prev, status: 'Finalizing ZIP archive...' }));
      const finalZip = await zip.generateAsync({ type: 'blob', compression: "STORE" });
      setZipBlob(finalZip);
      setProcessing(prev => ({ ...prev, isProcessing: false, status: 'Completed Successfully' }));
      
      // Clear logo reference
      logoImg = null;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during batch processing.");
      setProcessing(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const downloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branded_bulk_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Streamlit Aesthetic */}
      <aside className="w-80 st-sidebar hidden md:flex flex-col p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Box size={24} className="text-[#ff4b4b]" />
            Branding Studio
          </h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">High Performance Bulk</p>
        </div>

        <div className="space-y-8">
          {/* Logo Section */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> Brand Logo
            </label>
            <div className="st-card rounded-lg p-3 border-dashed border-2 border-zinc-700 hover:border-[#ff4b4b] transition-colors cursor-pointer relative group">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
              {logo ? (
                <img src={logo.previewUrl} className="w-full h-32 object-contain rounded" alt="Logo" />
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-zinc-500">
                  <Upload size={24} className="mb-2" />
                  <span className="text-xs">Browse files</span>
                </div>
              )}
            </div>
            {logo && <p className="text-[10px] text-zinc-500 mt-2 truncate">{logo.file.name}</p>}
          </div>

          {/* Settings Info */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={14} /> Pipeline Config
            </h3>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex justify-between">
                <span>Central Opacity</span>
                <span className="text-white">30%</span>
              </li>
              <li className="flex justify-between">
                <span>Watermark Size</span>
                <span className="text-white">{Math.round(config.watermarkScale * 100)}%</span>
              </li>
              <li className="flex justify-between">
                <span>Corner Logo (1.1 AR)</span>
                <span className="text-white">{Math.round(config.logoScale * 100)}% HD</span>
              </li>
              <li className="flex justify-between">
                <span>AI Logic</span>
                <span className="text-white">Gemini Flash</span>
              </li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-zinc-800">
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <Key size={16} /> Gemini API
            </label>
            <div className="text-xs p-3 bg-zinc-800/50 rounded text-zinc-500 italic">
              Fetched from system secrets
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto">
          <header className="mb-10">
            <h2 className="text-3xl font-bold mb-2">Bulk Image Branding</h2>
            <p className="text-zinc-500">Add ultra-hd watermarks and logos to thousands of images in seconds.</p>
          </header>

          <section className="space-y-6">
            {/* Multi-Image Uploader */}
            <div className="st-card rounded-xl p-8 border-2 border-dashed border-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center text-center cursor-pointer relative group">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                multiple 
                accept="image/*" 
                onChange={handleProductUpload}
                disabled={processing.isProcessing}
              />
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-[#ff4b4b]" size={32} />
              </div>
              <h3 className="text-lg font-semibold">Drop product images here</h3>
              <p className="text-sm text-zinc-500 mt-1">Supports bulk JPG, PNG, WEBP (HD Optimized)</p>
              {products.length > 0 && (
                <div className="mt-4 px-4 py-1 bg-[#ff4b4b]/10 text-[#ff4b4b] rounded-full text-sm font-bold">
                  {products.length} images staged
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              <button 
                onClick={startProcessing}
                disabled={processing.isProcessing || products.length === 0}
                className="flex-1 st-button-primary font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={20} />
                {processing.isProcessing ? 'Processing Batch...' : 'Start Branding Pipeline'}
              </button>
              <button 
                onClick={clearProducts}
                disabled={processing.isProcessing}
                className="px-6 py-3 border border-zinc-700 rounded-lg text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Progress & Status */}
            {(processing.isProcessing || zipBlob) && (
              <div className="space-y-4">
                {processing.isProcessing && (
                  <div className="st-warning p-4 rounded-lg flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        {processing.status}
                      </span>
                      <span>{Math.round((processing.current / processing.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 transition-all duration-300"
                        style={{ width: `${(processing.current / processing.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] opacity-70 italic">Client-side processing active. Please keep this tab open.</p>
                  </div>
                )}

                {zipBlob && (
                  <div className="st-success p-6 rounded-lg flex flex-col items-center text-center gap-4">
                    <CheckCircle2 size={48} className="text-[#3fb950]" />
                    <div>
                      <h4 className="text-xl font-bold">Branding Complete!</h4>
                      <p className="text-sm opacity-80 mt-1">All images processed with lanczos resampling and AI positioning.</p>
                    </div>
                    <button 
                      onClick={downloadZip}
                      className="w-full bg-[#3fb950] text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-[#2ea043] transition-colors"
                    >
                      <Download size={20} />
                      Download Ultra-HD ZIP ({products.length} images)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Minimal Info */}
          <footer className="mt-20 pt-8 border-t border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-bold">
              High Performance • Vercel Optimized • 100% Client-Side Private
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
