import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell,
  Legend
} from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, PieChart as PieChartIcon, Users, Home, UserCheck } from 'lucide-react';

const PIE_COLORS = ['#D4AF37', '#808080', '#A9A9A9', '#C0C0C0', '#4B5320'];

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{
        padding: '12px 16px',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(var(--bg-surface-rgb), 0.85)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</p>
        {payload.map((item, index) => (
          <p key={index} style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: item.color || item.fill || 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color || item.fill }}></span>
            {prefix}{item.value.toLocaleString()} {item.name}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalytics({ analytics }) {
  if (!analytics) return null;

  const user_growth = Array.isArray(analytics.user_growth) ? analytics.user_growth : [];
  const property_distribution = Array.isArray(analytics.property_distribution) ? analytics.property_distribution : [];

  const totalUsers = user_growth.reduce((sum, d) => sum + (Number(d?.users) || 0), 0);
  const totalProperties = property_distribution.reduce((sum, d) => sum + (Number(d?.value) || 0), 0);

  const lastGrowth = user_growth[user_growth.length - 1]?.users || 0;
  const prevGrowth = user_growth[user_growth.length - 2]?.users || 0;
  const growthRate = prevGrowth ? ((lastGrowth - prevGrowth) / prevGrowth * 100).toFixed(1) : 0;

  const [chartsMounted, setChartsMounted] = useState(false);
  const [areaChartReady, setAreaChartReady] = useState(false);
  const [pieChartReady, setPieChartReady] = useState(false);
  const [areaChartWidth, setAreaChartWidth] = useState(0);
  const [pieChartWidth, setPieChartWidth] = useState(0);
  const areaChartRef = useRef(null);
  const pieChartRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setChartsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const areaElement = areaChartRef.current;
    const pieElement = pieChartRef.current;
    if (!areaElement || !pieElement) return;

    const updateAreaReady = () => {
      const { width, height } = areaElement.getBoundingClientRect();
      setAreaChartWidth(Math.max(0, Math.floor(width)));
      setAreaChartReady(width > 0 && height > 0);
    };

    const updatePieReady = () => {
      const { width, height } = pieElement.getBoundingClientRect();
      setPieChartWidth(Math.max(0, Math.floor(width)));
      setPieChartReady(width > 0 && height > 0);
    };

    updateAreaReady();
    updatePieReady();

    const areaObserver = new ResizeObserver(updateAreaReady);
    const pieObserver = new ResizeObserver(updatePieReady);
    areaObserver.observe(areaElement);
    pieObserver.observe(pieElement);

    return () => {
      areaObserver.disconnect();
      pieObserver.disconnect();
    };
  }, []);

  const insights = [
    {
      label: 'Total Registrations',
      value: totalUsers,
      icon: <Users size={20} />,
      trend: `+${growthRate}% vs prev month`,
      color: 'var(--primary-base)',
    },
    {
      label: 'Active Inventory',
      value: totalProperties,
      icon: <Home size={20} />,
      trend: 'Healthy Distribution',
      color: 'var(--brand-base)',
    },
    {
      label: 'Pending Approvals',
      value: analytics.stats?.pending_approvals || 0,
      icon: <UserCheck size={20} />,
      trend: 'Needs Attention',
      color: 'var(--status-warning)',
    },
    {
      label: 'Platform Reach',
      value: analytics.stats?.total_views || 0,
      icon: <TrendingUp size={20} />,
      trend: 'Total Views',
      color: 'var(--status-success)',
    },
  ];

  return (
    <div className="analytics-container animate-enter" style={{ minWidth: 0 }}>
      <section className="kpi-grid" aria-label="Key performance indicators">
        {insights.map((insight, i) => (
          <div key={i} className="kpi-card" style={{ '--kpi-accent': insight.color }}>
            <div className="kpi-card-top">
              <span className="kpi-card-icon" aria-hidden="true">{insight.icon}</span>
              <span className="kpi-card-trend">{insight.trend}</span>
            </div>
            <div>
              <h3 className="kpi-card-value">{insight.value.toLocaleString()}</h3>
              <p className="kpi-card-label">{insight.label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="charts-grid">
        <section className="section-panel admin-panel animate-enter">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <TrendingUp size={14} aria-hidden="true" /> Growth
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>User Registrations</h2>
          </div>
          <div ref={areaChartRef} style={{ width: '100%', height: 260, minWidth: 0, minHeight: 260 }}>
            {chartsMounted && areaChartReady && areaChartWidth > 0 ? (
              <AreaChart width={areaChartWidth} height={260} data={user_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-base)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary-base)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="var(--primary-base)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  animationDuration={1500}
                />
              </AreaChart>
            ) : (
              <div style={{ height: 260 }} />
            )}
          </div>
        </section>

        <section className="section-panel admin-panel animate-enter animate-delay-1">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <PieChartIcon size={14} aria-hidden="true" /> Inventory
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Property Status</h2>
          </div>
          <div ref={pieChartRef} style={{ width: '100%', height: 260, minWidth: 0, minHeight: 260 }}>
            {chartsMounted && pieChartReady && pieChartWidth > 0 ? (
              <PieChart width={pieChartWidth} height={260}>
                <Pie
                  data={property_distribution}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={6}
                  dataKey="value"
                  nameKey="status"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {property_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{value}</span>}
                />
              </PieChart>
            ) : (
              <div style={{ height: 260 }} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
