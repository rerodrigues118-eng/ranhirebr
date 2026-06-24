'use client';

import { useRef, useEffect, useState, RefObject } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

interface UseParallaxScrollReturn {
  frameIndex: number;
  progress: number;
  isVisible: boolean;
}

/**
 * Hook para detectar scroll parallax e calcular frame da animação
 * Monitora scroll relativo à Hero Section e calcula qual frame (0-45) deve ser exibido
 * com interpolação suave entre eles.
 * Respeita preferências de acessibilidade (prefers-reduced-motion)
 * 
 * @param containerRef - Ref da Hero Section container para tracking de scroll
 */
const useParallaxScroll = (containerRef?: RefObject<HTMLDivElement>): UseParallaxScrollReturn => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  const rafRef = useRef<number | null>(null);

  // Usar containerRef externo se fornecido, caso contrário manter ref local
  useEffect(() => {
    if (containerRef?.current) {
      heroRef.current = containerRef.current;
    }
  }, [containerRef]);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end center'],
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
        return;
      }

      // Calcular frame baseado no progresso de scroll (0-45 = 46 frames)
      const rawFrame = latest * 45;
      const calculatedFrameIndex = Math.floor(rawFrame);
      const interpolatedProgress = rawFrame - calculatedFrameIndex;
      const clampedFrame = Math.min(Math.max(calculatedFrameIndex, 0), 45);

      setFrameIndex(clampedFrame);
      setProgress(interpolatedProgress);
      setIsVisible(latest > 0);
    });
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Detectar se hero está na viewport usando Intersection Observer
  useEffect(() => {
    if (!heroRef.current) {
      return;
    }

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
  };
};

export { useParallaxScroll };
export type { UseParallaxScrollReturn };
export default useParallaxScroll;
