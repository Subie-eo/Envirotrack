import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
  uvIndex: number;
  visibility: number;
  solarRadiation: number;
}

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const newSocket = io(apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('weather-update', (update) => {
      console.log('Weather update received:', update);
      setWeatherData(update.data);
    });

    newSocket.on('status', (status) => {
      console.log('Server status:', status);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const toggleSimulation = () => {
    if (socket) {
      socket.emit('toggle-simulation');
    }
  };

  return {
    isConnected,
    weatherData,
    socket,
    toggleSimulation
  };
};
