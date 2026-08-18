import { useEffect, useState } from 'react';
import api, { formatCurrency, formatDate } from '../api.js';

function DepartmentDetail({ deptId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getDepartmentDetail(deptId);
        setDetail(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [deptId]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>{detail?.name ?? 'Department'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="form-error">{error}</div>}
        {loading ? (
          <div className="loading">Loading department…</div>
        ) : (
          <>
            <div className="stat-grid small">
              <div className="stat-card">
                <div className="stat-value">{detail.total_employees}</div>
                <div className="stat-label">Employees (stored proc)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{formatCurrency(detail.avg_salary)}</div>
                <div className="stat-label">Average Salary (stored proc)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{detail.location || '—'}</div>
                <div className="stat-label">Location</div>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Salary</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.employees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">No employees in this department.</td>
                  </tr>
                )}
                {detail.employees.map((e) => (
                  <tr key={e.id}>
                    <td className="strong">{e.name}</td>
                    <td>{e.email}</td>
                    <td>{formatCurrency(e.salary)}</td>
                    <td>{formatDate(e.join_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default function Departments({ pushToast }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ name: '', location: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setDepartments(await api.getDepartments());
    } catch (e) {
      pushToast('error', `Failed to load departments: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await api.saveDepartment({ name: form.name.trim(), location: form.location.trim() || null });
      pushToast('success', `Department "${form.name}" created.`);
      setForm({ name: '', location: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      pushToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(dept) {
    if (!confirm(`Delete "${dept.name}"? Only possible when empty.`)) return;
    try {
      await api.deleteDepartment(dept.id);
      pushToast('success', `${dept.name} deleted.`);
      await load();
    } catch (e) {
      pushToast('error', e.message);
    }
  }

  if (loading) return <div className="loading">Loading departments…</div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Departments</h1>
        <p>Manage departments and employee assignments</p>
      </header>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Department</button>
      </div>

      <div className="dept-grid">
        {departments.map((d) => (
          <div key={d.id} className="dept-card" onClick={() => setDetailId(d.id)}>
            <div className="dept-card-top">
              <span className="dept-name">{d.name}</span>
              <button
                className="btn btn-tiny danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(d);
                }}
                title="Delete department"
              >
                🗑
              </button>
            </div>
            <div className="dept-meta">
              <span>📍 {d.location || 'No location'}</span>
            </div>
            <div className="dept-stats">
              <div>
                <div className="stat-value">{d.employeeCount}</div>
                <div className="stat-label">Employees</div>
              </div>
              <div>
                <div className="stat-value">{formatCurrency(d.avg_salary)}</div>
                <div className="stat-label">Avg Salary</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Department</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <label>
                  Name *
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Engineering" autoFocus />
                </label>
                <label>
                  Location
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Floor 3" />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim()}>
                  {busy ? 'Creating…' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailId && <DepartmentDetail deptId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}