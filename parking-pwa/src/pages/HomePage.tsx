// src/pages/HomePage.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Layout/Header';
import MapMode from '../components/Map/MapMode';
import RadarMode from '../components/Radar/RadarMode';
import FavoritesMode from '../components/Favorites/FavoritesMode';
import SettingsMode from '../components/Settings/SettingsMode';

type ViewMode = 'map' | 'radar' | 'settings' | 'favorites';

const HomePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  // 頁面切換動畫變體
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const renderCurrentMode = () => {
    switch (viewMode) {
      case 'map':
        return <MapMode key="map" />;
      case 'radar':
        return <RadarMode key="radar" />;
      case 'favorites':
        return <FavoritesMode key="favorites" />;
      case 'settings':
        return <SettingsMode key="settings" />;
      default:
        return <MapMode key="map" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 固定頂部導航 */}
      <Header 
        currentMode={viewMode} 
        onModeChange={setViewMode} 
      />
      
      {/* 主要內容區域 */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {renderCurrentMode()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HomePage;
