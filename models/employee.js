import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Employee = sequelize.define(
  'Employee',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'department_id',
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    joinDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'join_date',
    },
  },
  {
    tableName: 'employees',
    timestamps: true,
    indexes: [{ fields: ['department_id'] }],
  }
);

export default Employee;