import sequelize from './sequelize.js';
import Department from './department.js';
import Employee from './employee.js';

Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

export { sequelize, Department, Employee };
export default sequelize;