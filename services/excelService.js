import ExcelJS from 'exceljs';
import { Employee, Department } from '../models/index.js';

export const EXCEL_COLUMNS = ['Name', 'Email', 'Department', 'Salary', 'Join Date'];

function normalizeHeaders(row) {
  return row.map((cell) => String(cell ?? '').trim().toLowerCase());
}

function getColumnIndex(headers, name) {
  return headers.findIndex((h) => h === name.toLowerCase());
}

async function buildWorksheet(workbook, rows) {
  const ws = workbook.addWorksheet('Employees');
  ws.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Salary', key: 'salary', width: 14 },
    { header: 'Join Date', key: 'joinDate', width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  return ws;
}

export async function exportEmployeesToWorkbook(employees) {
  const workbook = new ExcelJS.Workbook();
  const rows = employees.map((e) => ({
    name: e.name,
    email: e.email,
    department: e.department?.name ?? '',
    salary: Number(e.salary),
    joinDate: e.joinDate ?? '',
  }));
  await buildWorksheet(workbook, rows);
  return workbook;
}

export async function exportEmployeesToBuffer(employees) {
  const workbook = await exportEmployeesToWorkbook(employees);
  return workbook.xlsx.writeBuffer();
}

export async function exportEmployeesToFile(employees, filePath) {
  const workbook = await exportEmployeesToWorkbook(employees);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export async function downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  await buildWorksheet(workbook, [
    {
      name: 'John Doe',
      email: 'john@company.com',
      department: 'Engineering',
      salary: 50000,
      joinDate: '2024-01-15',
    },
  ]);
  return workbook.xlsx.writeBuffer();
}

export async function parseImportFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error('Excel file contains no worksheets');

  const headers = normalizeHeaders(ws.getRow(1).values.slice(1));
  const idxName = getColumnIndex(headers, EXCEL_COLUMNS[0]);
  const idxEmail = getColumnIndex(headers, EXCEL_COLUMNS[1]);
  const idxDept = getColumnIndex(headers, EXCEL_COLUMNS[2]);
  const idxSalary = getColumnIndex(headers, EXCEL_COLUMNS[3]);
  const idxJoin = getColumnIndex(headers, EXCEL_COLUMNS[4]);

  const missing = [];
  for (let i = 0; i < EXCEL_COLUMNS.length; i++) {
    if (!headers.includes(EXCEL_COLUMNS[i].toLowerCase())) missing.push(EXCEL_COLUMNS[i]);
  }
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}`);
  }

  const departments = await Department.findAll();
  const deptMap = new Map(
    departments.map((d) => [String(d.name).trim().toLowerCase(), d.id])
  );

  const rows = [];
  const errors = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1);
    const get = (idx) => (idx >= 0 ? values[idx] : undefined);

    const name = String(get(idxName) ?? '').trim();
    const email = String(get(idxEmail) ?? '').trim();
    const deptName = String(get(idxDept) ?? '').trim();
    const rawSalary = get(idxSalary);
    const rawJoin = get(idxJoin);

    if (!name && !email && !deptName && rawSalary === undefined && rawJoin === undefined) return;

    const rowErrors = [];
    if (!name) rowErrors.push('Name is required');

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!email) rowErrors.push('Email is required');
    else if (!emailValid) rowErrors.push(`Invalid email format: "${email}"`);

    const salary = Number(rawSalary);
    if (rawSalary === undefined || rawSalary === null || rawSalary === '') {
      rowErrors.push('Salary is required');
    } else if (!Number.isFinite(salary) || salary <= 0) {
      rowErrors.push(`Salary must be a positive number (got "${rawSalary}")`);
    }

    let departmentId = null;
    if (!deptName) {
      rowErrors.push('Department is required');
    } else if (!deptMap.has(deptName.toLowerCase())) {
      rowErrors.push(`Department "${deptName}" does not exist`);
    } else {
      departmentId = deptMap.get(deptName.toLowerCase());
    }

    let joinDate = null;
    if (rawJoin !== undefined && rawJoin !== null && String(rawJoin).trim() !== '') {
      const d = new Date(String(rawJoin));
      if (Number.isNaN(d.getTime())) {
        rowErrors.push(`Invalid join date: "${rawJoin}"`);
      } else {
        joinDate = d.toISOString().slice(0, 10);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, name, email, errors: rowErrors });
    } else {
      rows.push({ name, email, departmentId, departmentName: deptName, salary, joinDate });
    }
  });

  return { validRows: rows, errorRows: errors };
}

export async function importEmployees(rows) {
  const created = [];
  for (const r of rows) {
    const [employee] = await Employee.findOrCreate({
      where: { email: r.email },
      defaults: {
        name: r.name,
        departmentId: r.departmentId,
        salary: r.salary,
        joinDate: r.joinDate,
      },
    });
    created.push(employee);
  }
  return created;
}