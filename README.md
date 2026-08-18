# EmpData Manager

A desktop application for managing employee records with Excel import/export, built on **Electron + React + Sequelize + PostgreSQL**.

Implements the [PRD](PRD.md): employee CRUD, department management, stored procedures for business logic, Excel import/export, native file dialogs, and desktop notifications.

> Note: The PRD originally specified MySQL. This implementation uses **PostgreSQL** instead (the stored procedures are written in PL/pgSQL and the `pg` driver is used with Sequelize).

---

## Features

- **Dashboard** — total employees, departments, average salary, recent hires
- **Employees** — add / edit / delete / search / filter by department
- **Salary updates** — via the `UpdateEmployeeSalary` stored procedure (rejects decreases > 50%)
- **Bulk salary updates** — via the `BulkUpdateEmployeeSalaries` stored procedure (percentage change to a department or all employees, same 50% guard)
- **Transfers** — move employees between departments via the `TransferEmployee` stored procedure; moves are logged in `transfer_log` (also modeled as `TransferLog` in Sequelize)
- **Departments** — create, delete (only when empty), live employee counts, and stats (avg salary, totals) computed by the `GetDepartmentStats` stored procedure
- **Excel** — export via native save dialog, download import template, import with full validation and preview before saving
- **System** — native file dialogs, desktop notifications, reveal-in-folder after export

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Desktop    | Electron 43 (main / preload / renderer) |
| UI         | React 19 + Vite (contextBridge IPC) |
| ORM        | Sequelize 6 (models, migrations, seeders, associations) |
| Database   | PostgreSQL 18 |
| Business logic | PL/pgSQL stored procedures |
| Excel      | ExcelJS 4 |

---

## Prerequisites

- Node.js 20+ (tested on Node 24)
- PostgreSQL running on `localhost:5432` with superuser access (e.g. `postgres`)

---

## Setup

### 1. Database

Using your PostgreSQL superuser, create the app database and role:

```sql
CREATE DATABASE empdata_manager;
CREATE ROLE empdata_app WITH LOGIN PASSWORD 'empdata_app';
GRANT ALL PRIVILEGES ON DATABASE empdata_manager TO empdata_app;
```

> **PostgreSQL 15+ note:** the `public` schema is not writable by default. Grant schema access:
> ```sql
> \c empdata_manager
> GRANT ALL ON SCHEMA public TO empdata_app;
> ```

### 2. Configuration

Copy `.env.example` to `.env` and adjust if needed:

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=empdata_manager
DB_USER=empdata_app
DB_PASSWORD=empdata_app
```

### 3. Install & initialize

```bash
npm install
npm run db:setup      # runs migrations, seeders, and creates stored procedures
```

### 4. Run the app

```bash
npm run build:web     # build the React renderer into dist/
npm start             # launch Electron
```

For development with hot-reload:

```bash
npm run dev                # starts Vite on :5173
VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

---

## Stored Procedures

Defined in [`db/procedures/create_stored_procedures.sql`](db/procedures/create_stored_procedures.sql) and re-created idempotently by `npm run db:procs`.

| Procedure | Signature | Behavior |
|-----------|-----------|----------|
| `GetEmployeesByDepartment` | `(p_dept_id INT)` → table | Employee list (with department name) for a department |
| `GetDepartmentStats` | `(p_dept_id INT)` → `(totalEmployees, avgSalary)` | Aggregates per department |
| `UpdateEmployeeSalary` | `(INOUT p_new_salary DECIMAL, IN p_employee_id INT)` | Validates: salary cannot decrease by more than 50%; returns the applied salary |
| `TransferEmployee` | `(IN p_employee_id INT, IN p_new_dept_id INT)` | Moves employee and inserts a `transfer_log` row |
| `BulkUpdateEmployeeSalaries` | `(p_dept_id INT, p_percent NUMERIC)` → count | Applies a percentage change to a department (or all); enforces the 50% decrease guard |
| `GetTransferLog` | `(p_employee_id INT)` → table | Transfer history |

