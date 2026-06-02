import React, { useEffect, useState } from 'react';

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type DashboardPayload = {
  summary: {
    total: number;
    today: number;
    week: number;
    logsErrors: number;
  };
  latestValuations: Array<Record<string, unknown>>;
  connectors: Array<{ state: string; type: string; source: string }>;
};

const containerS: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f2f5f7',
  color: '#14202a',
  fontFamily: '"Avenir Light", Avenir, sans-serif',
  padding: '24px',
  boxSizing: 'border-box',
};

const panelS: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
};

const tableS: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
};

const thtdS: React.CSSProperties = {
  borderBottom: '1px solid #e6ebef',
  textAlign: 'left',
  padding: '8px',
  verticalAlign: 'top',
};

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'API-Anfrage fehlgeschlagen.');
  }
  return payload as T;
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
    <span>{label}</span>
    <input
      value={value}
      type={type}
      onChange={(event) => onChange(event.target.value)}
      style={{
        border: '1px solid #d5dbe1',
        borderRadius: '10px',
        padding: '10px 12px',
      }}
    />
  </label>
);

export const AdminApp = () => {
  const [csrfToken, setCsrfToken] = useState('');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [valuations, setValuations] = useState<Array<Record<string, unknown>>>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [pdfs, setPdfs] = useState<Array<Record<string, unknown>>>([]);
  const [connectors, setConnectors] = useState<Array<Record<string, unknown>>>([]);
  const [errors, setErrors] = useState<Array<Record<string, unknown>>>([]);

  const loadSession = async () => {
    try {
      const session = await fetchJson<{ user: AdminUser }>('/api/admin/session');
      setUser(session.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCsrf = async () => {
    const payload = await fetchJson<{ csrfToken: string }>('/api/admin/csrf');
    setCsrfToken(payload.csrfToken);
  };

  const loadData = async () => {
    const [d, v, l, p, c, e] = await Promise.all([
      fetchJson<DashboardPayload>('/api/admin/dashboard'),
      fetchJson<{ valuations: Array<Record<string, unknown>> }>('/api/admin/valuations?limit=40'),
      fetchJson<{ logs: Array<Record<string, unknown>> }>('/api/admin/logs?limit=80'),
      fetchJson<{ pdfs: Array<Record<string, unknown>> }>('/api/admin/pdfs?limit=40'),
      fetchJson<{ connectors: Array<Record<string, unknown>> }>('/api/admin/connectors'),
      fetchJson<{ errors: Array<Record<string, unknown>> }>('/api/admin/errors?limit=60'),
    ]);

    setDashboard(d);
    setValuations(v.valuations);
    setLogs(l.logs);
    setPdfs(p.pdfs);
    setConnectors(c.connectors);
    setErrors(e.errors);
  };

  useEffect(() => {
    void loadCsrf();
    void loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  const login = async () => {
    setError(null);
    try {
      const payload = await fetchJson<{ user: AdminUser }>('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password, csrfToken }),
      });
      setUser(payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen.');
    }
  };

  const logout = async () => {
    await fetchJson('/api/admin/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ csrfToken }),
    }).catch(() => null);

    setUser(null);
    setDashboard(null);
    setValuations([]);
    setLogs([]);
    setPdfs([]);
    setConnectors([]);
    setErrors([]);
    await loadCsrf();
  };

  if (loading) {
    return <div style={containerS}>Adminbereich wird geladen...</div>;
  }

  if (!user) {
    return (
      <div style={containerS}>
        <div style={{ ...panelS, maxWidth: '420px', margin: '80px auto', display: 'grid', gap: '14px' }}>
          <h2 style={{ margin: 0 }}>Admin Login</h2>
          <Field label="E-Mail" value={email} onChange={setEmail} />
          <Field label="Passwort" value={password} onChange={setPassword} type="password" />
          {error ? <div style={{ color: '#c43f3f', fontSize: '13px' }}>{error}</div> : null}
          <button onClick={() => void login()} style={{ border: 'none', borderRadius: '10px', padding: '12px', background: '#1FBCB3', color: 'white', fontWeight: 700 }}>
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerS}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
          <div style={{ color: '#5d6a75', fontSize: '13px' }}>
            {user.email} ({user.role})
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => void loadData()} style={{ border: '1px solid #c6d2db', borderRadius: '10px', padding: '10px 14px', background: 'white' }}>
            Aktualisieren
          </button>
          <button onClick={() => void logout()} style={{ border: 'none', borderRadius: '10px', padding: '10px 14px', background: '#243746', color: 'white' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={panelS}>
          <div style={{ fontSize: '12px', color: '#60717d' }}>Angebote gesamt</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.summary.total ?? 0}</div>
        </div>
        <div style={panelS}>
          <div style={{ fontSize: '12px', color: '#60717d' }}>Heute</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.summary.today ?? 0}</div>
        </div>
        <div style={panelS}>
          <div style={{ fontSize: '12px', color: '#60717d' }}>7 Tage</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.summary.week ?? 0}</div>
        </div>
        <div style={panelS}>
          <div style={{ fontSize: '12px', color: '#60717d' }}>API-Fehler (7 Tage)</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.summary.logsErrors ?? 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={panelS}>
          <h3 style={{ marginTop: 0 }}>Angebotsübersicht</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableS}>
              <thead>
                <tr>
                  <th style={thtdS}>Zeit</th>
                  <th style={thtdS}>Adresse</th>
                  <th style={thtdS}>Wert</th>
                  <th style={thtdS}>Status</th>
                </tr>
              </thead>
              <tbody>
                {valuations.map((row, index) => (
                  <tr key={String(row.id || index)}>
                    <td style={thtdS}>{String(row.createdAt || '')}</td>
                    <td style={thtdS}>{`${String(row.objectAddress || '')} ${String(row.plz || '')} ${String(row.city || '')}`.trim()}</td>
                    <td style={thtdS}>{String(row.marketValue || '')}</td>
                    <td style={thtdS}>{String(row.checkoutStatus || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={panelS}>
          <h3 style={{ marginTop: 0 }}>Connector Status</h3>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
            {connectors.map((row, index) => (
              <div key={String(row.state || index)} style={{ border: '1px solid #e6ebef', borderRadius: '10px', padding: '10px' }}>
                <strong>{String(row.state || '')}</strong>
                <div>{String(row.type || '')}</div>
                <div style={{ color: '#62717c' }}>
                  {row.health && typeof row.health === 'object' && 'ok' in row.health
                    ? (row.health as { ok: boolean; status: number }).ok
                      ? `OK (${(row.health as { ok: boolean; status: number }).status})`
                      : 'Nicht erreichbar'
                    : 'Unbekannt'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={panelS}>
          <h3 style={{ marginTop: 0 }}>API Fehlerübersicht</h3>
          <div style={{ maxHeight: '260px', overflow: 'auto', fontSize: '12px' }}>
            {errors.map((row, index) => (
              <div key={String(row.id || index)} style={{ borderBottom: '1px solid #edf1f4', padding: '8px 0' }}>
                <strong>{String(row.scope || '')}</strong>
                <div>{String(row.message || '')}</div>
                <div style={{ color: '#62717c' }}>{String(row.createdAt || '')}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={panelS}>
          <h3 style={{ marginTop: 0 }}>PDF Übersicht</h3>
          <div style={{ maxHeight: '260px', overflow: 'auto', fontSize: '12px' }}>
            {pdfs.map((row, index) => (
              <div key={String(row.id || index)} style={{ borderBottom: '1px solid #edf1f4', padding: '8px 0' }}>
                <strong>{String(row.title || 'Immobilien-Kurzbewertung')}</strong>
                <div>{String(row.createdAt || '')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...panelS, marginTop: '12px' }}>
        <h3 style={{ marginTop: 0 }}>System Logs</h3>
        <div style={{ maxHeight: '220px', overflow: 'auto', fontSize: '12px' }}>
          {logs.map((row, index) => (
            <div key={String(row.id || index)} style={{ borderBottom: '1px solid #edf1f4', padding: '8px 0' }}>
              <strong>{String(row.level || '').toUpperCase()}</strong> | {String(row.scope || '')}
              <div>{String(row.message || '')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
