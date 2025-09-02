// src/components/Settings/SettingsMode.tsx
import React from 'react';
import { Settings } from 'lucide-react';

const SettingsMode: React.FC = () => {
  return (
    <div className="h-full bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Settings size={24} className="mr-2" />
          <h2 className="text-2xl font-bold">應用設定</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">通知設定</h3>
            <p className="text-gray-600 text-sm">即將推出...</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">偏好設定</h3>
            <p className="text-gray-600 text-sm">即將推出...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMode;
