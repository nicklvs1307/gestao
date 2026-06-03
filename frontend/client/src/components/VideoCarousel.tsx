import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoCarouselProps {
  videos: string[];
}

const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    if (videos.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [videos, isPaused]);

  if (!videos || videos.length === 0) return null;

  return (
    <div 
      className="relative w-full h-40 md:h-56 overflow-hidden rounded-lg"
      role="region"
      aria-roledescription="carousel"
      aria-label="Vídeos promocionais"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
          role="group"
          aria-roledescription="slide"
          aria-label={`Vídeo ${currentIndex + 1} de ${videos.length}`}
        >
          <video
            src={videos[currentIndex]}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {videos.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`h-1 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${
              idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Ir para vídeo ${idx + 1}`}
            aria-current={idx === currentIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoCarousel;
