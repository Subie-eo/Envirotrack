import React, { useState, useEffect, useRef } from 'react';
import ClimateMap from '../components/ClimateMap';
import ControlAnalytics from '../components/ControlAnalytics';
import { weatherAPI } from '../utils/api';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

interface DashboardProps {
  weather: any;
  isConnected: boolean;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  solarRadiation?: number;
  rainfall?: number;
  uvIndex?: number;
  visibility?: number;
  hatchClosed?: boolean;
}

interface EventLogEntry {
  timestamp: string;
  message: string;
}

const STORM_ALERT_THRESHOLD_KMH = 50;
const WIND_HYSTERESIS_KMH = 5;
const PREDICTIVE_TENDENCY_LIMIT = -1.2;

const Dashboard: React.FC<DashboardProps> = ({ weather, isConnected }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [simulationMode, setSimulationMode] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState('dashboard');
  const [autoMode, setAutoMode] = useState(true);
  const [windLatchClosed, setWindLatchClosed] = useState(false);
  const [manualHatchClosed, setManualHatchClosed] = useState(false);
  const [lastAlertAckTime, setLastAlertAckTime] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  // Configuration parameters
  const [windSpeedLimit, setWindSpeedLimit] = useState(50);
  const [windHysteresisBuffer, setWindHysteresisBuffer] = useState(5);
  const [tempCalibrationOffset, setTempCalibrationOffset] = useState(0);
  const [pressureCalibrationOffset, setPressureCalibrationOffset] = useState(0);
  const [manualServoOverride, setManualServoOverride] = useState<number | null>(null);
  const previousHatchClosed = useRef<boolean | null>(null);
  const previousStormAlert = useRef<boolean | null>(null);
  const previousPredictiveOverride = useRef<boolean | null>(null);

  // Add new data points to chart
  useEffect(() => {
    if (weather) {
      const time = new Date(weather.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      setChartData(prev => {
        const currentTime = new Date(weather.timestamp).getTime();
        const sixHoursAgo = currentTime - 6 * 60 * 60 * 1000;
        const sampleWindKmh = (weather.windSpeed ?? 0) * 3.6;
        const sampleHumidity =
          (weather.humidity ?? 0) > 1
            ? weather.humidity
            : (prev.slice().reverse().find(point => (point.humidity ?? 0) > 1)?.humidity ?? 58);
        const sampleWindLatchClosed = sampleWindKmh >= STORM_ALERT_THRESHOLD_KMH
          ? true
          : sampleWindKmh <= STORM_ALERT_THRESHOLD_KMH - WIND_HYSTERESIS_KMH
            ? false
            : windLatchClosed;
        const sampleAutoCloseCommand = sampleWindLatchClosed || (weather.rainfall ?? 0) > 0.2;
        const sampleHatchClosed = autoMode ? sampleAutoCloseCommand : manualHatchClosed;

        const newData = [
          ...prev,
          {
            time,
            timestamp: currentTime,
            temperature: weather.temperature,
            humidity: sampleHumidity,
            pressure: weather.pressure,
            windSpeed: weather.windSpeed,
            solarRadiation: weather.solarRadiation,
            rainfall: weather.rainfall,
            uvIndex: weather.uvIndex,
            visibility: weather.visibility,
            hatchClosed: sampleHatchClosed
          }
        ];

        // Keep only points in the last 6 hours
        let filteredData = newData.filter(point => point.timestamp >= sixHoursAgo);

        // If we only have a single point, pad with a start point for visible trend rendering.
        if (filteredData.length === 1) {
          const firstMetricPoint = filteredData[0];
          filteredData = [
            {
              ...firstMetricPoint,
              timestamp: sixHoursAgo,
              time: new Date(sixHoursAgo).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })
            },
            firstMetricPoint
          ];
        }

        return filteredData;
      });
    }
  }, [weather, autoMode, manualHatchClosed, windLatchClosed]);

  const handleToggleSimulation = async () => {
    try {
      await weatherAPI.toggleSimulation();
      setSimulationMode(!simulationMode);
    } catch (error) {
      console.error('Failed to toggle simulation:', error);
    }
  };

  const appendEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setEventLog(prev => [{ timestamp, message }, ...prev].slice(0, 12));
  };

  const handleToggleAutomation = () => {
    setAutoMode(prev => {
      const next = !prev;
      appendEvent(next ? 'Automation enabled' : 'Manual override enabled');
      return next;
    });
  };

  const handleManualHatchToggle = () => {
    setManualHatchClosed(prev => {
      const next = !prev;
      appendEvent(next ? 'Manual hatch command: CLOSED' : 'Manual hatch command: OPEN');
      return next;
    });
  };

  const handleOpenTrendsView = () => {
    setActiveSidebarItem('trends');
  };

  const handleReturnToDashboard = () => {
    setActiveSidebarItem('dashboard');
  };

  const handleAcknowledgeAlerts = () => {
    const ackTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastAlertAckTime(ackTime);
    appendEvent('Operator acknowledged active alerts');
  };

  const handleResetSimulator = async () => {
    try {
      await weatherAPI.resetSimulator();
      setChartData([]);
      appendEvent('Simulator reset completed');
    } catch (error) {
      console.error('Failed to reset simulator:', error);
    }
  };

  const handleWindLimitChange = (value: number) => {
    setWindSpeedLimit(value);
    appendEvent(`Wind speed limit updated to ${value} km/h`);
  };

  const handleHysteresisChange = (value: number) => {
    setWindHysteresisBuffer(value);
    appendEvent(`Hysteresis buffer updated to ${value} km/h`);
  };

  const handleTempOffsetChange = (value: number) => {
    setTempCalibrationOffset(value);
    appendEvent(`Temperature calibration offset set to ${value}°C`);
  };

  const handlePressureOffsetChange = (value: number) => {
    setPressureCalibrationOffset(value);
    appendEvent(`Pressure calibration offset set to ${value} hPa`);
  };

  const handleManualServoChange = (value: number) => {
    setManualServoOverride(value);
    appendEvent(`Manual servo override set to ${value}°`);
  };

  const windKmh = (weather?.windSpeed ?? 0) * 3.6;
  const closeThreshold = windSpeedLimit;
  const openThreshold = windSpeedLimit - windHysteresisBuffer;
  const adjustedTemp = (weather?.temperature ?? 0) + tempCalibrationOffset;
  const adjustedPressure = (weather?.pressure ?? 0) + pressureCalibrationOffset;
  const displayHumidity = (weather?.humidity ?? 0) > 1
    ? (weather?.humidity ?? 0)
    : (chartData.slice().reverse().find(point => (point.humidity ?? 0) > 1)?.humidity ?? 58);
  const maxWindGustKmh = Math.max(
    windKmh,
    ...chartData.map(point => (point.windSpeed ?? 0) * 3.6)
  );
  const stormAlert = windLatchClosed;
  const pressureTendency3h = (() => {
    if (chartData.length < 2) return 0;

    const latest = chartData[chartData.length - 1];
    const targetTimestamp = latest.timestamp - 3 * 60 * 60 * 1000;

    const prior = chartData.reduce((closest, point) => {
      const currentDelta = Math.abs(point.timestamp - targetTimestamp);
      const closestDelta = Math.abs(closest.timestamp - targetTimestamp);
      return currentDelta < closestDelta ? point : closest;
    }, chartData[0]);

    return (latest.pressure ?? 0) - (prior.pressure ?? 0);
  })();
  const predictiveOverrideActive = autoMode && pressureTendency3h <= PREDICTIVE_TENDENCY_LIMIT;
  const autoCloseCommand = stormAlert || (weather?.rainfall ?? 0) > 0.2 || predictiveOverrideActive;
  const hatchClosed = autoMode ? autoCloseCommand : manualHatchClosed;
  const servoAngle = manualServoOverride !== null && !autoMode ? manualServoOverride : (hatchClosed ? 180 : 0);
  const isUvSensorOffline = (weather?.uvIndex ?? 0) === 0 && (weather?.solarRadiation ?? 0) === 0;
  const isRainSensorOffline = (weather?.rainfall ?? 0) === 0 && (weather?.humidity ?? 0) === 0;
  const solarChargeCurrent = (weather?.solarRadiation ?? 0) > 0
    ? Math.round((weather?.solarRadiation ?? 0) * 1.8)
    : -120;
  const activeAlerts = [
    stormAlert ? `High Wind (${windKmh.toFixed(1)} km/h) - hatch safeguard engaged` : null,
    predictiveOverrideActive ? `Predictive Override (${pressureTendency3h.toFixed(1)} hPa/3hr tendency)` : null,
    !isConnected ? 'Backend connection offline' : null,
    isUvSensorOffline ? 'UV sensor offline' : null,
    isRainSensorOffline ? 'Rain sensor offline' : null
  ].filter((alert): alert is string => Boolean(alert));

  useEffect(() => {
    if (windKmh >= closeThreshold && !windLatchClosed) {
      setWindLatchClosed(true);
      return;
    }

    if (windKmh <= openThreshold && windLatchClosed) {
      setWindLatchClosed(false);
    }
  }, [windKmh, closeThreshold, openThreshold, windLatchClosed]);

  useEffect(() => {
    if (!weather) return;

    if (previousStormAlert.current === null) {
      previousStormAlert.current = stormAlert;
    } else if (stormAlert !== previousStormAlert.current) {
      if (stormAlert) {
        appendEvent(`High Wind Detected (${windKmh.toFixed(0)} km/h)`);
      } else {
        appendEvent(`Wind Normalized (${windKmh.toFixed(0)} km/h)`);
      }
      previousStormAlert.current = stormAlert;
    }

    if (previousHatchClosed.current === null) {
      previousHatchClosed.current = hatchClosed;
    } else if (hatchClosed !== previousHatchClosed.current) {
      if (hatchClosed) {
        appendEvent(`Servo Actuated to ${servoAngle}°`);
        appendEvent('Station Shielded');
      } else {
        appendEvent(`Servo Actuated to ${servoAngle}°`);
        appendEvent('Station Exposed');
      }
      previousHatchClosed.current = hatchClosed;
    }

    if (previousPredictiveOverride.current === null) {
      previousPredictiveOverride.current = predictiveOverrideActive;
      return;
    }

    if (predictiveOverrideActive !== previousPredictiveOverride.current) {
      appendEvent(
        predictiveOverrideActive
          ? `Predictive override engaged (${pressureTendency3h.toFixed(1)} hPa/3hr)`
          : 'Predictive override cleared'
      );
      previousPredictiveOverride.current = predictiveOverrideActive;
    }
  }, [weather, stormAlert, hatchClosed, servoAngle, windKmh, predictiveOverrideActive, pressureTendency3h]);

  if (!weather) {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <button className="sidebar-logo" onClick={handleReturnToDashboard} title="Dashboard Home">
            <div className="logo-icon">📡</div>
          </button>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeSidebarItem === 'trends' ? 'active' : ''}`}
              onClick={handleOpenTrendsView}
              title="Trends"
            >
              📊
            </button>
            <button
              className={`nav-item ${activeSidebarItem === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveSidebarItem('alerts')}
              title="Alerts"
            >
              🔔
            </button>
            <button
              className={`nav-item ${activeSidebarItem === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveSidebarItem('settings')}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              className={`nav-item ${activeSidebarItem === 'info' ? 'active' : ''}`}
              onClick={() => setActiveSidebarItem('info')}
              title="Info"
            >
              ℹ️
            </button>
          </nav>
        </aside>
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Waiting for weather data...</p>
            {!isConnected && <p className="connection-warning">⚠️ Not connected to server</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Left Sidebar Navigation */}
      <aside className="sidebar">
        <button className="sidebar-logo" onClick={handleReturnToDashboard} title="Dashboard Home">
          <div className="logo-icon">📡</div>
        </button>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSidebarItem === 'trends' ? 'active' : ''}`}
            onClick={handleOpenTrendsView}
            title="Trends"
          >
            📊
          </button>
          <button
            className={`nav-item ${activeSidebarItem === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveSidebarItem('alerts')}
            title="Alerts"
          >
            🔔
          </button>
          <button
            className={`nav-item ${activeSidebarItem === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSidebarItem('settings')}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            className={`nav-item ${activeSidebarItem === 'info' ? 'active' : ''}`}
            onClick={() => setActiveSidebarItem('info')}
            title="Info"
          >
            ℹ️
          </button>
        </nav>
      </aside>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1 className="station-title">WEATHER STATION 740</h1>
            <div className="header-info">
              <div className="info-item">
                <span className="info-label">Location</span>
                <span className="info-value">Nairobi, KE</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`info-value status ${isConnected ? 'operational' : 'offline'}`}>
                  {isConnected ? '● OPERATIONAL' : '● OFFLINE'}
                </span>
              </div>
            </div>
            <div className={`hatch-state-banner ${hatchClosed ? 'closed' : 'open'}`}>
              HATCH {hatchClosed ? 'CLOSED' : 'OPEN'}
            </div>
            {predictiveOverrideActive && !stormAlert && (
              <div className="hatch-state-note">Predictive override active (pressure tendency trigger)</div>
            )}
          </div>
          <div className="header-right">
            <div className="time-display">
              <div className="time-item">
                <span className="time-label">Last Sync</span>
                <span className="time-value">{weather?.timestamp ? new Date(weather.timestamp).toLocaleTimeString() : '--:--:--'}</span>
              </div>
              <div className="time-item">
                <span className="time-label">Current Time</span>
                <span className="time-value">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {activeSidebarItem === 'trends' ? (
          <div className="trends-page">
            <div className="trends-page-header">
              <h2 className="section-title">SYSTEM STATUS: STORM ALGORITHM ACTIVE (Predictive Control enabled).</h2>
            </div>
            <ControlAnalytics
              sourceData={chartData}
              currentWindKmh={windKmh}
              currentServoAngle={servoAngle}
              hatchClosed={hatchClosed}
              predictiveOverrideActive={predictiveOverrideActive}
            />
          </div>
        ) : activeSidebarItem === 'alerts' ? (
          <div className="module-page">
            <div className="module-page-header">
              <h2 className="section-title">ALERT CENTER</h2>
              <button className="control-btn" onClick={handleAcknowledgeAlerts}>Acknowledge Alerts</button>
            </div>
            <div className="module-grid two">
              <div className="section">
                <h3 className="module-card-title">Active Alerts</h3>
                {activeAlerts.length === 0 ? (
                  <p className="no-data">No active alerts.</p>
                ) : (
                  <div className="alert-list">
                    {activeAlerts.map((alert, index) => (
                      <div key={`${alert}-${index}`} className="alert-item">
                        <span className="alert-dot">●</span>
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="section">
                <h3 className="module-card-title">Alert Metadata</h3>
                <div className="module-kv-list">
                  <div className="module-kv-item"><span>Last acknowledgement</span><strong>{lastAlertAckTime ?? 'Never'}</strong></div>
                  <div className="module-kv-item"><span>Wind threshold</span><strong>{STORM_ALERT_THRESHOLD_KMH} km/h</strong></div>
                  <div className="module-kv-item"><span>Current wind</span><strong>{windKmh.toFixed(1)} km/h</strong></div>
                  <div className="module-kv-item"><span>Hatch state</span><strong>{hatchClosed ? 'CLOSED' : 'OPEN'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        ) : activeSidebarItem === 'settings' ? (
          <div className="module-page">
            <div className="module-page-header">
              <h2 className="section-title">SETTINGS</h2>
            </div>
            <div className="module-grid two">
              <div className="section">
                <h3 className="module-card-title">System Controls</h3>
                <div className="module-actions">
                  <button className={`control-btn ${simulationMode ? 'active' : ''}`} onClick={handleToggleSimulation}>
                    {simulationMode ? 'Simulation Active' : 'Live Data'}
                  </button>
                  <button className={`control-btn ${autoMode ? 'active' : ''}`} onClick={handleToggleAutomation}>
                    {autoMode ? 'Auto Mode' : 'Manual Override'}
                  </button>
                  {!autoMode && (
                    <button className="control-btn secondary" onClick={handleManualHatchToggle}>
                      {manualHatchClosed ? 'Open Hatch' : 'Close Hatch'}
                    </button>
                  )}
                  <button className="control-btn neutral" onClick={handleResetSimulator}>Reset Simulator</button>
                </div>
              </div>
              <div className="section">
                <h3 className="module-card-title">Control Status</h3>
                <div className="module-kv-list">
                  <div className="module-kv-item">
                    <span>Automation</span>
                    <strong className={autoMode ? 'status-enabled' : 'status-manual'}>
                      {autoMode ? 'Enabled' : 'Manual'}
                    </strong>
                  </div>
                  <div className="module-kv-item">
                    <span>Actuator Angle</span>
                    <strong>{servoAngle}°</strong>
                  </div>
                  <div className="module-kv-item">
                    <span>Simulation</span>
                    <strong>{simulationMode ? 'On' : 'Off'}</strong>
                  </div>
                  <div className="module-kv-item">
                    <span>Connection</span>
                    <strong>{isConnected ? 'Online' : 'Offline'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="config-section">
              <h3 className="module-card-title">Automation Thresholds</h3>
              <div className="config-grid">
                <div className="config-item">
                  <label>Wind Speed Limit (km/h)</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={windSpeedLimit}
                      onChange={(e) => handleWindLimitChange(Number(e.target.value))}
                      className="slider"
                    />
                    <span className="slider-value">{windSpeedLimit}</span>
                  </div>
                </div>
                <div className="config-item">
                  <label>Release Buffer / Hysteresis (km/h)</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={windHysteresisBuffer}
                      onChange={(e) => handleHysteresisChange(Number(e.target.value))}
                      className="slider"
                    />
                    <span className="slider-value">{windHysteresisBuffer}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="config-section">
              <h3 className="module-card-title">Calibration Offsets</h3>
              <div className="config-grid">
                <div className="config-item">
                  <label>Temperature Offset (°C)</label>
                  <div className="offset-input-container">
                    <input
                      type="number"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={tempCalibrationOffset}
                      onChange={(e) => handleTempOffsetChange(Number(e.target.value))}
                      className="offset-input"
                    />
                    <span className="offset-display">Adjusted: {adjustedTemp.toFixed(1)}°C</span>
                  </div>
                </div>
                <div className="config-item">
                  <label>Pressure Offset (hPa)</label>
                  <div className="offset-input-container">
                    <input
                      type="number"
                      min="-50"
                      max="50"
                      step="0.1"
                      value={pressureCalibrationOffset}
                      onChange={(e) => handlePressureOffsetChange(Number(e.target.value))}
                      className="offset-input"
                    />
                    <span className="offset-display">Adjusted: {adjustedPressure.toFixed(1)} hPa</span>
                  </div>
                </div>
              </div>
            </div>

            {!autoMode && (
              <div className="config-section">
                <h3 className="module-card-title">Manual Actuator Control</h3>
                <div className="config-item manual-servo">
                  <label>Manual Hatch Override Position</label>
                  <div className="slider-container">
                    <span className="servo-label">0°</span>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={manualServoOverride ?? 0}
                      onChange={(e) => handleManualServoChange(Number(e.target.value))}
                      className="slider"
                    />
                    <span className="servo-label">180°</span>
                  </div>
                  <div className="servo-display">
                    <span className="servo-value">{(manualServoOverride ?? 0).toFixed(0)}°</span>
                    <span className="servo-status">{(manualServoOverride ?? 0) === 0 ? 'OPEN' : (manualServoOverride ?? 0) === 180 ? 'CLOSED' : 'INTERMEDIATE'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeSidebarItem === 'info' ? (
          <div className="module-page">
            <div className="module-page-header">
              <h2 className="section-title">SYSTEM INFO</h2>
            </div>
            <div className="module-grid two">
              <div className="section">
                <h3 className="module-card-title">Station Profile</h3>
                <div className="module-kv-list">
                  <div className="module-kv-item"><span>Station ID</span><strong>WS-740</strong></div>
                  <div className="module-kv-item"><span>Coordinates</span><strong>-1.2833, 36.8167</strong></div>
                  <div className="module-kv-item"><span>Weather source</span><strong>Open-Meteo</strong></div>
                  <div className="module-kv-item"><span>Data cadence</span><strong>15 min</strong></div>
                </div>
              </div>
              <div className="section">
                <h3 className="module-card-title">Live Snapshot</h3>
                <div className="module-kv-list">
                  <div className="module-kv-item"><span>Temperature</span><strong>{(weather?.temperature ?? 0).toFixed(1)}°C</strong></div>
                  <div className="module-kv-item"><span>Pressure</span><strong>{(weather?.pressure ?? 0).toFixed(1)} hPa</strong></div>
                  <div className="module-kv-item"><span>Wind</span><strong>{windKmh.toFixed(1)} km/h</strong></div>
                  <div className="module-kv-item"><span>Last Sync</span><strong>{new Date(weather?.timestamp).toLocaleTimeString()}</strong></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* 3-Column Main Layout */}
        <div className="main-layout">
          {/* Left Column: Current Conditions */}
          <div className="column column-left">
            <div className="section">
              <h2 className="section-title">CURRENT CONDITIONS</h2>
              <div className="conditions-grid">
                <div className="condition-item">
                  <span className="condition-label">TEMPERATURE</span>
                  <span className="condition-value">{(weather?.temperature ?? 0).toFixed(1)}°C</span>
                </div>
                <div className="condition-item">
                  <span className="condition-label">HUMIDITY</span>
                  <span className="condition-value">{displayHumidity.toFixed(0)}%</span>
                </div>
                <div className="condition-item wide">
                  <span className="condition-label">WIND</span>
                  <span className="condition-value">{windKmh.toFixed(1)} km/h</span>
                  <span className="condition-subvalue">{(weather?.windSpeed ?? 0).toFixed(1)} m/s</span>
                  <span className="condition-subvalue">Dir: {(weather?.windDirection ?? 0).toFixed(0)}°</span>
                </div>
                <div className="condition-item">
                  <span className="condition-label">PRESSURE</span>
                  <span className="condition-value">{(weather?.pressure ?? 0).toFixed(1)} hPa</span>
                </div>
                <div className="condition-item">
                  <span className="condition-label">DEW POINT</span>
                  <span className="condition-value">{((weather?.temperature ?? 0) - (((100 - (weather?.humidity ?? 0)) / 5))).toFixed(1)}°C</span>
                </div>
                <div className={`condition-item ${isUvSensorOffline ? 'dimmed' : ''}`}>
                  <span className="condition-label">{isUvSensorOffline ? 'INTERNAL ENCLOSURE TEMP' : 'UV INDEX'}</span>
                  {isUvSensorOffline ? (
                    <span className="condition-value">{((weather?.temperature ?? 0) + 7).toFixed(1)}°C</span>
                  ) : (
                    <span className="condition-value">{(weather?.uvIndex ?? 0).toFixed(1)}</span>
                  )}
                </div>
                <div className={`condition-item wide ${isRainSensorOffline ? 'dimmed' : ''}`}>
                  <span className="condition-label">RAIN</span>
                  {isRainSensorOffline ? (
                    <span className="condition-value sensor-offline">Sensor Offline</span>
                  ) : (
                    <span className="condition-value">{(weather?.rainfall ?? 0).toFixed(1)} mm</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Middle Column: Weather Animation */}
          <div className="column column-middle">
            <div className="animation-container">
              <ClimateMap
                latitude={-1.2833}
                longitude={36.8167}
                temperature={weather?.temperature ?? 0}
                humidity={displayHumidity}
                pressure={weather?.pressure ?? 0}
                windSpeed={weather?.windSpeed ?? 0}
                windDirection={weather?.windDirection ?? 0}
                rainfall={weather?.rainfall ?? 0}
                visibility={weather?.visibility ?? 5}
                uvIndex={weather?.uvIndex ?? 0}
              />
            </div>
          </div>

          {/* Right Column: Status & Health, Telemetry, Trends */}
          <div className="column column-right">
            {/* Robot Status */}
            <div className="section status-section">
              <h2 className="section-title">ROBOT STATUS & HEALTH</h2>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">BATTERY</span>
                  <span className="status-value">92%</span>
                  <span className="status-mode">{solarChargeCurrent >= 0 ? '+' : ''}{solarChargeCurrent} mA</span>
                </div>
                <div className="status-item">
                  <span className="status-label">STATION ORIENTATION</span>
                  <span className="status-value">NNE 28°</span>
                </div>
                <div className="status-item">
                  <span className="status-label">INTERNAL TEMP</span>
                  <span className="status-value">{((weather?.temperature ?? 0) + 5).toFixed(1)}°C</span>
                </div>
                <div className="status-item">
                  <span className="status-label">CAMERA FEED</span>
                  <span className="status-icon">✓</span>
                </div>
              </div>
            </div>

            {/* Robotic Control */}
            <div className="section telemetry-section">
              <h2 className="section-title">ROBOTIC CONTROL</h2>
              <div className="control-summary">
                <div className={`telemetry-status-pill ${hatchClosed ? 'danger' : 'safe'}`}>
                  {hatchClosed ? 'CRITICAL STATE: HATCH CLOSED' : 'NORMAL STATE: HATCH OPEN'}
                </div>
                <div className="control-summary-right">
                  <div className="telemetry-meta">Mode: {autoMode ? 'AUTO' : 'MANUAL'}</div>
                  <button className="mini-toggle-btn" onClick={handleToggleAutomation}>
                    {autoMode ? 'MANUAL' : 'AUTO'}
                  </button>
                </div>
              </div>
              <div className="control-threshold-note">
                Threshold: {closeThreshold}km/h | Hysteresis: {windHysteresisBuffer}km/h | MAX GUST: {maxWindGustKmh.toFixed(1)} km/h
              </div>
              <div className="actuator-gauge">
                <div className="actuator-header">
                  <span className="telemetry-label">Actuator Position</span>
                  <span className="telemetry-status">{servoAngle}°</span>
                </div>
                <div className="actuator-track">
                  <div className="actuator-fill" style={{ width: `${(servoAngle / 180) * 100}%` }}></div>
                </div>
              </div>
              <div className="automation-controls">
                {!autoMode && (
                  <button className="control-btn secondary" onClick={handleManualHatchToggle}>
                    {manualHatchClosed ? 'Open Hatch' : 'Close Hatch'}
                  </button>
                )}
              </div>
              <h3 className="event-log-title">Event Log</h3>
              <div className="event-log">
                {eventLog.length === 0 ? (
                  <p className="event-log-empty">No events yet</p>
                ) : (
                  eventLog.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="event-item">
                      <span className="event-time">{entry.timestamp}</span>
                      <span className="event-message">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Telemetry */}
            <div className="section telemetry-section">
              <h2 className="section-title">TELEMETRY</h2>
              <div className="telemetry-list">
                <div className="telemetry-item">
                  <span className="telemetry-label">All Sensors</span>
                  <span className="telemetry-status">OK</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Connection</span>
                  <span className="telemetry-status">OK</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">5G Active</span>
                  <span className="telemetry-status">✓</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-label">Hatch State</span>
                  <span className="telemetry-status">{hatchClosed ? 'CLOSED' : 'OPEN'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Row: Trend lines + Forecast */}
        <div className="bottom-row">
          <div className="bottom-section forecast-bottom forecast-bottom-only">
            <h2 className="section-title">FORECAST (7-DAY)</h2>
            <div className="forecast-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div key={day} className="forecast-item">
                  <span className="forecast-day">{day}</span>
                  <span className="forecast-icon">☀️</span>
                  <span className="forecast-temps">
                    <span className="temp-high">{22 + idx}°</span>
                    <span className="temp-low">{15 + idx}°</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
