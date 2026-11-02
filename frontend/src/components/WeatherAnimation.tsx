import React, { useMemo } from 'react';
import './WeatherAnimation.css';

interface WeatherAnimationProps {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
}

type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';

const WeatherAnimation: React.FC<WeatherAnimationProps> = ({
  temperature,
  humidity,
  rainfall,
  windSpeed,
  pressure,
  uvIndex,
  visibility
}) => {
  const condition = useMemo((): WeatherCondition => {
    // Determine weather condition based on data
    if (temperature < 0 && rainfall > 0.5) {
      return 'snowy';
    }
    if (windSpeed > 12 && rainfall > 1) {
      return 'stormy';
    }
    if (rainfall > 0.5) {
      return 'rainy';
    }
    if (visibility < 5) {
      return 'foggy';
    }
    if (humidity > 80 || (visibility >= 5 && visibility < 10)) {
      return 'cloudy';
    }
    return 'sunny';
  }, [temperature, humidity, rainfall, windSpeed, visibility]);

  return (
    <div className={`weather-animation weather-${condition}`}>
      {condition === 'sunny' && <SunnyScene uvIndex={uvIndex} />}
      {condition === 'cloudy' && <CloudyScene humidity={humidity} />}
      {condition === 'rainy' && <RainyScene rainfall={rainfall} />}
      {condition === 'stormy' && <StormyScene windSpeed={windSpeed} />}
      {condition === 'snowy' && <SnowyScene temperature={temperature} />}
      {condition === 'foggy' && <FoggyScene visibility={visibility} />}
      
      <div className="condition-label">{condition.charAt(0).toUpperCase() + condition.slice(1)}</div>
    </div>
  );
};

const SunnyScene: React.FC<{ uvIndex: number }> = ({ uvIndex }) => (
  <div className="scene sunny-scene">
    <div className="sky sunny-sky"></div>
    <div className="atmosphere-haze"></div>
    <div className="cloud distant-cloud dc1"></div>
    <div className="cloud distant-cloud dc2"></div>
    <div className="sun"></div>
    <div className="sun-rays"></div>
    <div className="ground"></div>
    <div className="uv-indicator" style={{ opacity: Math.min(uvIndex / 11, 1) }}>
      UV: {uvIndex.toFixed(1)}
    </div>
  </div>
);

const CloudyScene: React.FC<{ humidity: number }> = ({ humidity }) => (
  <div className="scene cloudy-scene">
    <div className="sky cloudy-sky"></div>
    <div className="cloud cloud1"></div>
    <div className="cloud cloud2"></div>
    <div className="cloud cloud3"></div>
    <div className="ground"></div>
    <div className="humidity-indicator">Humidity: {humidity}%</div>
  </div>
);

const RainyScene: React.FC<{ rainfall: number }> = ({ rainfall }) => (
  <div className="scene rainy-scene">
    <div className="sky rainy-sky"></div>
    <div className="cloud rain-cloud cloud1"></div>
    <div className="cloud rain-cloud cloud2"></div>
    <div className="rain-container">
      {[...Array(Math.min(15, Math.ceil(rainfall * 3)))].map((_, i) => (
        <div key={i} className="raindrop" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s` }}></div>
      ))}
    </div>
    <div className="ground"></div>
    <div className="rainfall-indicator">Rain: {rainfall.toFixed(1)}mm</div>
  </div>
);

const StormyScene: React.FC<{ windSpeed: number }> = ({ windSpeed }) => (
  <div className="scene stormy-scene">
    <div className="sky stormy-sky"></div>
    <div className="cloud storm-cloud cloud1"></div>
    <div className="cloud storm-cloud cloud2"></div>
    <div className="rain-container heavy">
      {[...Array(25)].map((_, i) => (
        <div key={i} className="raindrop heavy" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.3}s` }}></div>
      ))}
    </div>
    <div className="lightning"></div>
    <div className="ground storm-ground"></div>
    <div className="wind-indicator">Wind: {windSpeed.toFixed(1)} m/s</div>
  </div>
);

const SnowyScene: React.FC<{ temperature: number }> = ({ temperature }) => (
  <div className="scene snowy-scene">
    <div className="sky snowy-sky"></div>
    <div className="cloud snow-cloud cloud1"></div>
    <div className="cloud snow-cloud cloud2"></div>
    <div className="snow-container">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 1}s` }}></div>
      ))}
    </div>
    <div className="ground snowy-ground"></div>
    <div className="temperature-indicator">Temp: {temperature.toFixed(1)}°C</div>
  </div>
);

const FoggyScene: React.FC<{ visibility: number }> = ({ visibility }) => (
  <div className="scene foggy-scene">
    <div className="sky foggy-sky"></div>
    <div className="fog fog1"></div>
    <div className="fog fog2"></div>
    <div className="fog fog3"></div>
    <div className="ground"></div>
    <div className="visibility-indicator">Visibility: {visibility.toFixed(1)}km</div>
  </div>
);

export default WeatherAnimation;
