import sequelize from './sequelize.js';
import Department from './department.js';
import Employee from './employee.js';
import TransferLog from './transfer_log.js';

Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
TransferLog.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

export { sequelize, Department, Employee, TransferLog };
export default sequelize;