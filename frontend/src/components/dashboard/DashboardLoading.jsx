import { Clock3 } from 'lucide-react';

export default function DashboardLoading({ message = 'Assembling secure dashboard data...' }) {
  return (
    <div className="empty-copy" style={{ marginTop: '2rem' }}>
      <Clock3 size={32} className="notification-popup-icon" />
      <p>{message}</p>
    </div>
  );
}
