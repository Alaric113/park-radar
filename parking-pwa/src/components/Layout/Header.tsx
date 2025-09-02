// src/components/Layout/Header.tsx
import React from 'react';
import { Map, Radar, Settings, Heart } from 'lucide-react';

type ViewMode = 'map' | 'radar' | 'settings' | 'favorites';

interface HeaderProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange }) => {
  const tabs = [
    { key: 'map', label: '地圖', icon: Map },
    { key: 'radar', label: '雷達', icon: Radar },
    { key: 'favorites', label: '收藏', icon: Heart },
    { key: 'settings', label: '設定', icon: Settings },
  ] as const;

  return (
    <header className="bg-white shadow-md border-b">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Logo 和標題 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-s-800">
            🎯 停車雷達
          </h1>
          <div className="text-sm text-gray-500">
            Park Radar
          </div>
        </div>
        
        {/* 模式切換導航 */}
        <nav className="flex justify-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onModeChange(key)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200
                  ${currentMode === key 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }
                `}
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
