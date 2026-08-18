import sequelize from '../models/sequelize.js';

export async function getEmployeesByDepartment(deptId = null) {
  const [rows] = await sequelize.query(
    `SELECT * FROM "GetEmployeesByDepartment"(:deptId)`,
    { replacements: { deptId } }
  );
  return rows;
}

export async function getDepartmentStats(deptId) {
  const [rows] = await sequelize.query(
    `SELECT * FROM "GetDepartmentStats"(:deptId)`,
    { replacements: { deptId } }
  );
  return rows[0] || { total_employees: 0, avg_salary: 0 };
}

export async function updateEmployeeSalary(employeeId, newSalary) {
  const [rows] = await sequelize.query(
    `CALL "UpdateEmployeeSalary"(:newSalary, :employeeId)`,
    { replacements: { newSalary, employeeId } }
  );
  return rows?.[0]?.p_new_salary ?? newSalary;
}

export async function transferEmployee(employeeId, newDeptId) {
  await sequelize.query(
    `CALL "TransferEmployee"(:employeeId, :newDeptId)`,
    { replacements: { employeeId, newDeptId } }
  );
}

export async function getTransferLog(employeeId = null) {
  const [rows] = await sequelize.query(
    `SELECT * FROM "GetTransferLog"(:employeeId)`,
    { replacements: { employeeId } }
  );
  return rows;
}