-- ============================================================
-- EmpData Manager - Stored Procedures (PostgreSQL / PL/pgSQL)
-- Adapted from the PRD's MySQL spec.
-- Run via: npm run db:procs
-- NOTE: result columns are aliased camelCase to match the
-- Sequelize model attribute naming used across the app.
-- ============================================================

-- Drops first: CREATE OR REPLACE cannot change a function's
-- return type, so explicit DROPs keep this file re-runnable.
DROP FUNCTION IF EXISTS "GetEmployeesByDepartment"(INT);
DROP FUNCTION IF EXISTS "GetDepartmentStats"(INT);
DROP PROCEDURE IF EXISTS "UpdateEmployeeSalary"(DECIMAL, INT);
DROP PROCEDURE IF EXISTS "TransferEmployee"(INT, INT);
DROP FUNCTION IF EXISTS "GetTransferLog"(INT);
DROP FUNCTION IF EXISTS "BulkUpdateEmployeeSalaries"(INT, NUMERIC);

-- ------------------------------------------------------------
-- GetEmployeesByDepartment
-- IN:  p_dept_id INT (NULL = all)
-- OUT: employee list with department name
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetEmployeesByDepartment"(p_dept_id INT)
RETURNS TABLE (
  id INT,
  name VARCHAR,
  email VARCHAR,
  "departmentId" INT,
  "departmentName" VARCHAR,
  salary DECIMAL,
  "joinDate" DATE,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.email, e.department_id AS "departmentId",
         d.name AS "departmentName",
         e.salary, e.join_date AS "joinDate", e."createdAt", e."updatedAt"
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  WHERE p_dept_id IS NULL OR e.department_id = p_dept_id
  ORDER BY e.name;
END;
$$;

-- ------------------------------------------------------------
-- GetDepartmentStats
-- IN:  p_dept_id INT
-- OUT: totalEmployees BIGINT, avgSalary NUMERIC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetDepartmentStats"(p_dept_id INT)
RETURNS TABLE ("totalEmployees" BIGINT, "avgSalary" NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(e.id)::BIGINT AS "totalEmployees",
         COALESCE(AVG(e.salary), 0) AS "avgSalary"
  FROM employees e
  WHERE e.department_id = p_dept_id;
END;
$$;

-- ------------------------------------------------------------
-- UpdateEmployeeSalary
-- INOUT: p_new_salary DECIMAL (input = proposed, output = applied)
-- IN:    p_employee_id INT
-- Validates: salary cannot be decreased by more than 50%
-- Throws an exception (SQLSTATE 'P0001') if the rule is violated.
-- ------------------------------------------------------------
CREATE OR REPLACE PROCEDURE "UpdateEmployeeSalary"(INOUT p_new_salary DECIMAL, IN p_employee_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current DECIMAL;
BEGIN
  SELECT salary INTO v_current FROM employees WHERE id = p_employee_id FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;

  IF p_new_salary < v_current * 0.5 THEN
    RAISE EXCEPTION 'Salary decrease from % to % exceeds 50%% limit',
      v_current, p_new_salary;
  END IF;

  IF p_new_salary < 0 THEN
    RAISE EXCEPTION 'Salary cannot be negative';
  END IF;

  UPDATE employees SET salary = p_new_salary, "updatedAt" = NOW() WHERE id = p_employee_id;
END;
$$;

-- ------------------------------------------------------------
-- TransferEmployee
-- IN: p_employee_id INT, p_new_dept_id INT
-- Handles: update department + log transfer into transfer_log
-- ------------------------------------------------------------
CREATE OR REPLACE PROCEDURE "TransferEmployee"(IN p_employee_id INT, IN p_new_dept_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_dept INT;
BEGIN
  SELECT department_id INTO v_current_dept FROM employees WHERE id = p_employee_id FOR UPDATE;

  IF v_current_dept IS NULL THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM departments WHERE id = p_new_dept_id) THEN
    RAISE EXCEPTION 'Department % does not exist', p_new_dept_id;
  END IF;

  UPDATE employees
     SET department_id = p_new_dept_id, "updatedAt" = NOW()
   WHERE id = p_employee_id;

  IF v_current_dept IS DISTINCT FROM p_new_dept_id THEN
    INSERT INTO transfer_log (employee_id, from_department_id, to_department_id, transferred_at)
    VALUES (p_employee_id, v_current_dept, p_new_dept_id, NOW());
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- GetTransferLog
-- IN: p_employee_id INT (NULL = all)
-- OUT: transfer history (camelCase columns)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetTransferLog"(p_employee_id INT)
RETURNS TABLE (
  id INT,
  "employeeId" INT,
  "employeeName" VARCHAR,
  "fromDepartmentId" INT,
  "fromDepartmentName" VARCHAR,
  "toDepartmentId" INT,
  "toDepartmentName" VARCHAR,
  "transferredAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.employee_id AS "employeeId", e.name AS "employeeName",
         t.from_department_id AS "fromDepartmentId", fd.name AS "fromDepartmentName",
         t.to_department_id AS "toDepartmentId", td.name AS "toDepartmentName",
         t.transferred_at AS "transferredAt"
  FROM transfer_log t
  JOIN employees e ON e.id = t.employee_id
  LEFT JOIN departments fd ON fd.id = t.from_department_id
  LEFT JOIN departments td ON td.id = t.to_department_id
  WHERE p_employee_id IS NULL OR t.employee_id = p_employee_id
  ORDER BY t.transferred_at DESC;
END;
$$;

-- ------------------------------------------------------------
-- BulkUpdateEmployeeSalaries
-- IN:  p_dept_id INT (NULL = all departments)
-- IN:  p_percent NUMERIC (positive raise, or decrease >= -50)
-- OUT: number of employees updated
-- Validates: applies the same guard as UpdateEmployeeSalary —
--        no salary may decrease by more than 50%.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "BulkUpdateEmployeeSalaries"(p_dept_id INT, p_percent NUMERIC)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_percent IS NULL THEN
    RAISE EXCEPTION 'Percentage is required';
  END IF;

  IF p_percent < -50 THEN
    RAISE EXCEPTION 'Percentage change of %%% exceeds the 50%% decrease limit', p_percent;
  END IF;

  IF EXISTS (
    SELECT 1 FROM employees e
    WHERE (p_dept_id IS NULL OR e.department_id = p_dept_id)
      AND e.salary * (1 + p_percent / 100) < e.salary * 0.5
  ) THEN
    RAISE EXCEPTION 'Bulk update rejected: at least one employee would exceed the 50%% decrease limit';
  END IF;

  UPDATE employees
     SET salary = ROUND(salary * (1 + p_percent / 100), 2),
         "updatedAt" = NOW()
   WHERE (p_dept_id IS NULL OR department_id = p_dept_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;