import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sequelize } from '../models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'db', 'procedures', 'create_stored_procedures.sql');

async function main() {
  const sql = readFileSync(sqlPath, 'utf8');
  await sequelize.authenticate();
  await sequelize.query(sql);
  console.log('Stored procedures created successfully.');
  await sequelize.close();
}

main().catch((err) => {
  console.error('Failed to create stored procedures:', err.message);
  process.exit(1);
});
