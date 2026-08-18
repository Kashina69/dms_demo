import { useState } from 'react';
import api, { downloadBlob, formatCurrency, formatDate } from '../api.js';

export default function ImportExport({ pushToast }) {
  const [filePath, setFilePath] = useState(null);
  const [preview, setPreview] = useState(null); // { validRows, errorRows }
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      const path = await api.openExcelFile();
      if (!path) return;
      setFilePath(path);
      const result = await api.importExcelFile(path);
      setPreview(result);
      pushToast('info', `Parsed ${result.validRows.length} valid rows, ${result.errorRows.length} errors.`);
    } catch (e) {
      pushToast('error', `Import failed: ${e.message}`);
      setPreview(null);
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveImport() {
    if (!preview || preview.validRows.length === 0) return;
    setSaving(true);
    try {
      const res = await api.saveImportedRows(preview.validRows);
      pushToast('success', `Imported ${res.count} employees.`);
      setPreview(null);
      setFilePath(null);
    } catch (e) {
      pushToast('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const filePath = await api.saveExcelFile('employees.xlsx');
      if (!filePath) return;
      const res = await api.exportToExcel(filePath);
      pushToast('success', `Exported ${res.count} employees to ${filePath}`);
      await api.openFileLocation(filePath);
    } catch (e) {
      pushToast('error', e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await api.downloadTemplate();
      const data = res.data instanceof Uint8Array ? res.data : new Uint8Array(Object.values(res.data));
      downloadBlob(data, 'employee-import-template.xlsx');
      pushToast('success', 'Template downloaded.');
    } catch (e) {
      pushToast('error', e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Import / Export</h1>
        <p>Bulk operations with Excel files</p>
      </header>

      <div className="panel">
        <h2>Export</h2>
        <p className="hint">Export the current employee list to an Excel file using the native save dialog.</p>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Employees to Excel'}
        </button>
      </div>

      <div className="panel">
        <h2>Import</h2>
        <p className="hint">
          Import employees from an Excel file with columns:{' '}
          <code>Name</code>, <code>Email</code>, <code>Department</code>, <code>Salary</code>, <code>Join Date</code>.
          Data is validated before saving.
        </p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? 'Opening…' : 'Import Excel File…'}
          </button>
          <button className="btn btn-outline" onClick={handleDownloadTemplate}>
            Download Template
          </button>
        </div>
        {filePath && <p className="file-path">📄 {filePath}</p>}
      </div>

      {preview && (
        <>
          <div className="panel">
            <div className="panel-header">
              <h2>Preview — {preview.validRows.length} ready to import</h2>
              <button className="btn btn-success" onClick={handleSaveImport} disabled={saving || preview.validRows.length === 0}>
                {saving ? 'Saving…' : `Save ${preview.validRows.length} Employees`}
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
                {preview.validRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">No valid rows to import.</td>
                  </tr>
                )}
                {preview.validRows.map((r, i) => (
                  <tr key={i}>
                    <td className="strong">{r.name}</td>
                    <td>{r.email}</td>
                    <td>
                      <span className="badge">{r.departmentName}</span>
                    </td>
                    <td>{formatCurrency(r.salary)}</td>
                    <td>{formatDate(r.joinDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.errorRows.length > 0 && (
            <div className="panel">
              <h2>Validation Errors — {preview.errorRows.length} rows skipped</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errorRows.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.name || '—'}</td>
                      <td>{r.email || '—'}</td>
                      <td>
                        <ul className="error-list">
                          {r.errors.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}