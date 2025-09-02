// src/pages/RadarMode.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';

const RadarMode: React.FC = () => {
  const { location } = useGeolocation();
  const [scanRange, setScanRange] = useState(2); // km
  const [parkingData, setParkingData] = useState([]);

  return (
    <div className="h-full bg-slate-900 relative overflow-hidden">
      {/* 雷達圓形顯示區域 */}
      <div className="absolute inset-4 rounded-full border border-green-400/30">
        <RadarDisplay 
          userPosition={location}
          parkingData={parkingData}
          scanRange={scanRange}
        />
      </div>
      
      {/* HUD 資訊面板 */}
      <HUDInfoPanel 
        scanRange={scanRange}
        onRangeChange={setScanRange}
        parkingCount={parkingData.length}
      />
    </div>
  );
};


export default RadarMode