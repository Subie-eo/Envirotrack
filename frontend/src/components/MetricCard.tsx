import React from 'react';
import './MetricCard.css';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: string;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, icon, color = '#3498db' }) => {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <h3 className="metric-label">{label}</h3>
      </div>
      <div className="metric-value">
        {typeof value === 'number' ? value.toFixed(2) : value}
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  );
};

export default MetricCard;
