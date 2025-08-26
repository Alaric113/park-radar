// src/pages/HomePage.tsx
import React, { useState } from 'react';

const HomePage: React.FC = () => {
  const [message, setMessage] = useState<string>('Hello Parking PWA!');
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          {message}
        </h1>
        <button 
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          onClick={() => setMessage('準備開始開發！')}
        >
          點我測試
        </button>
      </div>
    </div>
  );
};

export default HomePage;
