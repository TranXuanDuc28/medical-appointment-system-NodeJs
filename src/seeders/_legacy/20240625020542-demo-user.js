'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users', [
      {
        email: 'xuanductran71@gmail.com',
        firstName: 'Tran',
        lastName: 'Duc',
        passWord: '123456789',
        address: 'Da Nang',
        phoneNumber: '0367462316',
        gender: '1',
        image: '',
        roleId: '',
        positionId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
