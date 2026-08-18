import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { formatCurrency, formatDate, downloadBlob, toEmployeeExcelRow } from '../api.js';
import EmployeeForm from './EmployeeForm.jsx';

function SalaryModal({ employee, onClose, onApplied }) {
  const [salary, setSalary] = useState(String(employee.salary ?? ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (salary === '' || Number(salary) < 0) return setError('Enter a positive salary');
    setBusy(true);
    try {
      const res = await api.updateSalary(employee.id, Number(salary));
      onApplied(res.applied);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Update Salary — {employee.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <p className="hint">Runs stored procedure <code>UpdateEmployeeSalary</code>. Decreases over 50% are rejected.</p>
          <label>
            Current salary: <strong>{formatCurrency(employee.salary)}</strong>
            <input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} autoFocus />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Applying…' : 'Apply Salary'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ employee, departments, onClose, onDone }) {
  const [deptId, setDeptId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!deptId) return setError('Select a department');
    setBusy(true);
    try {
      await api.transferEmployee(employee.id, Number(deptId));
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Transfer — {employee.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <p className="hint">Runs stored procedure <code>TransferEmployee</code> and logs the move.</p>
          <label>
            New department
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} autoFocus>
              <option value="">— Select department —</option>
              {departments
                .filter((d) => d.id !== employee.departmentId)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Transferring…' : 'Transfer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees({ pushToast }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(null); // {mode:'add'|'edit', employee?}
  const [salaryEmployee, setSalaryEmployee] = useState(null);
  const [transferEmployee, setTransferEmployee] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [emps, depts] = await Promise.all([api.getEmployees(), api.getDepartments()]);
      setEmployees(emps);
      setDepartments(depts);
    } catch (e) {
      pushToast('error', `Failed to load data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter && e.departmentId !== Number(deptFilter)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [employees, search, deptFilter]);

  async function handleSave(data) {
    setBusy(true);
    try {
      await api.saveEmployee(data);
      pushToast('success', data.id ? 'Employee updated.' : 'Employee created.');
      setFormState(null);
      await load();
    } catch (e) {
      pushToast('error', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await api.deleteEmployee(emp.id);
      pushToast('success', `${emp.name} deleted.`);
      await load();
    } catch (e) {
      pushToast('error', e.message);
    }
  }

  async function handleExport() {
    try {
      const filePath = await api.saveExcelFile('employees.xlsx');
      if (!filePath) return;
      const res = await api.exportToExcel(filePath);
      pushToast('success', `Exported ${res.count} employees to ${filePath}`);
      await api.openFileLocation(filePath);
    } catch (e) {
      pushToast('error', e.message);
    }
  }

  async function handleExportDownload() {
    try {
      const res = await api.exportToExcelBuffer();
      const rows = res.data instanceof Uint8Array ? res.data : new Uint8Array(Object.values(res.data));
      downloadBlob(rows, `employees-${new Date().toISOString().slice(0, 10)}.xlsx`);
      pushToast('success', `Exported ${res.count} employees.`);
    } catch (e) {
      pushToast('error', e.message);
    }
  }

  if (loading) return <div className="loading">Loading employees…</div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Employees</h1>
        <p>Manage employee records</p>
      </header>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search name, email, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={handleExportDownload}>Download Excel</button>
        <button className="btn btn-outline" onClick={handleExport}>Export to File…</button>
        <button className="btn btn-primary" onClick={() => setFormState({ mode: 'add' })}>+ Add Employee</button>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Salary</th>
              <th>Join Date</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No employees match your filters.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id}>
                <td className="strong">{e.name}</td>
                <td>{e.email}</td>
                <td>
                  <span className="badge">{e.department?.name ?? '—'}</span>
                </td>
                <td>{formatCurrency(e.salary)}</td>
                <td>{formatDate(e.joinDate)}</td>
                <td className="right actions">
                  <button className="btn btn-tiny" title="Transfer department" onClick={() => setTransferEmployee(e)}>⇄</button>
                  <button className="btn btn-tiny" title="Update salary (stored proc)" onClick={() => setSalaryEmployee(e)}>¢</button>
                  <button className="btn btn-tiny" title="Edit" onClick={() => setFormState({ mode: 'edit', employee: e })}>✎</button>
                  <button className="btn btn-tiny danger" title="Delete" onClick={() => handleDelete(e)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formState && (
        <EmployeeForm
          employee={formState.employee}
          departments={departments}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      )}
      {salaryEmployee && (
        <SalaryModal
          employee={salaryEmployee}
          onApplied={(applied) => pushToast('success', `Salary updated to ${formatCurrency(applied)}`)}
          onClose={() => setSalaryEmployee(null)}
        />
      )}
      {transferEmployee && (
        <TransferModal
          employee={transferEmployee}
          departments={departments}
          onDone={() => pushToast('success', `${transferEmployee.name} transferred.`)}
          onClose={() => setTransferEmployee(null)}
        />
      )}
    </div>
  );
}