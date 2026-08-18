const { contextBridge, ipcRenderer } = require('electron');

const toUint8 = (buffer) => new Uint8Array(buffer);

contextBridge.exposeInMainWorld('api', {
  // File operations
  openExcelFile: () => ipcRenderer.invoke('open-excel-file'),
  saveExcelFile: (defaultName) => ipcRenderer.invoke('save-excel-file', { defaultName }),
  exportToExcel: (filePath) => ipcRenderer.invoke('export-to-excel', { filePath }),
  exportToExcelBuffer: () => ipcRenderer.invoke('export-to-excel-buffer'),
  downloadTemplate: async () => {
    const res = await ipcRenderer.invoke('download-template');
    return { ok: res.ok, data: res.data && toUint8(res.data) };
  },
  importExcelFile: (filePath) => ipcRenderer.invoke('import-excel-file', filePath),
  saveImportedRows: (rows) => ipcRenderer.invoke('save-imported-rows', rows),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),

  // Database operations
  getEmployees: () => ipcRenderer.invoke('get-employees'),
  getEmployee: (id) => ipcRenderer.invoke('get-employee', id),
  saveEmployee: (data) => ipcRenderer.invoke('save-employee', data),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getDepartments: () => ipcRenderer.invoke('get-departments'),
  saveDepartment: (data) => ipcRenderer.invoke('save-department', data),
  deleteDepartment: (id) => ipcRenderer.invoke('delete-department', id),
  getDepartmentDetail: (deptId) => ipcRenderer.invoke('get-department-detail', deptId),
  getDepartmentStats: (deptId) => ipcRenderer.invoke('get-department-stats', deptId),
  updateSalary: (employeeId, salary) =>
    ipcRenderer.invoke('update-salary', { employeeId, salary }),
  bulkUpdateSalary: (deptId, percent) =>
    ipcRenderer.invoke('bulk-update-salary', { deptId, percent }),
  transferEmployee: (employeeId, newDeptId) =>
    ipcRenderer.invoke('transfer-employee', { employeeId, newDeptId }),
  getTransferLog: (employeeId) => ipcRenderer.invoke('get-transfer-log', employeeId),

  // System
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  onOperationError: (callback) => {
    ipcRenderer.on('operation-error', (_event, payload) => callback(payload));
    return () => ipcRenderer.removeAllListeners('operation-error');
  },
});