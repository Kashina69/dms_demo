import { useEffect, useState } from 'react';

export default function EmployeeForm({ employee, departments, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    departmentId: '',
    salary: '',
    joinDate: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        email: employee.email,
        departmentId: employee.departmentId ?? '',
        salary: employee.salary ?? '',
        joinDate: employee.joinDate ?? '',
      });
    }
  }, [employee]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Valid email is required');
    if (form.salary === '' || Number(form.salary) < 0) return setError('Salary must be a positive number');

    try {
      await onSave({
        ...form,
        id: employee?.id,
        departmentId: form.departmentId === '' ? null : Number(form.departmentId),
        salary: Number(form.salary),
        joinDate: form.joinDate || null,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Name *
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" />
            </label>
            <label>
              Email *
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@company.com" />
            </label>
            <label>
              Department
              <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                <option value="">— No department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              Salary *
              <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="50000" />
            </label>
            <label>
              Join Date
              <input type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Employee</button>
          </div>
        </form>
      </div>
    </div>
  );
}