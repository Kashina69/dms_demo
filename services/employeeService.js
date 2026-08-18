import { Employee, Department } from '../models/index.js';
import { getEmployeesByDepartment, updateEmployeeSalary, transferEmployee } from './storedProcService.js';

export async function getAllEmployees() {
  const employees = await Employee.findAll({
    include: [{ model: Department, as: 'department' }],
    order: [['name', 'ASC']],
  });
  return employees.map((e) => e.toJSON());
}

export async function getEmployeesByDepartmentList(deptId) {
  return getEmployeesByDepartment(deptId);
}

export async function getEmployeeById(id) {
  const employee = await Employee.findByPk(id, {
    include: [{ model: Department, as: 'department' }],
  });
  return employee?.toJSON() ?? null;
}

export async function createEmployee(data) {
  const employee = await Employee.create({
    name: data.name,
    email: data.email,
    departmentId: data.departmentId ?? null,
    salary: data.salary ?? 0,
    joinDate: data.joinDate ?? null,
  });
  return employee.toJSON();
}

export async function updateEmployee(id, data) {
  const employee = await Employee.findByPk(id);
  if (!employee) throw new Error('Employee not found');
  await employee.update({
    name: data.name ?? employee.name,
    email: data.email ?? employee.email,
    departmentId: data.departmentId !== undefined ? data.departmentId : employee.departmentId,
    salary: data.salary !== undefined ? data.salary : employee.salary,
    joinDate: data.joinDate !== undefined ? data.joinDate : employee.joinDate,
  });
  return getEmployeeById(id);
}

export async function deleteEmployee(id) {
  const employee = await Employee.findByPk(id);
  if (!employee) throw new Error('Employee not found');
  await employee.destroy();
  return { id };
}

export { updateEmployeeSalary, transferEmployee };

export async function getDashboardStats() {
  const [employees, departments, recent, stats] = await Promise.all([
    Employee.count(),
    Department.count(),
    Employee.findAll({
      include: [{ model: Department, as: 'department' }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    Employee.findOne({
      attributes: [[Employee.sequelize.fn('AVG', Employee.sequelize.col('salary')), 'avgSalary']],
    }),
  ]);
  return {
    totalEmployees: employees,
    totalDepartments: departments,
    averageSalary: Number(stats?.get('avgSalary') || 0),
    recentEmployees: recent.map((e) => e.toJSON()),
  };
}