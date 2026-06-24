'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface HeroParallaxImageProps {
  currentFrameIndex: number;
  progress: number;
  isVisible: boolean;
  isPinned?: boolean;
}

/**
 * Componente que renderiza imagem parallax animada
 * - Exibe frames sequenciais baseado no scroll (46 frames totais)
 * - Faz preload dos próximos 3 frames
 * - Transições suaves com Framer Motion
 * - Otimizado com next/image
 * - Fallback automático para inicio.jpg em caso de erro
 * - Lazy loading com blur placeholder
 */
const HeroParallaxImage = ({
  currentFrameIndex,
  progress,
  isVisible,
  isPinned = false,
}: HeroParallaxImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [loadedFrames, setLoadedFrames] = useState<Set<number>>(new Set());

  // Derive current image path from frame index to avoid synchronous setState in effects
  const imageSrc = imageError ? '/inicio.jpg' : getFramePath(currentFrameIndex);

  /**
   * Gera caminho da imagem para um frame específico
   * Frames estão em /fotos-site/ezgif-frame-XXX.jpg
   * Onde XXX vai de 002 até 047 (46 frames totais)
   */
  const getFramePath = (frameIndex: number): string => {
    const paddedIndex = String(frameIndex + 2).padStart(3, '0');
    return `/fotos-site/ezgif-frame-${paddedIndex}.jpg`;
  };

  /**
   * Calcula quais frames devem estar pré-carregados
   */
  const framesToPreload = useMemo(() => {
    const frames = new Set<number>();
    frames.add(currentFrameIndex);
    
    for (let i = 1; i <= 3; i++) {
      const nextFrame = currentFrameIndex + i;
      if (nextFrame <= 45) {
        frames.add(nextFrame);
      }
    }
    
    return frames;
  }, [currentFrameIndex]);

  /**
   * Preload de imagens
   */
  useEffect(() => {
    if (!isVisible) return;

    framesToPreload.forEach((frameIndex) => {
      if (!loadedFrames.has(frameIndex)) {
        const img = new window.Image();
        const framePath = getFramePath(frameIndex);
        img.src = framePath;
        img.onload = () => {
          setLoadedFrames((prev) => new Set(prev).add(frameIndex));
        };
      }
    });
  }, [framesToPreload, loadedFrames, isVisible]);

  /**
   * Atualiza src quando frame muda
   */
  useEffect(() => {
    if (!isVisible) return;
    
    // imageSrc is derived from currentFrameIndex; imageError stays managed by onError
  }, [currentFrameIndex, isVisible]);

  /**
   * Escala suave baseada no progresso
   */
  const imageScale = 1 + progress * 0.02;

  /**
   * Fallback para inicio.jpg em caso de erro
   */
  const handleImageError = () => {
    setImageError(true);
  };

  if (!imageSrc) {
    return (
      <div 
        className={`relative overflow-hidden bg-zinc-950/40 animate-pulse ${
          isPinned 
            ? 'fixed inset-0 w-screen h-screen z-20' 
            : 'w-full h-[600px] rounded-3xl border border-white/10'
        }`}
      />
    );
  }

  return (
    <motion.div
      className={`relative overflow-hidden ${
        isPinned 
          ? 'fixed inset-0 w-screen h-screen z-20' 
          : 'w-full h-[600px] lg:h-[800px] rounded-3xl border border-white/10'
      }`}
      style={{
        backdropFilter: isPinned ? 'none' : 'blur(10px)',
        WebkitBackdropFilter: isPinned ? 'none' : 'blur(10px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-full h-full bg-gradient-to-b from-black/10 to-black/20 overflow-hidden">
        <motion.div
          className="relative w-full h-full"
          animate={{ scale: imageScale }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Image
            src={imageSrc}
            alt={`Hero parallax frame ${currentFrameIndex}`}
            fill
            sizes={isPinned ? '100vw' : '(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw'}
            priority={currentFrameIndex <= 2}
            quality={75}
            className={`object-cover ${!isPinned ? 'rounded-2xl' : ''}`}
            placeholder="blur"
            blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'%3E%3Crect fill='%23111827' width='1200' height='675'/%3E%3C/svg%3E"
            onError={handleImageError}
            loading={currentFrameIndex > 5 ? 'lazy' : 'eager'}
          />
        </motion.div>

        {/* Overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none ${!isPinned ? 'rounded-2xl' : ''}`} />
      </div>
    </motion.div>
  );
};

export default HeroParallaxImage;
