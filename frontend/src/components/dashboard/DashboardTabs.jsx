import { useRef, useEffect } from 'react';
import { PieChart as PieChartIcon, Users, ClipboardList, UserCheck, Building, Home } from 'lucide-react';

function formatCount(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function DashboardTabs({ activeTab, setActiveTab, counts = {} }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <PieChartIcon size={16} aria-hidden="true" /> },
    { id: 'pending', label: 'Pending', icon: <Building size={16} aria-hidden="true" />, badgeKey: 'pending', attention: true },
    { id: 'users', label: 'Users', icon: <Users size={16} aria-hidden="true" />, badgeKey: 'users' },
    { id: 'leads', label: 'Leads', icon: <ClipboardList size={16} aria-hidden="true" />, badgeKey: 'leads' },
    { id: 'agents', label: 'Agents', icon: <UserCheck size={16} aria-hidden="true" />, badgeKey: 'agents' },
    { id: 'properties', label: 'Properties', icon: <Home size={16} aria-hidden="true" />, badgeKey: 'properties' },
  ];

  const tabRefs = useRef([]);
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  const focusTab = (index) => {
    const el = tabRefs.current[index];
    if (el && el.focus) el.focus();
  };

  const onKeyDown = (e, index) => {
    const key = e.key;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      setActiveTab(tabs[next].id);
      focusTab(next);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prev].id);
      focusTab(prev);
    } else if (key === 'Home') {
      e.preventDefault();
      setActiveTab(tabs[0].id);
      focusTab(0);
    } else if (key === 'End') {
      e.preventDefault();
      setActiveTab(tabs[tabs.length - 1].id);
      focusTab(tabs.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      setActiveTab(tabs[index].id);
    }
  };

  return (
    <div className="dashboard-tabs-bar">
      <nav className="dashboard-tabs" role="tablist" aria-label="Admin dashboard sections">
        {tabs.map((tab, i) => {
          const rawCount = tab.badgeKey ? counts[tab.badgeKey] : null;
          const badge = formatCount(rawCount);
          const isActive = activeTab === tab.id;
          const showAttention = tab.attention && Number(rawCount) > 0;

          return (
            <button
              key={tab.id}
              id={`dashboard-tab-${tab.id}`}
              aria-controls={`dashboard-panel-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => (tabRefs.current[i] = el)}
              className={`tab-btn ${isActive ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {badge && (
                <span
                  className={`tab-badge ${showAttention ? 'tab-badge-attention' : 'tab-badge-muted'}`}
                  aria-label={`${rawCount} ${tab.label}`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
