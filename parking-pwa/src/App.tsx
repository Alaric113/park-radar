// src/App.tsx
import React from 'react';
import HomePage from './pages/HomePage';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="App h-min-screen" style={{height:'100vh'}}>
      <HomePage />
    </div>
  );
};

export default App;
