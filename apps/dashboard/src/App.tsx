import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Zap, Shield, Server, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ServiceStatus {
  name: string
  port: number
  url: string
  status: 'healthy' | 'degraded' | 'down' | 'checking'
  latency?: number
}

interface RequestStat {
  time: string
  requests: number
  errors: number
  latency: number
}

const SERVICES: ServiceStatus[] = [
  { name: 'Gateway', port: 8080, url: 'http://localhost:8080/health', status: 'checking' },
  { name: 'Rotato', port: 8990, url: 'http://localhost:8990/health', status: 'checking' },
  { name: 'Claude Cruise', port: 4141, url: 'http://localhost:4141/health', status: 'checking' },
  { name: 'MOA Aggregator', port: 8007, url: 'http://localhost:8007/health', status: 'checking' },
  { name: 'Token Savior', port: 3100, url: 'http://localhost:3100/health', status: 'checking' },
  { name: 'Redis', port: 6379, url: 'http://localhost:6379', status: 'checking' },
]

function StatusBadge({ status }: { status: ServiceStatus['status'] }) {
  const config = {
    healthy: { icon: CheckCircle, color: '#4ade80', label: 'Healthy' },
    degraded: { icon: AlertCircle, color: '#f59e0b', label: 'Degraded' },
    down: { icon: XCircle, color: '#ef4444', label: 'Down' },
    checking: { icon: RefreshCw, color: '#64748b', label: 'Checking' },
  }[status]
  const Icon = config.icon
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: config.color, fontSize: 13, fontWeight: 500 }}>
      <Icon size={14} />
      {config.label}
    </span>
  )
}

const mockData: RequestStat[] = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}m`,
  requests: Math.floor(Math.random() * 80 + 20),
  errors: Math.floor(Math.random() * 5),
  latency: Math.floor(Math.random() * 300 + 50),
}))

export default function App() {
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES)
  const [data, setData] = useState<RequestStat[]>(mockData)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const checkHealth = useCallback(async () => {
    const updated = await Promise.all(
      services.map(async (svc) => {
        const start = Date.now()
        try {
          const res = await fetch('/health', { signal: AbortSignal.timeout(2000) })
          const latency = Date.now() - start
          return { ...svc, status: res.ok ? 'healthy' as const : 'degraded' as const, latency }
        } catch {
          return { ...svc, status: 'down' as const }
        }
      })
    )
    setServices(updated)
    setLastRefresh(new Date())
    // Append new mock point
    setData(prev => [...prev.slice(-19), {
      time: 'now',
      requests: Math.floor(Math.random() * 80 + 20),
      errors: Math.floor(Math.random() * 5),
      latency: Math.floor(Math.random() * 300 + 50),
    }])
  }, [services])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  const healthyCount = services.filter(s => s.status === 'healthy').length

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #7c6af7, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🦌 Omni-LLM Suite
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Unified LLM Proxy & Agent Dashboard</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
            <RefreshCw size={13} />
            Last checked: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={checkHealth}
            style={{ marginTop: 8, padding: '6px 14px', background: '#7c6af7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Services Online', value: `${healthyCount}/${services.length}`, icon: Server, color: '#4ade80' },
          { label: 'Avg Latency', value: `${Math.floor(data.slice(-5).reduce((a,b) => a+b.latency, 0)/5)}ms`, icon: Zap, color: '#7c6af7' },
          { label: 'Requests/min', value: data[data.length-1]?.requests || 0, icon: Activity, color: '#f59e0b' },
          { label: 'Error Rate', value: `${((data[data.length-1]?.errors / data[data.length-1]?.requests) * 100 || 0).toFixed(1)}%`, icon: Shield, color: '#ef4444' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} style={{ background: '#111318', border: '1px solid #1e2130', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: stat.color }}>{stat.value}</p>
                </div>
                <div style={{ background: `${stat.color}20`, borderRadius: 8, padding: 10 }}>
                  <Icon size={20} color={stat.color} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart + Services */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Chart */}
        <div style={{ background: '#111318', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Request Traffic</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7c6af7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e2130', border: 'none', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="requests" stroke="#7c6af7" fill="url(#reqGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Services */}
        <div style={{ background: '#111318', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Service Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map(svc => (
              <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#0a0b0e', borderRadius: 8, border: '1px solid #1e2130' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{svc.name}</p>
                  <p style={{ color: '#64748b', fontSize: 12 }}>:{svc.port}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={svc.status} />
                  {svc.latency && <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{svc.latency}ms</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Proxy Chain Visualization */}
      <div style={{ background: '#111318', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Proxy Chain Flow</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
          {['Client', 'Gateway :8080', 'Rotato :8990', 'Claude Cruise :4141', 'MOA :8007', 'LLM Providers'].map((node, i, arr) => (
            <div key={node} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '10px 16px',
                background: i === 0 || i === arr.length-1 ? '#1e2130' : '#1a1040',
                border: `1px solid ${i === 0 || i === arr.length-1 ? '#334155' : '#7c6af7'}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                color: i === 0 || i === arr.length-1 ? '#94a3b8' : '#a78bfa',
              }}>
                {node}
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, #7c6af7, #4ade80)', margin: '0 4px', position: 'relative' }}>
                  <span style={{ position: 'absolute', right: -4, top: -6, color: '#4ade80', fontSize: 12 }}>▶</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p style={{ color: '#334155', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
        Omni-LLM Suite v1.0.0 — Gateway: http://localhost:8080 | Token Savior MCP: :3100
      </p>
    </div>
  )
}
