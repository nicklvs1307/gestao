import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
  aspectRatio?: number;
}

export function ImageCropperModal({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete, 
  aspectRatio = 1 
}: ImageCropperModalProps) {
  useScrollLock(isOpen);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsSaving] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getCroppedImage = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsSaving(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Tamanho final desejado para performance (800x800px)
      const targetSize = 800;
      canvas.width = targetSize;
      canvas.height = targetSize / aspectRatio;

      const img = imageRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Cálculo do corte baseado no que o usuário vê no modal
      const scale = img.naturalWidth / (img.width * zoom);
      
      const cropX = (rect.width / 2 - offset.x - (img.width * zoom) / 2) * scale;
      const cropY = (rect.height / 2 - offset.y - (img.height * zoom) / 2) * scale;
      const cropWidth = rect.width * scale;
      const cropHeight = rect.height * scale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, canvas.width, canvas.height
      );

      // Converter para WebP com compressão de 0.8 para balanço ideal entre qualidade e peso
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onClose();
          }
          setIsSaving(false);
        },
        'image/webp',
        0.8
      );
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900 leading-none">Ajustar Imagem</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enquadre a melhor parte da foto</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-9 w-9">
                <X size={18} />
              </Button>
            </div>

            {/* Viewport de Corte */}
            <div className="relative bg-slate-100 aspect-square overflow-hidden cursor-move touch-none"
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
                 onTouchStart={handleMouseDown}
                 onTouchMove={handleMouseMove}
                 onTouchEnd={handleMouseUp}
            >
              {/* Moldura Guia */}
              <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/40">
                 <div className="w-full h-full border-2 border-white/50 border-dashed" />
              </div>

              <div ref={containerRef} className="w-full h-full flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop"
                  onLoad={handleImageLoad}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    maxWidth: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                  className="transition-transform duration-75"
                />
              </div>
            </div>

            {/* Controles */}
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <ZoomOut size={16} className="text-slate-400" />
                <input 
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-orange-500 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                />
                <ZoomIn size={16} className="text-slate-400" />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-11 font-black uppercase text-[10px] tracking-widest" onClick={onClose}>
                  CANCELAR
                </Button>
                <Button 
                  className="flex-[2] rounded-xl h-11 font-black italic uppercase text-[10px] tracking-widest gap-2"
                  onClick={getCroppedImage}
                  isLoading={isProcessing}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  CONCLUIR E OTIMIZAR
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
