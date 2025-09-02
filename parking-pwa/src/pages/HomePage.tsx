import React, { useState, useEffect } from "react";
import Map from "../components/Map/MapContainer";
import { useGeolocation } from "../hooks/useGeolocation";

interface ParkingData {
  // 根據你的 API 回應格式來定義介面
  // 例如:
  // id: number;
  // name: string;
  // availableSpaces: number;
}

const HomePage: React.FC = () => {
  const { location, error, loading } = useGeolocation();
  const [parkingData, setParkingData] = useState<ParkingData[] | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string>("");

  // 臺北車站的預設經緯度
  const defaultLocation = {
    latitude: 25.0478,
    longitude: 121.517,
  };

  // 判斷 API 基礎 URL，適用於本地開發和部署環境
  const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:8888'
    : `https://${window.location.hostname}`;

  useEffect(() => {
    // 當用戶位置成功獲取時，使用其位置
    if (location) {
      setInfoMessage("");
      
      getParkingInfo(location.longitude, location.latitude);
    } else if (error) {
      // 如果位置獲取失敗，使用預設位置
      setInfoMessage("無法取得你的位置，已使用預設地點（臺北車站）。");
      getParkingInfo(defaultLocation.longitude, defaultLocation.latitude);
    }
  }, [location, error]);

  async function getParkingInfo(longitude: number, latitude: number) {
    setIsFetching(true);
    const functionUrl = `${API_BASE_URL}/.netlify/functions/parks?longitude=${longitude}&latitude=${latitude}`;

    try {
      const response = await fetch(functionUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Function 請求失敗，詳細資訊: ${errorData.details}`);
      }

      const data = await response.json();
      setParkingData(data['data']);
      console.log("查詢成功！", data['data'][0]);
    } catch (err) {
      console.error("查詢失敗:", err);
      setParkingData(null); // 清空資料以顯示錯誤狀態
    } finally {
      setIsFetching(false);
    }
  }

  // 載入狀態顯示
  if (loading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{loading ? "正在取得你的位置..." : "正在查詢停車場資訊..."}</p>
        </div>
      </div>
    );
  }

  // 確定地圖中心點
  const center: [number, number] = location
    ? [location.latitude, location.longitude]
    : [defaultLocation.latitude, defaultLocation.longitude];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-800">停車場雷達</h1>
      </header>

      <main className="p-4" style={{ height: "calc(100% - 64px)" }}>
        <div className="h-full w-full">
          {/* 將 parkingData 傳遞給 MapContainer 組件 */}
          <Map center={center} zoom={18} parkingData={parkingData}/>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">
            {location ? "當前位置" : "預設位置"}
          </h3>
          {infoMessage && (
            <p className="text-sm text-red-500 mb-2">{infoMessage}</p>
          )}
          <p>緯度: {center[0].toFixed(6)}</p>
          <p>經度: {center[1].toFixed(6)}</p>
          {location && (
            <p>精確度: {location.accuracy.toFixed(0)} 公尺</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;