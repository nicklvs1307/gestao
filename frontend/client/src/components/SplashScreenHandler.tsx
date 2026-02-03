import React from 'react';
import SplashScreen from './SplashScreen';
import { cn } from '../lib/utils';

interface SplashScreenHandlerProps {
  restaurantName: string;
  logoUrl: string;
  featuredImages: string[];
  children: React.ReactNode;
  showSplashScreen: boolean;
  isAppVisible: boolean;
  isExitingSplash: boolean;
  onStart: () => void;
}

const SplashScreenHandler: React.FC<SplashScreenHandlerProps> = ({ restaurantName, logoUrl, featuredImages, children, showSplashScreen, isAppVisible, isExitingSplash, onStart }) => {
  return (
    <>
      {showSplashScreen && (
        <SplashScreen 
          onStart={onStart}
          restaurantName={restaurantName}
          logoUrl={logoUrl}
          featuredImages={featuredImages}
          isExiting={isExitingSplash}
          isVisible={showSplashScreen}
        />
      )}
      <div className={cn(
        "transition-opacity duration-500 min-h-screen bg-background",
        isAppVisible ? "opacity-100" : "opacity-0"
      )}>
        {children}
      </div>
    </>
  );
};

export default SplashScreenHandler;