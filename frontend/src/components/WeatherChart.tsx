import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import './WeatherChart.css';

const CONTROL_WIND_LIMIT_KMH = 50;

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

interface WeatherChartProps {
  data: ChartDataPoint[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'solar' | 'rainfall' | 'uv' | 'visibility';
}

const WeatherChart: React.FC<WeatherChartProps> = ({ data, metric }) => {
  const getChartConfig = () => {
    switch (metric) {
      case 'temperature':
        return {
          title: 'Temperature Trend',
          yLabel: 'Temperature (°C)',
          unit: '°C',
          lines: [{ key: 'temperature', stroke: '#e74c3c', name: 'Temperature' }],
          domain: [0, 50] as [number, number]
        };
      case 'humidity':
        return {
          title: 'Humidity Level',
          yLabel: 'Humidity (%)',
          unit: '%',
          lines: [{ key: 'humidity', stroke: '#3498db', name: 'Humidity' }],
          domain: [0, 100] as [number, number]
        };
      case 'pressure':
        return {
          title: 'Atmospheric Pressure',
          yLabel: 'Pressure (hPa)',
          unit: 'hPa',
          lines: [{ key: 'pressure', stroke: '#9b59b6', name: 'Pressure' }],
          domain: ['auto', 'auto'] as ['auto', 'auto']
        };
      case 'wind':
        return {
          title: 'Wind Speed',
          yLabel: 'Wind Speed (km/h)',
          unit: 'km/h',
          lines: [{ key: 'windKmh', stroke: '#1abc9c', name: 'Wind Speed' }],
          domain: [0, 100] as [number, number]
        };
      case 'solar':
        return {
          title: 'Solar Radiation',
          yLabel: 'Solar Radiation (W/m²)',
          unit: 'W/m²',
          lines: [{ key: 'solarRadiation', stroke: '#f39c12', name: 'Solar Radiation' }],
          domain: ['auto', 'auto'] as ['auto', 'auto']
        };
      case 'rainfall':
        return {
          title: 'Rainfall',
          yLabel: 'Rainfall (mm)',
          unit: 'mm',
          lines: [{ key: 'rainfall', stroke: '#34495e', name: 'Rainfall' }],
          domain: ['auto', 'auto'] as ['auto', 'auto']
        };
      case 'uv':
        return {
          title: 'UV Index',
          yLabel: 'UV Index',
          unit: '',
          lines: [{ key: 'uvIndex', stroke: '#e67e22', name: 'UV Index' }],
          domain: ['auto', 'auto'] as ['auto', 'auto']
        };
      case 'visibility':
        return {
          title: 'Visibility',
          yLabel: 'Visibility (km)',
          unit: 'km',
          lines: [{ key: 'visibility', stroke: '#16a085', name: 'Visibility' }],
          domain: ['auto', 'auto'] as ['auto', 'auto']
        };
      default:
        return { title: '', yLabel: '', unit: '', lines: [], domain: ['auto', 'auto'] as ['auto', 'auto'] };
    }
  };

  const config = getChartConfig();

  const sixHours = 6 * 60 * 60 * 1000;
  const now = Date.now();
  const xDomain = [now - sixHours, now];
  const chartSeries = data.map(point => ({
    ...point,
    windKmh: point.windSpeed !== undefined ? point.windSpeed * 3.6 : undefined
  }));
  const valueKey = config.lines[0]?.key;
  const valueSeries = chartSeries
    .map(point => Number((point as Record<string, unknown>)[valueKey]))
    .filter(value => Number.isFinite(value));
  const latestValue = valueSeries.length > 0 ? valueSeries[valueSeries.length - 1] : null;
  const avgValue = valueSeries.length > 0
    ? valueSeries.reduce((sum, value) => sum + value, 0) / valueSeries.length
    : null;
  const maxValue = valueSeries.length > 0 ? Math.max(...valueSeries) : null;

  const hatchClosedRanges: Array<{ x1: number; x2: number }> = [];
  let rangeStart: number | null = null;
  chartSeries.forEach((point, idx) => {
    if (point.hatchClosed && rangeStart === null) {
      rangeStart = point.timestamp;
    }

    const nextPoint = chartSeries[idx + 1];
    const closingRange = rangeStart !== null && (!nextPoint || !nextPoint.hatchClosed);
    if (closingRange) {
      hatchClosedRanges.push({ x1: rangeStart as number, x2: point.timestamp });
      rangeStart = null;
    }
  });

  const actionMarkers = chartSeries
    .map((point, idx) => {
      if (idx === 0 || point.hatchClosed === chartSeries[idx - 1].hatchClosed) {
        return null;
      }

      return {
        timestamp: point.timestamp,
        label: point.hatchClosed ? 'Hatch Closed' : 'Hatch Open',
        color: point.hatchClosed ? '#ef4444' : '#22c55e'
      };
    })
    .filter((marker): marker is { timestamp: number; label: string; color: string } => Boolean(marker));

  const titleValue = latestValue !== null
    ? `${config.title} (${latestValue.toFixed(1)}${config.unit})`
    : config.title;

  const statLabel = metric === 'wind' ? 'Max Wind Pulse' : `Avg ${config.lines[0]?.name ?? 'Value'}`;
  const statValue = metric === 'wind' ? maxValue : avgValue;

  return (
    <div className="weather-chart">
      <div className="chart-header-row">
        <h3 className="chart-title">{titleValue}</h3>
        {statValue !== null && (
          <span className="chart-stat">{statLabel}: {statValue.toFixed(1)}{config.unit}</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartSeries} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          {(metric === 'temperature' || metric === 'humidity') && hatchClosedRanges.map((range, index) => (
            <ReferenceArea
              key={`${range.x1}-${range.x2}-${index}`}
              x1={range.x1}
              x2={range.x2}
              fill="rgba(148, 163, 184, 0.14)"
              fillOpacity={1}
              ifOverflow="extendDomain"
            />
          ))}

          <CartesianGrid strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={xDomain}
            scale="time"
            tickFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            tickCount={4}
            minTickGap={0}
            allowDataOverflow={false}
          />
          <YAxis
            label={{ value: config.yLabel, angle: -90, position: 'insideLeft' }}
            domain={config.domain}
            tickCount={6}
            allowDataOverflow={false}
          />
          <Tooltip labelFormatter={value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />

          {metric === 'wind' && (
            <ReferenceLine
              y={CONTROL_WIND_LIMIT_KMH}
              stroke="#ef4444"
              strokeDasharray="6 4"
              label={{ value: 'Control Limit 50 km/h', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
            />
          )}

          {actionMarkers.map((marker, index) => (
            <ReferenceLine
              key={`${marker.timestamp}-${index}`}
              x={marker.timestamp}
              stroke={marker.color}
              strokeDasharray="2 3"
              label={{ value: marker.label, position: 'top', fill: marker.color, fontSize: 10 }}
            />
          ))}

          <Line
            type="monotone"
            dataKey={config.lines[0].key}
            stroke={config.lines[0].stroke}
            strokeWidth={3}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeatherChart;
