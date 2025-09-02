// src/components/Radar/RadarMode.tsx
import React from 'react';

const RadarMode: React.FC = () => {
  return (
    <div className="h-full bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold mb-2">雷達模式</h2>
        <p className="text-gray-300">即將推出...</p>
        <div className="mt-8">
          <div className="w-48 h-48 border-2 border-green-400/30 rounded-full mx-auto flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMode;
