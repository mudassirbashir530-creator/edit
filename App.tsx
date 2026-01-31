
import React, { useState } from 'react';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Settings, 
  Image as ImageIcon, 
  Trash2, 
  Play, 
  Download, 
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  Loader2,
  User
} from 'lucide-react';
import { ProcessingState, ImageFile, BrandingConfig } from './types';
import { findBestCorner } from './services/geminiService';
import { processImage, fileToImage, imageToBase64, removeLogoBackground } from './services/imageProcessor';

const App: React.FC = () => {
  const [logo, setLogo] = useState<ImageFile | null>(null);
  const [isCleaningLogo, setIsCleaningLogo] = useState(false);
  const [products, setProducts] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    total: 0,
    current: 0,
    status: ''
  });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config: Watermark 100% Size, 30% Opacity
  const [config] = useState<BrandingConfig>({
    watermarkOpacity: 0.3, 
    watermarkScale: 1.0,   
    logoScale: 0.20,       
    logoPadding: 20        
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      setIsCleaningLogo(true);
      
      try {
        const cleanedBlob = await removeLogoBackground(file);
        const cleanedFile = new File([cleanedBlob], "logo_transparent.png", { type: "image/png" });
        
        if (logo) URL.revokeObjectURL(logo.previewUrl);
        setLogo({ file: cleanedFile, previewUrl: URL.createObjectURL(cleanedFile) });
      } catch (err) {
        console.error("Logo cleaning error:", err);
        setError("Failed to clean logo background. Using original file.");
        setLogo({ file, previewUrl: URL.createObjectURL(file as Blob) });
      } finally {
        setIsCleaningLogo(false);
      }
    }
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newProducts = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file as Blob)
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
      setError("Please select your Brand Identity and Product Images first.");
      return;
    }

    setProcessing({
      isProcessing: true,
      total: products.length,
      current: 0,
      status: 'Booting engine...'
    });
    setZipBlob(null);
    setError(null);

    const zip = new JSZip();
    let logoImg: HTMLImageElement | null = await fileToImage(logo.file);

    try {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        setProcessing(prev => ({ 
          ...prev, 
          current: i + 1, 
          status: `Branding ${i + 1}/${products.length}...` 
        }));

        const b64 = await imageToBase64(product.file);
        const corner = await findBestCorner(b64);

        let productImg: HTMLImageElement | null = await fileToImage(product.file);
        if (logoImg) {
          const resultBlob = await processImage(productImg, logoImg, corner, config);
          const fileName = product.file.name.replace(/\.[^/.]+$/, "") + "_branded.jpg";
          zip.file(fileName, resultBlob);
        }

        if (productImg) {
          URL.revokeObjectURL(productImg.src);
          productImg = null;
        }
      }

      setProcessing(prev => ({ ...prev, status: 'Packing archive...' }));
      const finalZip = await zip.generateAsync({ type: 'blob', compression: "STORE" });
      setZipBlob(finalZip);
      setProcessing(prev => ({ ...prev, isProcessing: false, status: 'Success' }));
      logoImg = null;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Pipeline interrupted.");
      setProcessing(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const downloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branded_hd_pack_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-80 glass border-r border-slate-200 hidden lg:flex flex-col p-8 sticky top-0 h-screen"
      >
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Zap className="text-white" size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Studio Pro</h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">Ultra-HD Engine</p>
          </div>
        </div>

        <div className="space-y-10 flex-1">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Sparkles size={14} /> Brand Identity
            </h3>
            <div className="relative group">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleLogoUpload} disabled={isCleaningLogo} />
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`st-card rounded-2xl p-4 border-dashed border-2 flex flex-col items-center justify-center min-h-[160px] overflow-hidden group-hover:border-indigo-500/50 transition-all ${isCleaningLogo ? 'opacity-50 grayscale cursor-wait' : 'border-slate-200 bg-white/50'}`}
              >
                {isCleaningLogo ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="text-[10px] uppercase font-bold text-indigo-600">Removing BG...</span>
                  </div>
                ) : logo ? (
                  <motion.img 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={logo.previewUrl} 
                    className="w-full h-32 object-contain" 
                    alt="Logo" 
                  />
                ) : (
                  <>
                    <ImageIcon className="text-slate-400 mb-2" size={32} />
                    <span className="text-xs text-slate-500 font-medium">Upload Logo</span>
                  </>
                )}
              </motion.div>
            </div>
          </section>

          <section className="space-y-4">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings size={14} /> Pipeline Active
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Auto BG Removal', val: 'Active', color: 'text-emerald-600' },
                { label: 'Watermark Opacity', val: '30%', color: 'text-indigo-600' },
                { label: 'Watermark Coverage', val: '100%', color: 'text-emerald-600' },
                { label: 'Corner Brand', val: '20% Compact', color: 'text-purple-600' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-auto pt-8 border-t border-slate-100 space-y-4">
           <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
             <Layers size={12} />
             <span>Vercel Optimized Edge Studio</span>
           </div>
           <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
             <User size={14} className="text-indigo-500" />
             <span>Built by Mudassir Bashir</span>
           </div>
        </footer>
      </motion.aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <motion.header 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12"
          >
            <h2 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900">
              Bulk <span className="gradient-text">Image Branding</span>
            </h2>
            <p className="text-slate-500 text-lg font-medium">High-fidelity automation with AI background removal.</p>
          </motion.header>

          <AnimatePresence mode="wait">
            {!zipBlob ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="relative group">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    multiple 
                    accept="image/*" 
                    onChange={handleProductUpload}
                    disabled={processing.isProcessing}
                  />
                  <motion.div 
                    whileHover={{ scale: 1.002 }}
                    className="st-card rounded-[2.5rem] p-16 border-2 border-dashed border-slate-200 flex flex-col items-center text-center transition-all group-hover:border-indigo-400 group-hover:bg-white"
                  >
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-600">
                      <Upload size={40} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900">Stage Product Images</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Bulk upload product photos to apply automatic branding.</p>
                    
                    {products.length > 0 && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-xl shadow-indigo-600/20"
                      >
                        {products.length} Images Ready
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3"
                  >
                    <AlertCircle size={20} />
                    <span className="text-sm font-semibold">{error}</span>
                  </motion.div>
                )}

                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startProcessing}
                    disabled={processing.isProcessing || products.length === 0 || isCleaningLogo}
                    className="flex-1 st-button-primary h-14 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all"
                  >
                    {processing.isProcessing ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Processing Batch...</span>
                      </div>
                    ) : (
                      <>
                        <Play size={22} fill="currentColor" />
                        <span>Run Engine</span>
                      </>
                    )}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: '#fee2e2' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearProducts}
                    disabled={processing.isProcessing}
                    className="w-14 h-14 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all bg-white shadow-sm"
                  >
                    <Trash2 size={20} />
                  </motion.button>
                </div>

                {processing.isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{processing.status}</p>
                        <p className="text-2xl font-bold text-slate-900">{processing.current} <span className="text-slate-400">/ {processing.total}</span></p>
                      </div>
                      <p className="text-sm font-bold text-slate-500">{Math.round((processing.current / processing.total) * 100)}%</p>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(processing.current / processing.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="st-card rounded-[3rem] p-16 flex flex-col items-center text-center gap-6 shadow-xl shadow-slate-200/50"
              >
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                  <CheckCircle2 size={64} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold mb-2 text-slate-900">Processing Finished</h3>
                  <p className="text-slate-500 font-medium text-lg">Successfully applied branding to {products.length} images.</p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  <motion.button 
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={downloadZip}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Download size={22} />
                    Download HD Bundle
                  </motion.button>
                  <button 
                    onClick={() => { setZipBlob(null); setProducts([]); }}
                    className="text-sm text-slate-500 hover:text-indigo-600 font-bold transition-colors mt-2"
                  >
                    Start New Batch
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
