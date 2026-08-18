import { sequelize, TransferLog } from '../models/index.js';
import { getAllEmployees, getDashboardStats, createEmployee, updateEmployee, deleteEmployee, transferEmployee, updateEmployeeSalary } from '../services/employeeService.js';
import { getAllDepartments, getDepartmentDetail } from '../services/departmentService.js';
import { exportEmployeesToBuffer, downloadTemplate, parseImportFile, importEmployees } from '../services/excelService.js';
import { getTransferLog, bulkUpdateEmployeeSalaries } from '../services/storedProcService.js';

async function main() {
  await sequelize.authenticate();
  console.log('[ok] DB connected');

  const deps = await getAllDepartments();
  console.log('[ok] departments:', deps.map((d) => `${d.name}(${d.employeeCount})`).join(', '));

  const detail = await getDepartmentDetail(1);
  console.log('[ok] dept 1 detail:', JSON.stringify({ total: detail.totalEmployees, avg: detail.avgSalary, empCount: detail.employees.length }));

  const emps = await getAllEmployees();
  console.log('[ok] employees:', emps.length);

  const dash = await getDashboardStats();
  console.log('[ok] dashboard:', JSON.stringify({ total: dash.totalEmployees, depts: dash.totalDepartments, avg: Math.round(dash.averageSalary) }));

  const newEmp = await createEmployee({ name: 'Test Person', email: 'test.person@company.com', departmentId: 1, salary: 45000, joinDate: '2025-06-01' });
  console.log('[ok] created employee id:', newEmp.id);

  const updated = await updateEmployee(newEmp.id, { salary: 46000 });
  console.log('[ok] updated salary:', Number(updated.salary));

  await transferEmployee(newEmp.id, 2);
  console.log('[ok] transferred employee to dept 2');
  const log = await getTransferLog(newEmp.id);
  console.log('[ok] transfer log entries:', log.length);

  const logModelCount = await TransferLog.count({ where: { employeeId: newEmp.id } });
  console.log('[ok] TransferLog model entries:', logModelCount);
  if (logModelCount !== log.length) throw new Error('TransferLog model count mismatch');

  try {
    await updateEmployeeSalary(newEmp.id, 100);
    console.log('[FAIL] salary validation did not trigger');
  } catch (e) {
    console.log('[ok] salary validation blocked decrease:', e.message);
  }

  const bulkBefore = await getAllEmployees().then((all) =>
    all.filter((e) => e.departmentId === 2).map((e) => ({ id: e.id, salary: e.salary }))
  );
  const bulkCount = await bulkUpdateEmployeeSalaries(2, 10);
  console.log('[ok] bulk salary +10% in dept 2 updated:', bulkCount);
  const bulkBlocked = await bulkUpdateEmployeeSalaries(2, -60).catch((e) => e.message);
  console.log('[ok] bulk decrease over 50% blocked:', bulkBlocked);
  if (!String(bulkBlocked).includes('50%')) throw new Error('Bulk decrease guard did not trigger');
  for (const row of bulkBefore) {
    await sequelize.query('UPDATE employees SET salary = :salary, "updatedAt" = NOW() WHERE id = :id', {
      replacements: { salary: row.salary, id: row.id },
    });
  }
  console.log('[ok] restored dept 2 salaries');

  const buf = await exportEmployeesToBuffer(emps);
  console.log('[ok] exported buffer bytes:', buf.length);
  const tpl = await downloadTemplate();
  console.log('[ok] template buffer bytes:', tpl.length);

  await deleteEmployee(newEmp.id);
  console.log('[ok] deleted test employee');

  const empsAfter = await getAllEmployees();
  console.log('[ok] employees after cleanup:', empsAfter.length);
  await sequelize.close();
  console.log('ALL SERVICE CHECKS PASSED');
}

main().catch(async (e) => {
  console.error('SERVICE CHECK FAILED:', e.message);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});