import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line
} from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { TrendingUp, PieChart as PieChartIcon, Users, Home, UserCheck, MessageSquare, Map, Award, Eye } from 'lucide-react';

function ChartWrapper({ children }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
      {size.width > 0 && size.height > 0 ? children(size.width, size.height) : null}
    </div>
  );
}

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
  const user_growth = Array.isArray(analytics?.user_growth) ? analytics.user_growth : [];
  const property_distribution = Array.isArray(analytics?.property_distribution) ? analytics.property_distribution : [];
  const weekly_inquiries = Array.isArray(analytics?.weekly_inquiries) ? analytics.weekly_inquiries : [];
  const market_insights = Array.isArray(analytics?.market_insights) ? analytics.market_insights : [];
  const top_listings = Array.isArray(analytics?.top_listings) ? analytics.top_listings : [];
  const active_agents = Array.isArray(analytics?.active_agents) ? analytics.active_agents : [];

  const [chartsMounted, setChartsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setChartsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!analytics) return null;

  const insights = [
    {
      label: 'Total Inquiries',
      value: analytics.stats?.total_inquiries || 0,
      icon: <MessageSquare size={20} />,
      trend: 'Lead Pipeline',
      color: 'var(--primary-base)',
    },
    {
      label: 'Conversion Rate',
      value: `${analytics.stats?.conversion_rate || 0}%`,
      icon: <TrendingUp size={20} />,
      trend: 'Viewing to Inquiry',
      color: '#10B981',
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
      icon: <Eye size={20} />,
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
              <TrendingUp size={14} aria-hidden="true" /> Momentum
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Weekly Inquiries</h2>
          </div>
          <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
            {chartsMounted && (
              <ChartWrapper>
                {(w, h) => (
                  <AreaChart width={w} height={h} data={weekly_inquiries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary-base)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary-base)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="inquiries"
                      name="Inquiries"
                      stroke="var(--primary-base)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorInq)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                )}
              </ChartWrapper>
            )}
          </div>
        </section>

        <section className="section-panel admin-panel animate-enter animate-delay-1">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <Map size={14} aria-hidden="true" /> Geographic Demand
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Market Interest vs Inventory</h2>
          </div>
          <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
            {chartsMounted && (
              <ChartWrapper>
                {(w, h) => (
                  <BarChart width={w} height={h} data={market_insights} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="city" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="listings" name="Listings" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interest" name="Search Interest" fill="var(--primary-base)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ChartWrapper>
            )}
          </div>
        </section>
      </div>

      <div className="charts-grid" style={{ marginTop: '2rem' }}>
        <section className="section-panel admin-panel animate-enter animate-delay-2">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <Award size={14} aria-hidden="true" /> Performance
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Top Listings by Views</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-data-table mini-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Property</th>
                  <th style={{ width: '25%' }}>City</th>
                  <th className="text-right" style={{ width: '15%' }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {top_listings.map(p => (
                  <tr key={p.property_id}>
                    <td className="text-truncate" title={p.title}>{p.title}</td>
                    <td className="text-truncate" title={p.city}>{p.city}</td>
                    <td className="text-right font-bold">{p.views_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-panel admin-panel animate-enter animate-delay-3">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <UserCheck size={14} aria-hidden="true" /> Productivity
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Most Active Agents</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-data-table mini-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Agent</th>
                  <th className="text-right" style={{ width: '30%' }}>Active Listings</th>
                </tr>
              </thead>
              <tbody>
                {active_agents.map((a, i) => (
                  <tr key={i}>
                    <td className="text-truncate" title={a.name}>{a.name}</td>
                    <td className="text-right font-bold">{a.listings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="charts-grid" style={{ marginTop: '2rem' }}>
        <section className="section-panel admin-panel animate-enter animate-delay-4">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <Users size={14} aria-hidden="true" /> User Base
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Monthly Registration Trend</h2>
          </div>
          <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
            {chartsMounted && (
              <ChartWrapper>
                {(w, h) => (
                  <ComposedChart width={w} height={h} data={user_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="users" name="New Users" fill="rgba(var(--primary-base-rgb), 0.2)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="users" name="Trend" stroke="var(--primary-base)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                )}
              </ChartWrapper>
            )}
          </div>
        </section>

        <section className="section-panel admin-panel animate-enter animate-delay-5">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <PieChartIcon size={14} aria-hidden="true" /> Inventory
            </p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Property Status Mix</h2>
          </div>
          <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
            {chartsMounted && (
              <ChartWrapper>
                {(w, h) => (
                  <PieChart width={w} height={h}>
                    <Pie
                      data={property_distribution}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      nameKey="status"
                      stroke="none"
                      animationDuration={1200}
                    >
                      {property_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                )}
              </ChartWrapper>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
