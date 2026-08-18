import { useCallback, useEffect, useState } from 'react';
import api from './api.js';
import Dashboard from './components/Dashboard.jsx';
import Employees from './components/Employees.jsx';
import Departments from './components/Departments.jsx';
import ImportExport from './components/ImportExport.jsx';
import Toast from './components/Toast.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧' },
  { id: 'employees', label: 'Employees', icon: '☰' },
  { id: 'departments', label: 'Departments', icon: '▦' },
  { id: 'import-export', label: 'Import / Export', icon: '⇅' },
];

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    return api.onOperationError(({ message }) => {
      pushToast('error', message);
    });
  }, [pushToast]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">▤</span>
          <div>
            <div className="brand-title">EmpData Manager</div>
            <div className="brand-sub">HR Console</div>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${screen === item.id ? 'active' : ''}`}
              onClick={() => setScreen(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">PostgreSQL · Sequelize · Electron</div>
      </aside>

      <main className="content">
        {screen === 'dashboard' && <Dashboard pushToast={pushToast} onNavigate={setScreen} />}
        {screen === 'employees' && <Employees pushToast={pushToast} />}
        {screen === 'departments' && <Departments pushToast={pushToast} />}
        {screen === 'import-export' && <ImportExport pushToast={pushToast} />}
      </main>

      <Toast toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}