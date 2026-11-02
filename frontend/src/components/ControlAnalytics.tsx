import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './ControlAnalytics.css';

interface SourcePoint {
  timestamp: number;
}

interface AnalyticsPoint {
  timestamp: number;
  ambientTemp: number;
  enclosureTemp: number;
  windKmh: number;
  servoAngle: number;
  solarMw: number;
  batteryPct: number;
  pressureHpa: number;
  tendency: number;
}

interface ControlAnalyticsProps {
  sourceData: SourcePoint[];
  currentWindKmh: number;
  currentServoAngle: number;
  hatchClosed: boolean;
  predictiveOverrideActive: boolean;
}

const WIND_CONTROL_LIMIT = 50;
const PREDICTIVE_TENDENCY_LIMIT = 0.8;

const ControlAnalytics: React.FC<ControlAnalyticsProps> = ({
  sourceData,
  currentWindKmh,
  currentServoAngle,
  hatchClosed,
  predictiveOverrideActive
}) => {
  const analyticsData = useMemo(() => {
    const now = Date.now();
    const defaultStart = now - 6 * 60 * 60 * 1000;

    const start = sourceData.length > 0 ? sourceData[0].timestamp : defaultStart;
    const end = sourceData.length > 0 ? sourceData[sourceData.length - 1].timestamp : now;
    const safeEnd = end <= start ? start + 6 * 60 * 60 * 1000 : end;

    const pointCount = 37;
    const interval = (safeEnd - start) / (pointCount - 1);

    const points: AnalyticsPoint[] = [];
    for (let i = 0; i < pointCount; i++) {
      const ratio = i / (pointCount - 1);
      const timestamp = start + i * interval;

      const ambientTemp =
        21.2 +
        3.4 * Math.sin(Math.PI * ratio * 0.95) +
        0.45 * Math.sin(i * 1.3) +
        0.2 * Math.cos(i * 0.4);

      const enclosureTemp =
        ambientTemp +
        7.2 +
        0.6 * Math.sin(i * 0.55 + 0.8) +
        0.25 * Math.cos(i * 0.22);

      const gustPulse = 33 * Math.exp(-Math.pow((ratio - 0.79) / 0.07, 2));
      const windKmh =
        24 +
        14 * Math.abs(Math.sin(i * 1.05 + 0.6)) +
        10 * Math.sin(i * 0.85 + 1.2) +
        gustPulse;

      const servoAngle = windKmh > WIND_CONTROL_LIMIT ? 180 : windKmh > 40 ? 90 : 0;

      const solarMw = Math.max(
        0,
        330 * Math.exp(-Math.pow((ratio - 0.5) / 0.16, 2)) + 12 * Math.sin(i * 0.35)
      );

      const batteryPct = Math.min(92, 74 + ratio * 18 + 1.2 * Math.sin(i * 0.35));

      const pressureHpa =
        1013.2 +
        0.9 * Math.sin(i * 0.15) -
        2.4 * Math.exp(-Math.pow((ratio - 0.8) / 0.18, 2));

      const tendency =
        -0.6 +
        1.1 * Math.sin(i * 0.52 + 0.7) +
        2.4 * Math.exp(-Math.pow((ratio - 0.69) / 0.08, 2));

      points.push({
        timestamp,
        ambientTemp,
        enclosureTemp,
        windKmh,
        servoAngle,
        solarMw,
        batteryPct,
        pressureHpa,
        tendency
      });
    }

    const latestPoint = points[points.length - 1];
    latestPoint.windKmh = Math.max(0, currentWindKmh);
    latestPoint.servoAngle = currentServoAngle;

    return points;
  }, [sourceData, currentWindKmh, currentServoAngle]);

  const maxWindPoint = analyticsData.reduce((peak, point) =>
    point.windKmh > peak.windKmh ? point : peak
  , analyticsData[0]);

  const predictivePoint = analyticsData.find(
    point => point.tendency >= PREDICTIVE_TENDENCY_LIMIT && point.timestamp < maxWindPoint.timestamp
  ) ?? analyticsData[Math.max(0, Math.floor(analyticsData.length * 0.68))];

  const latest = analyticsData[analyticsData.length - 1];

  return (
    <div className="control-analytics-grid">
      <div className="control-chart-card">
        <h3 className="control-chart-title">Ambient & Enclosure Temperature ({latest.ambientTemp.toFixed(1)}C)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analyticsData} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[analyticsData[0].timestamp, analyticsData[analyticsData.length - 1].timestamp]}
              tickCount={6}
              tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis domain={[0, 50]} label={{ value: 'Temperature (C)', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={value => new Date(value).toLocaleTimeString()} />
            <Legend />
            <Line
              type="monotone"
              dataKey="ambientTemp"
              name="Ambient Temperature"
              stroke="#f97316"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="enclosureTemp"
              name="Internal Enclosure Temperature"
              stroke="#d946ef"
              strokeWidth={2.2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="control-chart-card">
        <h3 className="control-chart-title">
          Wind Speed ({currentWindKmh.toFixed(1)} km/h) & Servo Angle ({currentServoAngle.toFixed(0)}deg)
          {predictiveOverrideActive && currentWindKmh < WIND_CONTROL_LIMIT ? ' - Predictive Override Active' : ''}
        </h3>
        <div className="stacked-chart-wrap">
          <ResponsiveContainer width="100%" height="58%">
            <LineChart data={analyticsData} margin={{ top: 8, right: 16, left: 0, bottom: 2 }}>
              <CartesianGrid strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={[analyticsData[0].timestamp, analyticsData[analyticsData.length - 1].timestamp]}
                tickCount={6}
                tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis domain={[0, 100]} label={{ value: 'Wind (km/h)', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={value => new Date(value).toLocaleTimeString()} />
              <ReferenceLine
                y={WIND_CONTROL_LIMIT}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{ value: 'Control Limit', position: 'insideTopRight', fill: '#ef4444' }}
              />
              <ReferenceDot
                x={maxWindPoint.timestamp}
                y={maxWindPoint.windKmh}
                r={6}
                fill="#ef4444"
                stroke="#ef4444"
                label={{
                  value: hatchClosed && currentWindKmh < WIND_CONTROL_LIMIT
                    ? 'HATCH CLOSED (PREDICTIVE OVERRIDE)'
                    : 'HATCH CLOSED ACTUATION (WIND > 50 km/h)',
                  position: 'top',
                  fill: '#fca5a5',
                  fontSize: 10
                }}
              />
              <Line
                type="monotone"
                dataKey="windKmh"
                name="Wind Speed"
                stroke="#2dd4bf"
                strokeWidth={2.6}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height="42%">
            <LineChart data={analyticsData} margin={{ top: 8, right: 16, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={[analyticsData[0].timestamp, analyticsData[analyticsData.length - 1].timestamp]}
                tickCount={6}
                tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis domain={[0, 180]} ticks={[0, 90, 180]} label={{ value: 'Servo Angle (deg)', angle: -90, position: 'insideLeft' }} />
              <Line
                type="stepAfter"
                dataKey="servoAngle"
                name="Servo Angle"
                stroke="#67e8f9"
                strokeWidth={2.2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="control-chart-card">
        <h3 className="control-chart-title">Solar Input & Battery Charge State</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analyticsData} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[analyticsData[0].timestamp, analyticsData[analyticsData.length - 1].timestamp]}
              tickCount={6}
              tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis yAxisId="left" domain={[0, 400]} label={{ value: 'Solar (mW)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: 'Battery (%)', angle: 90, position: 'insideRight' }} />
            <Tooltip labelFormatter={value => new Date(value).toLocaleTimeString()} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="solarMw"
              name="Solar Input (mW)"
              stroke="#facc15"
              strokeWidth={2.4}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="batteryPct"
              name="Battery Charge (%)"
              stroke="#7dd3fc"
              strokeWidth={2.4}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="control-chart-card">
        <h3 className="control-chart-title">Pressure Tendency & Altitude</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analyticsData} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[analyticsData[0].timestamp, analyticsData[analyticsData.length - 1].timestamp]}
              tickCount={6}
              tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis yAxisId="left" domain={[985, 1030]} label={{ value: 'Pressure (hPa)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" domain={[-5, 5]} label={{ value: 'Tendency (hPa/3hr)', angle: 90, position: 'insideRight' }} />
            <Tooltip labelFormatter={value => new Date(value).toLocaleTimeString()} />
            <Legend />
            <ReferenceLine
              yAxisId="right"
              y={PREDICTIVE_TENDENCY_LIMIT}
              stroke="#ef4444"
              strokeDasharray="6 4"
            />
            <ReferenceDot
              yAxisId="right"
              x={predictivePoint.timestamp}
              y={predictivePoint.tendency}
              r={6}
              fill="#ef4444"
              stroke="#ef4444"
              label={{ value: 'PREDICTIVE HATCH ACTUATION', position: 'top', fill: '#fca5a5', fontSize: 10 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pressureHpa"
              name="Pressure (hPa)"
              stroke="#1d4ed8"
              strokeWidth={2.4}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tendency"
              name="Barometric Tendency (hPa/3hr)"
              stroke="#22c55e"
              strokeWidth={2.2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ControlAnalytics;
