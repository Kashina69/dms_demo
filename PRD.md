# PRD: Employee Data Management Desktop Application

## 1. Project Overview

### Product Name
**EmpData Manager** - A desktop application for managing employee records with Excel import/export capabilities

### Objective
Create a simple but functional desktop app that demonstrates:
- Sequelize ORM with MySQL (Models, Migrations, Relations)
- MySQL Stored Procedures for business logic
- Electron + React for desktop application
- Excel.js for data import/export

### Target User
HR personnel who need to manage employee data offline with Excel integration

---

## 2. Core Features

### Feature 1: Employee Management
**Description**: CRUD operations for employees

**User Stories**:
- As HR, I can add new employees with details (name, email, department, salary)
- As HR, I can view all employees in a table
- As HR, I can edit employee details
- As HR, I can delete employees

**Technical Requirements**:
- Sequelize model: `Employee`
- Fields: `id`, `name`, `email`, `department`, `salary`, `joinDate`
- Migration for creating employees table

### Feature 2: Department Management
**Description**: Manage departments and employee assignments

**User Stories**:
- As HR, I can create departments
- As HR, I can assign employees to departments
- As HR, I can see employee count per department

**Technical Requirements**:
- Sequelize model: `Department`
- Relation: One Department → Many Employees
- Migration for departments table

### Feature 3: Advanced Queries via Stored Procedures
**Description**: Complex database operations

**Stored Procedures Needed**:
1. `GetEmployeesByDepartment` - Input: department_id, Output: employee list
2. `GetDepartmentStats` - Input: department_id, Output: total_employees, avg_salary
3. `UpdateEmployeeSalary` - Input: employee_id, INOUT: salary (with validation)
4. `TransferEmployee` - Input: employee_id, new_department_id

**User Stories**:
- As HR, I can view department statistics
- As HR, I can transfer employees between departments
- As HR, I can perform bulk salary updates

### Feature 4: Excel Import/Export
**Description**: Bulk data operations with Excel

**User Stories**:
- As HR, I can export employee list to Excel
- As HR, I can import employees from Excel file
- As HR, I can download a template Excel

**Technical Requirements**:
- Use Excel.js for read/write
- Support columns: Name, Email, Department, Salary, Join Date
- Validate data before import

### Feature 5: System Operations (Electron Specific)
**Description**: Desktop-specific features

**User Stories**:
- As HR, I can save reports to local file system
- As HR, I can open Excel files using native file dialog
- As HR, I receive desktop notifications when import completes

**Technical Requirements**:
- Use Electron IPC for file operations
- Native file dialog for Excel selection
- System notifications for completed operations

---

## 3. Technical Architecture

### Database Schema

```sql
departments:
- id (INT, PK, AUTO_INCREMENT)
- name (VARCHAR(100))
- location (VARCHAR(100))
- created_at, updated_at

employees:
- id (INT, PK, AUTO_INCREMENT)
- name (VARCHAR(100))
- email (VARCHAR(100), UNIQUE)
- department_id (INT, FK → departments.id)
- salary (DECIMAL(10,2))
- join_date (DATE)
- created_at, updated_at
```

### Sequelize Associations
```javascript
Department.hasMany(Employee)
Employee.belongsTo(Department)
```

### Stored Procedures Details

**1. GetEmployeesByDepartment**
```sql
IN: dept_id INT
Returns: Employee list with department name
```

**2. GetDepartmentStats**
```sql
IN: dept_id INT
OUT: total_employees INT, avg_salary DECIMAL
```

**3. UpdateEmployeeSalary**
```sql
INOUT: salary DECIMAL
IN: employee_id INT
Validates: Salary can't be decreased by more than 50%
```

**4. TransferEmployee**
```sql
IN: employee_id INT, new_dept_id INT
Handles: Update department, log transfer
```

---

## 4. UI/UX Requirements

### Screens

**Screen 1: Dashboard**
- Total employees count
- Total departments
- Average salary
- Recent employees list

**Screen 2: Employees List**
- Table with all employees
- Search/filter by department
- Edit/Delete buttons
- Export to Excel button

**Screen 3: Department View**
- List of departments with employee counts
- Click department → show employees
- Department statistics (avg salary, total employees)

**Screen 4: Import/Export**
- Import Excel button (opens file dialog)
- Export Excel button
- Download template button
- Import preview before saving

---

## 5. Excel Format Specification

### Export Format
| Name | Email | Department | Salary | Join Date |
|------|-------|------------|--------|-----------|
| John Doe | john@email.com | Engineering | 50000 | 2024-01-15 |

