'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'employees',
      [
        { name: 'John Doe', email: 'john@company.com', department_id: 1, salary: 75000, join_date: '2023-01-15' },
        { name: 'Jane Smith', email: 'jane@company.com', department_id: 2, salary: 65000, join_date: '2023-03-20' },
        { name: 'Bob Johnson', email: 'bob@company.com', department_id: 1, salary: 80000, join_date: '2022-11-10' },
        { name: 'Alice Brown', email: 'alice@company.com', department_id: 3, salary: 55000, join_date: '2024-02-01' },
      ],
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('employees', null, {});
  },
};