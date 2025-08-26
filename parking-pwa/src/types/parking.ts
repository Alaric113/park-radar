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
  