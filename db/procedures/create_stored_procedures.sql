-- ============================================================
-- EmpData Manager - Stored Procedures (PostgreSQL / PL/pgSQL)
-- Adapted from the PRD's MySQL spec.
-- Run via: npm run db:procs
-- ============================================================

-- ------------------------------------------------------------
-- GetEmployeesByDepartment
-- IN:  p_dept_id INT
-- OUT: employee list with department name
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetEmployeesByDepartment"(p_dept_id INT)
RETURNS TABLE (
  id INT,
  name VARCHAR,
  email VARCHAR,
  department_id INT,
  department_name VARCHAR,
  salary DECIMAL,
  join_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.email, e.department_id, d.name AS department_name,
         e.salary, e.join_date, e."createdAt", e."updatedAt"
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  WHERE p_dept_id IS NULL OR e.department_id = p_dept_id
  ORDER BY e.name;
END;
$$;

-- ------------------------------------------------------------
-- GetDepartmentStats
-- IN:  p_dept_id INT
-- OUT: total_employees BIGINT, avg_salary NUMERIC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetDepartmentStats"(p_dept_id INT)
RETURNS TABLE (total_employees BIGINT, avg_salary NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(e.id)::BIGINT AS total_employees,
         COALESCE(AVG(e.salary), 0) AS avg_salary
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
-- OUT: transfer history
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "GetTransferLog"(p_employee_id INT)
RETURNS TABLE (
  id INT,
  employee_id INT,
  employee_name VARCHAR,
  from_department_id INT,
  from_department_name VARCHAR,
  to_department_id INT,
  to_department_name VARCHAR,
  transferred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.employee_id, e.name AS employee_name,
         t.from_department_id, fd.name AS from_department_name,
         t.to_department_id, td.name AS to_department_name,
         t.transferred_at
  FROM transfer_log t
  JOIN employees e ON e.id = t.employee_id
  LEFT JOIN departments fd ON fd.id = t.from_department_id
  LEFT JOIN departments td ON td.id = t.to_department_id
  WHERE p_employee_id IS NULL OR t.employee_id = p_employee_id
  ORDER BY t.transferred_at DESC;
END;
$$;