### Import Format
- Same columns as export
- First row = headers
- Validation rules:
  - Email must be valid format
  - Salary must be positive number
  - Department must exist in database

---

## 6. Technical Implementation Details

### Setup Requirements
```bash
# 1. Database setup
- MySQL running on localhost:3306
- Database name: empdata_manager
- Create migrations for departments and employees tables

# 2. Backend (Node.js/Sequelize)
- Sequelize models and migrations
- Stored procedure creation scripts
- API endpoints for CRUD operations

# 3. Electron Setup
- Main process with window creation
- Preload script for IPC
- React for UI

# 4. Excel Integration
- Excel.js library
- File dialog integration via Electron
```

### IPC Channels
```javascript
// File operations
'open-excel-file' → Opens file dialog, returns file path
'save-excel-file' → Saves file to chosen location
'export-to-excel' → Exports current data

// Database operations
'get-employees' → Get all employees
'save-employee' → Create/update employee
'delete-employee' → Delete employee
'get-department-stats' → Get department statistics

// System
'show-notification' → Desktop notification
```

---

## 7. Development Phases

### Phase 1: Database Setup (Day 1)
- [ ] Install MySQL, create database
- [ ] Set up Sequelize
- [ ] Create Employee and Department models
- [ ] Write and run migrations
- [ ] Test basic CRUD operations

### Phase 2: Stored Procedures (Day 2)
- [ ] Create stored procedures in MySQL
- [ ] Test procedures with sample data
- [ ] Integrate with Sequelize queries
- [ ] Test edge cases

### Phase 3: Electron + React Setup (Day 3)
- [ ] Set up Electron with React
- [ ] Create main window
- [ ] Set up IPC communication
- [ ] Build basic UI screens
- [ ] Connect UI to database

### Phase 4: Excel Integration (Day 4)
- [ ] Install Excel.js
- [ ] Implement export functionality
- [ ] Implement import functionality
- [ ] Add file dialogs
- [ ] Test with sample Excel files

### Phase 5: Polish & Testing (Day 5)
- [ ] Add notifications
- [ ] Error handling
- [ ] UI improvements
- [ ] Test full workflow
- [ ] Fix bugs

---

## 8. Sample Data for Testing

```sql
-- Departments
INSERT INTO departments (name, location) VALUES
('Engineering', 'Floor 3'),
('Marketing', 'Floor 2'),
('Sales', 'Floor 1'),
('HR', 'Floor 2');

-- Employees
INSERT INTO employees (name, email, department_id, salary, join_date) VALUES
('John Doe', 'john@company.com', 1, 75000, '2023-01-15'),
('Jane Smith', 'jane@company.com', 2, 65000, '2023-03-20'),
('Bob Johnson', 'bob@company.com', 1, 80000, '2022-11-10'),
('Alice Brown', 'alice@company.com', 3, 55000, '2024-02-01');
```

---

## 9. Success Criteria

### Learning Goals Achieved
1. ✅ Sequelize models and migrations created and working
2. ✅ Associations between tables working
3. ✅ Stored procedures called from Node.js
4. ✅ Electron app launches and works with React
5. ✅ IPC communication working for file operations
6. ✅ Excel import/export functioning
7. ✅ Complete CRUD workflow operational

### Application Functionality
1. Can add/edit/delete employees
2. Can view department statistics
3. Can export data to Excel
4. Can import data from Excel
5. Desktop notifications work
6. File dialogs work for import/export

---

## 10. Testing Checklist

- [ ] Create new employee via UI
- [ ] Edit existing employee
- [ ] Delete employee
- [ ] View employees by department
- [ ] Check department statistics (stored procedure)
- [ ] Export employees to Excel
- [ ] Open exported Excel file
- [ ] Import employees from Excel
- [ ] Handle invalid Excel data
- [ ] Transfer employee between departments
- [ ] Test salary update with validation
- [ ] Check desktop notifications

---

## 11. Common Issues & Solutions

### Database Connection
- Check MySQL service is running
- Verify credentials in config
- Ensure database exists

### Electron Issues
- React dev server must be running
- IPC channel names must match
- File paths correct in main process

### Excel Issues
- Validate Excel file format
- Handle empty cells
- Date format conversion
- Department name matching

---

## Deliverables

1. **GitHub Repository** with complete code
2. **README.md** with setup instructions
3. **Database schema** and migrations
4. **Stored procedures** SQL scripts
5. **Working desktop application**
6. **Sample Excel files** for testing
7. **Demo video** showing features

---

This PRD provides a complete learning project that covers all your required topics in a practical, real-world application. Give this to your AI agent to implement step by step.