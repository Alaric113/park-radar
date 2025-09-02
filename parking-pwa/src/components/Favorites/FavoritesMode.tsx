// src/components/Favorites/FavoritesMode.tsx
import React from 'react';
import { Heart } from 'lucide-react';

const FavoritesMode: React.FC = () => {
  return (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center text-gray-600">
        <Heart size={48} className="mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold mb-2">我的收藏</h2>
        <p className="text-gray-500">尚未收藏任何停車場</p>
      </div>
    </div>
  );
};

export default FavoritesMode;
