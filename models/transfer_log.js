import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const TransferLog = sequelize.define(
  'TransferLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'employee_id',
    },
    fromDepartmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'from_department_id',
    },
    toDepartmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'to_department_id',
    },
    transferredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'transferred_at',
    },
  },
  {
    tableName: 'transfer_log',
    timestamps: false,
  }
);

export default TransferLog;