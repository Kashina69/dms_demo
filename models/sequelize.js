import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'empdata_manager',
  process.env.DB_USER || 'empdata_app',
  process.env.DB_PASSWORD || 'empdata_app',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: false,
    },
  }
);

export default sequelize;