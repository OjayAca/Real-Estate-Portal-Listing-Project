import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Info, Users, Home, MessageSquare } from 'lucide-react';

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

  const { user_growth, property_distribution, inquiry_volume } = analytics;

  // Calculate high-level insights
  const totalUsers = user_growth.reduce((sum, d) => sum + d.users, 0);
  const totalProperties = property_distribution.reduce((sum, d) => sum + d.value, 0);
  const totalInquiries = inquiry_volume.reduce((sum, d) => sum + d.inquiries, 0);
  
  const lastGrowth = user_growth[user_growth.length - 1]?.users || 0;
  const prevGrowth = user_growth[user_growth.length - 2]?.users || 0;
  const growthRate = prevGrowth ? ((lastGrowth - prevGrowth) / prevGrowth * 100).toFixed(1) : 0;

  return (
    <div className="analytics-container animate-enter" style={{ marginBottom: '3rem' }}>
      
      {/* Insights Header */}
      <section className="insights-header" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        {[
          { label: 'Total Registrations', value: totalUsers, icon: <Users size={20} />, trend: `+${growthRate}% vs prev month`, color: 'var(--primary-base)' },
          { label: 'Active Inventory', value: totalProperties, icon: <Home size={20} />, trend: 'Healthy Distribution', color: 'var(--brand-base)' },
          { label: 'Total Engagement', value: totalInquiries, icon: <MessageSquare size={20} />, trend: 'Increasing volume', color: 'var(--tone-success)' }
        ].map((insight, i) => (
          <div key={i} className="section-panel admin-panel" style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            borderLeft: `4px solid ${insight.color}`
          }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: insight.color, background: `${insight.color}15`, padding: '10px', borderRadius: '12px' }}>
                {insight.icon}
              </span>
              <span className="eyebrow" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{insight.trend}</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{insight.value.toLocaleString()}</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{insight.label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="page-grid" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
          
          {/* User Growth */}
          <section className="section-panel admin-panel animate-enter">
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><TrendingUp size={14} aria-hidden="true" /> Growth</p>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>User Registrations</h2>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={user_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-base)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary-base)" stopOpacity={0}/>
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
              </ResponsiveContainer>
            </div>
          </section>

          {/* Property Distribution */}
          <section className="section-panel admin-panel animate-enter animate-delay-1">
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><PieChartIcon size={14} aria-hidden="true" /> Inventory</p>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Property Status</h2>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
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
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Inquiry Volume */}
        <section className="section-panel admin-panel animate-enter animate-delay-2" style={{ marginTop: '2.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><BarChart3 size={14} aria-hidden="true" /> Engagement</p>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Inquiries Over Time</h2>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={inquiry_volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="inquiries" 
                  name="Inquiries"
                  fill="var(--brand-base)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={50} 
                  animationDuration={1800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
