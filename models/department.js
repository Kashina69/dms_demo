import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Department = sequelize.define(
  'Department',
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
      unique: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'departments',
    timestamps: true,
  }
);

export default Department;