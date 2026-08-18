import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'sample-data');
mkdirSync(outDir, { recursive: true });

async function writeRows(fileName, rows) {
  const workbook = new ExcelJS.Workbook();
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
  await workbook.xlsx.writeFile(join(outDir, fileName));
  console.log('wrote', fileName);
}

await writeRows('employees-import.xlsx', [
  { name: 'Charlie Green', email: 'charlie@company.com', department: 'Engineering', salary: 90000, joinDate: '2025-02-10' },
  { name: 'Dana White', email: 'dana@company.com', department: 'Marketing', salary: 62000, joinDate: '2025-03-15' },
  { name: 'Eve Black', email: 'eve@company.com', department: 'Sales', salary: 58000, joinDate: '2024-12-01' },
  { name: 'Frank Blue', email: 'frank@company.com', department: 'HR', salary: 70000, joinDate: '2025-05-20' },
]);

await writeRows('employees-import-with-errors.xlsx', [
  { name: 'Good Row', email: 'good@company.com', department: 'Engineering', salary: 88000, joinDate: '2025-06-01' },
  { name: '', email: 'no-name@company.com', department: 'Engineering', salary: 88000, joinDate: '2025-06-01' },
  { name: 'Bad Email', email: 'not-an-email', department: 'Engineering', salary: 88000, joinDate: '2025-06-01' },
  { name: 'Bad Dept', email: 'bad-dept@company.com', department: 'NotARealDept', salary: 88000, joinDate: '2025-06-01' },
  { name: 'Bad Salary', email: 'bad-salary@company.com', department: 'Engineering', salary: -50, joinDate: '2025-06-01' },
  { name: 'Bad Date', email: 'bad-date@company.com', department: 'Engineering', salary: 88000, joinDate: 'not-a-date' },
  { name: 'Empty Row OK', email: 'ok@company.com', department: 'Engineering', salary: 88000, joinDate: '2025-06-01' },
]);

await writeRows('employees-template.xlsx', [
  { name: 'John Doe', email: 'john@company.com', department: 'Engineering', salary: 50000, joinDate: '2024-01-15' },
]);

console.log('Sample Excel files created in sample-data/');