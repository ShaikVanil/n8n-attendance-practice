const jwt = require('jsonwebtoken');

// Pre-generated test tokens for performance testing
const TEST_TOKENS = {
  user: generateTestToken({ id: 1, email: 'test@example.com', role: 'employee' }),
  admin: generateTestToken({ id: 2, email: 'admin@example.com', role: 'admin' }),
  manager: generateTestToken({ id: 3, email: 'manager@example.com', role: 'manager' })
};

function generateTestToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '24h' }
  );
}

module.exports = {
  generateAuthToken: function(context, events, done) {
    context.vars.authToken = TEST_TOKENS.user;
    return done();
  },
  
  generateAdminToken: function(context, events, done) {
    context.vars.adminToken = TEST_TOKENS.admin;
    return done();
  },
  
  generateManagerToken: function(context, events, done) {
    context.vars.managerToken = TEST_TOKENS.manager;
    return done();
  }
};