## Database Schema

```
departments:  id (PK), name (UNIQUE), location, created_at, updated_at
employees:    id (PK), name, email (UNIQUE), department_id (FK → departments.id),
              salary (DECIMAL(10,2)), join_date (DATE), created_at, updated_at
transfer_log: id (PK), employee_id (FK → employees.id), from_department_id, to_department_id, transferred_at
```

Relations: `Department.hasMany(Employee)` / `Employee.belongsTo(Department)` / `TransferLog.belongsTo(Employee)` (see `models/index.js`).

Stored procedure result columns are aliased **camelCase** to match Sequelize attribute names (e.g. `GetDepartmentStats` returns `totalEmployees`/`avgSalary`); both the `RETURNS TABLE` column names and select aliases must be double-quoted in the SQL.

## Excel Format

| Name | Email | Department | Salary | Join Date |
|------|-------|------------|--------|-----------|
| John Doe | john@company.com | Engineering | 50000 | 2024-01-15 |

Import validation (see `services/excelService.js`):
- Email must be a valid format
- Salary must be a positive number
- Department must exist in the database
- Join Date must be a parseable date

Sample files are in [`sample-data/`](sample-data/):
- `employees-import.xlsx` — clean file to import
- `employees-import-with-errors.xlsx` — includes rows that fail validation
- `employees-template.xlsx` — import template

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `open-excel-file` | renderer → main | Native open dialog |
| `save-excel-file` | renderer → main | Native save dialog |
| `export-to-excel` | renderer → main | Export data to chosen path |
| `download-template` | renderer → main | Template workbook buffer |
| `import-excel-file` / `save-imported-rows` | renderer → main | Parse & validate / commit import |
| `get-employees` / `save-employee` / `delete-employee` | renderer → main | Employee CRUD |
| `get-departments` / `save-department` / `delete-department` | renderer → main | Department CRUD |
| `get-department-stats` / `get-department-detail` | renderer → main | Stats (stored proc) |
| `update-salary` / `transfer-employee` | renderer → main | Stored procedures |
| `bulk-update-salary` | renderer → main | Bulk salary update (stored proc) |
| `show-notification` | renderer → main | Desktop notification |
| `operation-error` | main → renderer | Error broadcast |

The preload script (`electron/preload.cjs`) exposes these safely via `contextBridge` as `window.api`.

## Project Layout

```
config/            sequelize-cli config (database.cjs)
models/            sequelize.js (instance), department.js, employee.js, transfer_log.js, index.js (associations)
db/migrations/     schema migrations (departments, employees, transfer_log)
db/seeders/        sample data
db/procedures/     stored procedure SQL
services/          employeeService, departmentService, storedProcService, excelService
electron/          main.js (window + IPC), preload.cjs (contextBridge)
src/               React renderer (Dashboard, Employees, Departments, ImportExport)
scripts/           create-procedures.js, create-sample-excel.js, verify-services.js
sample-data/       sample Excel files for testing
```

## Useful Commands

```bash
npm run db:migrate     # run migrations
npm run db:seed        # seed sample data
npm run db:procs       # create stored procedures
npm run db:setup       # migrate + seed + procs
npm run build:web      # build React renderer
npm start              # launch the app
node scripts/verify-services.js   # end-to-end service check
node scripts/create-sample-excel.js
```

## Troubleshooting

- **`An object could not be cloned`** — IPC handlers must return plain JSON. Services convert Sequelize instances with `.toJSON()`. If you add a new handler, do the same.
- **Database connection failed on launch** — confirm the PostgreSQL service is running (`net start postgresql-x64-18`), `.env` is correct, and the database + role exist.
- **Preload errors** — the project uses `"type": "module"`, so the preload must be CommonJS (`preload.cjs`). Do not rename it to `.js`.
- **`permission denied for schema public`** — grant schema access to the app role (see Setup).