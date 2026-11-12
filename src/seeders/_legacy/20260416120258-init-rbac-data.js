'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Groups
    await queryInterface.bulkInsert('Group', [
      { id: 1, name: 'ADMIN', description: 'System Administrator', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'DOCTOR', description: 'Medical Professional', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'PATIENT', description: 'Medical Patient', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: 'CASHIER', description: 'Payment Manager', createdAt: new Date(), updatedAt: new Date() }
    ], {});

    // 2. Create Roles (URL patterns for private/secured endpoints)
    await queryInterface.bulkInsert('Role', [
      // Admin Only
      { id: 1, url: '/api/get_all_users', description: 'View all users' },
      { id: 2, url: '/api/create_new_users', description: 'Create new user' },
      { id: 3, url: '/api/delete_users', description: 'Delete user' },
      { id: 4, url: '/api/edit_users', description: 'Edit user' },
      { id: 5, url: '/api/create-new-handbook', description: 'Create handbook' },
      { id: 6, url: '/api/create-new-specialty', description: 'Create specialty' },
      { id: 7, url: '/api/create-new-clinic', description: 'Create clinic' },
      { id: 8, url: '/api/packages/create', description: 'Create package' },
      { id: 9, url: '/api/packages/update/:id', description: 'Update package' },
      { id: 10, url: '/api/packages/delete/:id', description: 'Delete package' },
      { id: 11, url: '/api/facilities/create', description: 'Create facility' },
      { id: 12, url: '/api/facilities/update/:id', description: 'Update facility' },
      { id: 13, url: '/api/facilities/delete/:id', description: 'Delete facility' },
      { id: 14, url: '/api/create-new-question', description: 'Create question' },
      { id: 15, url: '/api/edit-question', description: 'Edit question' },
      { id: 16, url: '/api/questions/:id', description: 'Manage questions' },
      { id: 17, url: '/api/category-questions', description: 'Manage question categories' },
      
      // Doctor Specific
      { id: 18, url: '/api/save_detail_doctor', description: 'Save doctor info' },
      { id: 19, url: '/api/bulk_create_schedule', description: 'Manage schedule' },
      { id: 20, url: '/api/get-list-patient-for-doctor', description: 'View assigned patients' },
      { id: 21, url: '/api/send-remedy', description: 'Send remedy' },
      { id: 22, url: '/api/update-medical-appointment-status', description: 'Update status' },

      // Patient Specific
      { id: 23, url: '/api/patient-book-appointment', description: 'Book appointment' },
      { id: 24, url: '/api/get-patient-appointments', description: 'Personal history' },
      { id: 25, url: '/api/submit-assessment', description: 'Health assessment' },
      { id: 26, url: '/api/assessment-detail-by-id/:id', description: 'Assessment detail' },
      { id: 27, url: '/api/assessment-history-by-userid/:userId', description: 'Assessment history' },

      // Cashier Specific
      { id: 28, url: '/api/check-paid', description: 'Check payment status' },
      { id: 29, url: '/api/send-payment', description: 'Manage payments' },

      // Common (Authenticated users)
      { id: 30, url: '/api/get-msg/:receiverId', description: 'Chat' },
      { id: 31, url: '/api/del-msg/:id', description: 'Delete message' },
      { id: 32, url: '/api/upload-file', description: 'Upload storage' },
      { id: 33, url: '/api/login-patient-chat', description: 'Chat login' },
      { id: 34, url: '/api/get-medicines', description: 'Get medicine list' }
    ].map(role => ({ ...role, createdAt: new Date(), updatedAt: new Date() })), {});

    // 3. Link Roles to Groups
    const groupRoleMappings = [];
    
    // ADMIN (IDs 1-34) - Full access
    for (let i = 1; i <= 34; i++) {
      groupRoleMappings.push({ groupId: 1, roleId: i });
    }

    // DOCTOR
    const doctorRoles = [18, 19, 20, 21, 22, 30, 31, 32, 33, 34];
    doctorRoles.forEach(id => groupRoleMappings.push({ groupId: 2, roleId: id }));

    // PATIENT
    const patientRoles = [23, 24, 25, 26, 27, 30, 31, 32, 33];
    patientRoles.forEach(id => groupRoleMappings.push({ groupId: 3, roleId: id }));

    // CASHIER
    const cashierRoles = [20, 28, 29, 30, 31, 32, 33];
    cashierRoles.forEach(id => groupRoleMappings.push({ groupId: 4, roleId: id }));

    await queryInterface.bulkInsert('Group_Role', groupRoleMappings.map(m => ({ 
      ...m, createdAt: new Date(), updatedAt: new Date() 
    })), {});

    // 4. Map existing Users to Groups (R1->1, R2->2, R3->3, R4->4)
    await queryInterface.sequelize.query("UPDATE Users SET groupId = 1 WHERE roleId = 'R1'");
    await queryInterface.sequelize.query("UPDATE Users SET groupId = 2 WHERE roleId = 'R2'");
    await queryInterface.sequelize.query("UPDATE Users SET groupId = 3 WHERE roleId = 'R3'");
    await queryInterface.sequelize.query("UPDATE Users SET groupId = 4 WHERE roleId = 'R4'");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Group_Role', null, {});
    await queryInterface.bulkDelete('Role', null, {});
    await queryInterface.bulkDelete('Group', null, {});
    await queryInterface.sequelize.query("UPDATE Users SET groupId = NULL");
  }
};
