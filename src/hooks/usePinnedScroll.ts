'use client';

import { useRef, useEffect, useState, RefObject } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

interface UsePinnedScrollReturn {
  frameIndex: number;
  progress: number;
  isVisible: boolean;
  isPinned: boolean; // true enquanto animação está ocorrendo
  pinProgress: number; // 0-1 durante o pin
}

/**
 * Hook para criar efeito de "pin" durante scroll animado
 * Texto fica fixo enquanto a animação dos frames ocorre
 * Após terminar, scroll volta ao normal
 * 
 * @param containerRef - Ref do container principal (hero section)
 */
const usePinnedScroll = (containerRef?: RefObject<HTMLDivElement>): UsePinnedScrollReturn => {
  const heroRef = useRef<HTMLDivElement>(containerRef?.current || null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinProgress, setPinProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  const rafRef = useRef<number | null>(null);

  // Sync external ref to local ref if provided
  useEffect(() => {
    if (containerRef?.current) {
      heroRef.current = containerRef.current;
    }
  }, [containerRef]);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });

  // Verificar preferências de acessibilidade
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      prefersReducedMotionRef.current = e.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Monitora mudanças no scrollYProgress
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (prefersReducedMotionRef.current) {
        setFrameIndex(latest > 0.5 ? 45 : 0);
        setProgress(0);
        setIsVisible(true);
        setIsPinned(false);
        setPinProgress(0);
        return;
      }

      // Animação ocorre entre 0-0.8 do scroll total
      // 0.8-1.0 é para "unpinning" e volta ao normal
      const ANIMATION_END = 0.8;
      
      let calcFrameIndex = 0;
      let calcProgress = 0;
      let isPinnedNow = false;
      let calcPinProgress = 0;

      if (latest <= ANIMATION_END) {
        // Durante animação: calculamos o frame baseado no scroll
        isPinnedNow = true;
        calcPinProgress = latest / ANIMATION_END;
        
        const rawFrame = calcPinProgress * 45;
        calcFrameIndex = Math.floor(rawFrame);
        calcProgress = rawFrame - calcFrameIndex;
        
        calcFrameIndex = Math.min(Math.max(calcFrameIndex, 0), 45);
      } else {
        // Após animação: deixa de pinnar e volta ao normal
        isPinnedNow = false;
        calcPinProgress = 1;
        calcFrameIndex = 45; // Fica no último frame
        calcProgress = 0;
      }

      setFrameIndex(calcFrameIndex);
      setProgress(calcProgress);
      setIsVisible(latest > 0);
      setIsPinned(isPinnedNow);
      setPinProgress(calcPinProgress);
    });
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Detectar se hero está na viewport
  useEffect(() => {
    if (!heroRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0);
      },
      { threshold: 0 }
    );

    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  return {
    frameIndex,
    progress,
    isVisible,
    isPinned,
    pinProgress,
  };
};

export { usePinnedScroll };
export type { UsePinnedScrollReturn };
export default usePinnedScroll;
