import React, { useEffect, useRef } from 'react';
// @ts-ignore
import L from 'leaflet';
import './ClimateMap.css';

interface ClimateMapProps {
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
  visibility: number;
  uvIndex: number;
}

const ClimateMap: React.FC<ClimateMapProps> = ({
  latitude,
  longitude,
  temperature,
  humidity,
  pressure,
  windSpeed,
  windDirection,
  rainfall,
  visibility,
  uvIndex
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    // Initialize map only once
    if (map.current) return;

    if (!mapContainer.current) return;

    // Create map centered on the location
    map.current = L.map(mapContainer.current).setView([latitude, longitude], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add custom marker with weather data
    L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMjk2M2Y2Ii8+PC9zdmc+',
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -48]
      })
    }).addTo(map.current!);

    // Add isobar layer (pressure contours)
    const pressureColor = getPressureColor(pressure);
    L.circle([latitude, longitude], {
      color: pressureColor,
      fillColor: pressureColor,
      fillOpacity: 0.1,
      weight: 2,
      radius: visibilityToRadius(visibility),
    }).addTo(map.current);

    // Add wind barbs/arrows
    const windArrow = getWindArrow(windDirection, windSpeed);
    L.polyline([
      [latitude, longitude],
      [
        latitude + windArrow.latDelta,
        longitude + windArrow.lonDelta
      ]
    ], {
      color: getWindSpeedColor(windSpeed),
      weight: 3,
      opacity: 0.8,
    }).addTo(map.current);

    // Add temperature zones as circles
    const tempColor = getTemperatureColor(temperature);
    L.circle([latitude, longitude], {
      color: tempColor,
      fillColor: tempColor,
      fillOpacity: 0.15,
      weight: 1,
      radius: 5000, // 5km radius
    }).addTo(map.current);

    return () => {
      // Cleanup is handled by Leaflet
    };
  }, [latitude, longitude, temperature, humidity, pressure, windSpeed, windDirection, visibility]);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeMap = () => {
      map.current?.invalidateSize();
    };

    const observer = new ResizeObserver(() => {
      resizeMap();
    });

    observer.observe(mapContainer.current);

    // Keep map dimensions correct after initial mount and any CSS/layout changes.
    const timeoutId = window.setTimeout(resizeMap, 0);

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return <div ref={mapContainer} className="climate-map"></div>;
};

// Helper functions for visualization
function getTemperatureColor(temp: number): string {
  if (temp < -10) return '#0066ff'; // Deep blue - very cold
  if (temp < 0) return '#0099ff'; // Blue - cold
  if (temp < 10) return '#00ccff'; // Cyan - cool
  if (temp < 20) return '#00ff99'; // Green - mild
  if (temp < 30) return '#ffff00'; // Yellow - warm
  if (temp < 40) return '#ff9900'; // Orange - hot
  return '#ff0000'; // Red - very hot
}

function getPressureColor(pressure: number): string {
  if (pressure < 990) return '#ff0000'; // Red - low pressure
  if (pressure < 1000) return '#ff6600'; // Orange - low
  if (pressure < 1015) return '#ffff00'; // Yellow - moderate
  if (pressure < 1025) return '#00ff00'; // Green - normal
  return '#0066ff'; // Blue - high pressure
}

function getWindSpeedColor(speed: number): string {
  if (speed < 2) return '#0066ff'; // Blue - calm
  if (speed < 5) return '#00ff99'; // Green - light
  if (speed < 10) return '#ffff00'; // Yellow - moderate
  if (speed < 15) return '#ff9900'; // Orange - strong
  return '#ff0000'; // Red - very strong
}

function visibilityToRadius(visibility: number): number {
  return visibility * 1000; // Convert km to meters for map radius
}

function getWindArrow(direction: number, speed: number) {
  // Convert wind direction and speed to lat/lon deltas for arrow visualization
  const radians = (direction * Math.PI) / 180;
  const magnitude = Math.min(speed / 30, 0.1); // Normalize speed for display
  
  return {
    latDelta: Math.cos(radians) * magnitude,
    lonDelta: Math.sin(radians) * magnitude,
  };
}

export default ClimateMap;
