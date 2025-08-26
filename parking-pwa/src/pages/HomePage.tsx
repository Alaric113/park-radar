// src/pages/HomePage.tsx (更新版)
import React from "react";
import Map from "../components/Map/MapContainer"; // Update the path to the correct location
import { useGeolocation } from "../hooks/useGeolocation";

const HomePage: React.FC = () => {
  const { location, error, loading } = useGeolocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>正在取得你的位置...</p>
        </div>
      </div>
    );
  }

  

  const center: [number, number] = location
    ? [location.latitude, location.longitude]
    : [25.0478, 121.517]; // 台北車站

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-800">停車場雷達</h1>
      </header>

      <main className="p-4">
        <Map center={center} zoom={15} />

        {location && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">當前位置</h3>
            <p>緯度: {location.latitude.toFixed(6)}</p>
            <p>經度: {location.longitude.toFixed(6)}</p>
            <p>精確度: {location.accuracy.toFixed(0)} 公尺</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
