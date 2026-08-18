import { Employee, Department } from '../models/index.js';
import { getDepartmentStats } from './storedProcService.js';

export async function getAllDepartments() {
  const departments = await Department.findAll({
    include: [{ model: Employee, as: 'employees', attributes: [] }],
    attributes: {
      include: [
        [
          Employee.sequelize.fn('COUNT', Employee.sequelize.col('employees.id')),
          'employeeCount',
        ],
      ],
    },
    group: ['Department.id'],
    order: [['name', 'ASC']],
  });

  const stats = await Promise.all(
    departments.map(async (dept) => {
      const s = await getDepartmentStats(dept.id);
      return { ...dept.toJSON(), ...s };
    })
  );
  return stats;
}

export async function createDepartment(data) {
  const dept = await Department.create({
    name: data.name,
    location: data.location ?? null,
  });
  return dept.toJSON();
}

export async function updateDepartment(id, data) {
  const dept = await Department.findByPk(id);
  if (!dept) throw new Error('Department not found');
  await dept.update({
    name: data.name ?? dept.name,
    location: data.location !== undefined ? data.location : dept.location,
  });
  return dept.toJSON();
}

export async function deleteDepartment(id) {
  const count = await Employee.count({ where: { departmentId: id } });
  if (count > 0) throw new Error('Cannot delete department with assigned employees');
  const dept = await Department.findByPk(id);
  if (!dept) throw new Error('Department not found');
  await dept.destroy();
  return { id };
}

export async function getDepartmentDetail(deptId) {
  const dept = await Department.findByPk(deptId);
  if (!dept) throw new Error('Department not found');
  const stats = await getDepartmentStats(deptId);
  const employees = await Department.sequelize.query(
    `SELECT * FROM "GetEmployeesByDepartment"(:deptId)`,
    { replacements: { deptId } }
  );
  return { ...dept.toJSON(), ...stats, employees: employees[0] };
}