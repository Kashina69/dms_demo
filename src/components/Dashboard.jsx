import { useEffect, useState } from 'react';
import api, { formatCurrency, formatDate } from '../api.js';

export default function Dashboard({ pushToast, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      pushToast('error', `Failed to load dashboard: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!stats) return <div className="loading">No data available</div>;

  const cards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: '☰' },
    { label: 'Departments', value: stats.totalDepartments, icon: '▦' },
    { label: 'Average Salary', value: formatCurrency(stats.averageSalary), icon: '৳' },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your workforce</p>
      </header>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon">{c.icon}</div>
            <div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Recent Employees</h2>
          <button className="btn btn-ghost" onClick={() => onNavigate('employees')}>
            View all →
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Salary</th>
              <th>Join Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No employees yet. Add your first employee.
                </td>
              </tr>
            )}
            {stats.recentEmployees.map((e) => (
              <tr key={e.id}>
                <td className="strong">{e.name}</td>
                <td>{e.email}</td>
                <td>
                  <span className="badge">{e.department?.name ?? '—'}</span>
                </td>
                <td>{formatCurrency(e.salary)}</td>
                <td>{formatDate(e.joinDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}