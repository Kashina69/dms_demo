'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'departments',
      [
        { name: 'Engineering', location: 'Floor 3' },
        { name: 'Marketing', location: 'Floor 2' },
        { name: 'Sales', location: 'Floor 1' },
        { name: 'HR', location: 'Floor 2' },
      ],
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('departments', null, {});
  },
};