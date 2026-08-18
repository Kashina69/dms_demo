import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sequelize } from '../models/index.js';
import { registerIpcHandlers } from './ipc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

async function connectDb() {
  await sequelize.authenticate();
  console.log('[main] Database connected');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'EmpData Manager',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    mainWindow.loadURL(devServer);
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.SMOKE_TEST) {
    mainWindow.webContents.on('console-message', (event) => {
      console.log('[renderer console]', event.message);
    });
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const apiExists = await mainWindow.webContents.executeJavaScript(
          `typeof window.api`
        );
        console.log('[smoke] typeof window.api:', apiExists);
        const stats = await mainWindow.webContents.executeJavaScript(
          `window.api.getDashboardStats().then(r => JSON.stringify({ total: r.totalEmployees, avg: r.averageSalary }))`
        );
        console.log('[smoke] dashboard IPC ok:', stats);
        const depts = await mainWindow.webContents.executeJavaScript(
          `window.api.getDepartments().then(r => JSON.stringify(r.map(d => d.name)))`
        );
        console.log('[smoke] departments IPC ok:', depts);
        const xls = await mainWindow.webContents.executeJavaScript(
          `window.api.exportToExcelBuffer().then(r => JSON.stringify({ ok: r.ok, count: r.count, bytes: r.data.length }))`
        );
        console.log('[smoke] export buffer IPC ok:', xls);
        const parsed = await mainWindow.webContents.executeJavaScript(
          `window.api.importExcelFile(${JSON.stringify(
            join(__dirname, '..', 'sample-data', 'employees-import-with-errors.xlsx')
          )}).then(r => JSON.stringify({ valid: r.validRows.length, errors: r.errorRows.length }))`
        );
        console.log('[smoke] import parse IPC ok:', parsed);
        console.log('[smoke] renderer loaded OK');
      } catch (error) {
        console.error('[smoke] FAILED:', error.message);
      }
      setTimeout(() => app.quit(), 1500);
    });
  }
}

app.whenReady().then(async () => {
  try {
    await connectDb();
  } catch (error) {
    console.error('[main] Database connection failed:', error.message);
    const { dialog } = await import('electron');
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Database connection failed',
      message: 'Could not connect to PostgreSQL. Check that the service is running and .env is configured.',
      detail: error.message,
    });
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', async () => {
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
});