// src/types/parking.ts
export interface ParkingSpot {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    available: number;
    total: number;
    status: 'available' | 'limited' | 'full';
    address: string;
    distance?: number;
  }
  
  export interface UserLocation {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }
  
  export type ViewMode = 'map' | 'radar';
  

  export interface ParkingLot {
  parkId: string;
  parkName: string;
  servicetime: string;
  address: string | null;
  tel: string | null;
  payex: string;
  carTicketPrice: string | null;
  lon: number;
  lat: number;
  carTotalNum: number;
  carRemainderNum: number;
  motorTotalNum: number;
  motorRemainderNum: number;
  busTotalNum: number;
  busRemainderNum: number;
  largeMotorTotalNum: number;
  largeMotorRemainderNum: number;
  bikeTotalNum: number;
  pregnancy_First: number;
  pregnancy_FirstRemainderNum: number;
  handicap_First: number;
  handicap_FirstRemainderNum: number;
  chargeStationTotalNum: number;
  chargeStation: number;
  chargingCarInfo: any[] | null;
  fullRateLevel: number; // 0-3，用於顏色分級
  entrance: string | null;
  industryId: string | null;
  infoType: number;
  pointMapInfo: any | null;
  remark: string | null;
  wkt: string; // WKT格式的多邊形範圍
  dataType: string;
  cellShareTotalNum: number;
  cellSegAvail: number;
  remarkBm: string | null;
  publicPrivate: string | null;
}

export interface ParkingApiResponse {
  data: ParkingLot[];
  meta: {
    tokenSource: string;
    hasCookie: boolean;
    usedToken: boolean;
  };
}

// 地圖用的GeoJSON格式
export interface ParkingPolygon {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lon, lat], [lon, lat], ...]]
  };
  properties: {
    parkId: string;
    parkName: string;
    fullRateLevel: number;
    carRemainderNum: number;
    carTotalNum: number;
    // 其他需要在地圖上顯示的屬性
  };
}