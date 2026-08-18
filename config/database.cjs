require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'empdata_app',
    password: process.env.DB_PASSWORD || 'empdata_app',
    database: process.env.DB_NAME || 'empdata_manager',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'empdata_app',
    password: process.env.DB_PASSWORD || 'empdata_app',
    database: (process.env.DB_NAME || 'empdata_manager') + '_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER || 'empdata_app',
    password: process.env.DB_PASSWORD || 'empdata_app',
    database: process.env.DB_NAME || 'empdata_manager',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  },
};
