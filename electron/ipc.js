import { dialog, ipcMain, Notification, shell } from 'electron';
import fs from 'node:fs';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDashboardStats,
  updateEmployeeSalary,
  transferEmployee,
} from '../services/employeeService.js';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentDetail,
} from '../services/departmentService.js';
import { getTransferLog, bulkUpdateEmployeeSalaries } from '../services/storedProcService.js';
import {
  exportEmployeesToFile,
  exportEmployeesToBuffer,
  downloadTemplate,
  parseImportFile,
  importEmployees,
} from '../services/excelService.js';

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function notifySuccess(title, body) {
  showNotification(`✓ ${title}`, body);
}

function notifyError(title, body) {
  showNotification(`✕ ${title}`, body);
}

function sendError(event, error, title = 'Operation failed') {
  const message = error?.message || String(error);
  notifyError(title, message);
  event.sender.send('operation-error', { message });
}

export function registerIpcHandlers() {
  // ---------- File operations ----------
  ipcMain.handle('open-excel-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Excel file',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('save-excel-file', async (_event, { defaultName = 'employees.xlsx' }) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Excel file',
      defaultPath: defaultName,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });

  ipcMain.handle('export-to-excel', async (event, { filePath }) => {
    try {
      const employees = await getAllEmployees();
      await exportEmployeesToFile(employees, filePath);
      notifySuccess('Export complete', `Exported ${employees.length} employees to ${filePath}`);
      return { ok: true, count: employees.length, filePath };
    } catch (error) {
      sendError(event, error, 'Export failed');
      throw error;
    }
  });

  ipcMain.handle('export-to-excel-buffer', async (event) => {
    try {
      const employees = await getAllEmployees();
      const buffer = await exportEmployeesToBuffer(employees);
      notifySuccess('Export complete', `Exported ${employees.length} employees.`);
      return { ok: true, count: employees.length, data: buffer };
    } catch (error) {
      sendError(event, error, 'Export failed');
      throw error;
    }
  });

  ipcMain.handle('download-template', async (event) => {
    try {
      const buffer = await downloadTemplate();
      notifySuccess('Template downloaded', 'Import template ready to use.');
      return { ok: true, data: buffer };
    } catch (error) {
      sendError(event, error, 'Template download failed');
      throw error;
    }
  });

  ipcMain.handle('import-excel-file', async (event, filePath) => {
    try {
      const result = await parseImportFile(filePath);
      return result;
    } catch (error) {
      sendError(event, error, 'Import failed');
      throw error;
    }
  });

  ipcMain.handle('save-imported-rows', async (event, rows) => {
    try {
      const created = await importEmployees(rows);
      notifySuccess('Import complete', `Imported ${created.length} employees successfully.`);
      return { ok: true, count: created.length };
    } catch (error) {
      sendError(event, error, 'Import failed');
      throw error;
    }
  });

  ipcMain.handle('open-file-location', async (_event, filePath) => {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    }
    return filePath;
  });

  // ---------- Database operations ----------
  ipcMain.handle('get-employees', async () => getAllEmployees());
  ipcMain.handle('get-employee', async (_event, id) => getEmployeeById(id));

  ipcMain.handle('save-employee', async (event, data) => {
    try {
      const result = data.id
        ? await updateEmployee(data.id, data)
        : await createEmployee(data);
      notifySuccess('Employee saved', `${result.name} saved successfully.`);
      return result;
    } catch (error) {
      sendError(event, error, 'Save failed');
      throw error;
    }
  });

  ipcMain.handle('delete-employee', async (event, id) => {
    try {
      const result = await deleteEmployee(id);
      notifySuccess('Employee deleted', `Employee removed successfully.`);
      return result;
    } catch (error) {
      sendError(event, error, 'Delete failed');
      throw error;
    }
  });

  ipcMain.handle('get-dashboard-stats', async () => getDashboardStats());

  ipcMain.handle('get-departments', async () => getAllDepartments());
  ipcMain.handle('save-department', async (event, data) => {
    try {
      const result = data.id
        ? await updateDepartment(data.id, data)
        : await createDepartment(data);
      notifySuccess('Department saved', `${result.name} saved successfully.`);
      return result;
    } catch (error) {
      sendError(event, error, 'Save failed');
      throw error;
    }
  });
  ipcMain.handle('delete-department', async (event, id) => {
    try {
      const result = await deleteDepartment(id);
      notifySuccess('Department deleted', 'Department removed successfully.');
      return result;
    } catch (error) {
      sendError(event, error, 'Delete failed');
      throw error;
    }
  });

  ipcMain.handle('get-department-detail', async (_event, deptId) =>
    getDepartmentDetail(deptId)
  );
  ipcMain.handle('get-department-stats', async (_event, deptId) => {
    const detail = await getDepartmentDetail(deptId);
    return {
      totalEmployees: detail.totalEmployees,
      avgSalary: detail.avgSalary,
      employees: detail.employees,
    };
  });

  ipcMain.handle('update-salary', async (event, { employeeId, salary }) => {
    try {
      const applied = await updateEmployeeSalary(employeeId, salary);
      notifySuccess('Salary updated', `New salary ${applied} applied.`);
      return { ok: true, applied };
    } catch (error) {
      sendError(event, error, 'Salary update failed');
      throw error;
    }
  });

  ipcMain.handle('bulk-update-salary', async (event, { deptId, percent }) => {
    try {
      const updatedCount = await bulkUpdateEmployeeSalaries(deptId ?? null, percent);
      notifySuccess('Bulk salary update', `Updated ${updatedCount} employee salaries.`);
      return { ok: true, updatedCount };
    } catch (error) {
      sendError(event, error, 'Bulk salary update failed');
      throw error;
    }
  });

  ipcMain.handle('transfer-employee', async (event, { employeeId, newDeptId }) => {
    try {
      await transferEmployee(employeeId, newDeptId);
      notifySuccess('Employee transferred', 'Transfer completed and logged.');
      return { ok: true };
    } catch (error) {
      sendError(event, error, 'Transfer failed');
      throw error;
    }
  });

  ipcMain.handle('get-transfer-log', async (_event, employeeId) =>
    getTransferLog(employeeId ?? null)
  );

  // ---------- System ----------
  ipcMain.handle('show-notification', (_event, { title, body }) => {
    notifySuccess(title || 'Notification', body || '');
    return true;
  });
}