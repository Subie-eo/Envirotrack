import React from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import { useWebSocket } from './utils/useWebSocket';

function App() {
  const { isConnected, weatherData } = useWebSocket();

  return (
    <div className="App">
      <header className="app-header">
        <h1>🌦️ Robotic Weather Station</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>
      <main className="app-main">
        <Dashboard weather={weatherData} isConnected={isConnected} />
      </main>
    </div>
  );
}

export default App;
