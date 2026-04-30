import { Activity } from 'lucide-react';

export default function MetricCard({ label, value, tone = 'default', icon }) {
  const MetricIcon = icon || Activity;

  return (
    <article className={`metric-card metric-${tone}`}>
      <div className={`metric-icon ${tone}`}>
        <MetricIcon size={28} />
      </div>
      <div className="metric-info">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}
