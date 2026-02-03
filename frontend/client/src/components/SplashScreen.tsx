import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onStart: () => void;
  restaurantName: string;
  logoUrl: string;
  featuredImages: string[]; // Nova prop para imagens dinâmicas
  isExiting?: boolean;
  isVisible?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, restaurantName, logoUrl, featuredImages, isExiting, isVisible }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (featuredImages.length === 0) return; // Não inicia o timer se não houver imagens

    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % featuredImages.length);
    }, 5000); // Muda de slide a cada 5 segundos

    return () => clearInterval(timer); // Limpa o intervalo quando o componente é desmontado
  }, [featuredImages.length]);

  return (
    <div className={`splash-screen ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}>
      <div className="splash-banner-container">
        {featuredImages.map((slideUrl, index) => (
          <div
            key={index}
            className={`banner-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slideUrl})` }}
          ></div>
        ))}
      </div>
      <div className="splash-overlay"></div>
      <div className="splash-content">
        {logoUrl && <img src={logoUrl} alt="Logo" className="splash-logo" />}
        <h1>{restaurantName}</h1>
        <p>Toque para iniciar uma experiência inesquecível</p>
        <button className="start-button" onClick={onStart}>
          Iniciar
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;