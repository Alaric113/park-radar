// src/components/Radar/RadarDisplay.tsx
const RadarDisplay: React.FC = ({ userPosition, parkingData, scanRange }) => {
  return (
    <div className="relative w-full h-full rounded-full">
      {/* 同心圓距離圈 */}
      <RadarGrid scanRange={scanRange} />
      
      {/* 掃描線動畫 */}
      <RadarScanLine />
      
      {/* 用戶中心點 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <motion.div 
          className="w-4 h-4 bg-blue-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {/* 停車場標記點 */}
      {parkingData?.map(spot => (
        <ParkingDot 
          key={spot.parkId}
          spot={spot}
          userPosition={userPosition}
          scanRange={scanRange}
        />
      ))}
    </div>
  );
};
