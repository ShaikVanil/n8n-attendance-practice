const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateTestToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '24h' }
  );
}

module.exports = {
  generateAuthToken: function(context, events, done) {
    const userId = Math.floor(Math.random() * 1000) + 1;
    context.vars.authToken = generateTestToken({
      id: userId,
      email: `stress-user-${userId}@example.com`,
      role: 'employee'
    });
    return done();
  },
  
  generateAdminToken: function(context, events, done) {
    context.vars.adminToken = generateTestToken({
      id: 999,
      email: 'stress-admin@example.com',
      role: 'admin'
    });
    return done();
  },
  
  generateLargePayload: function(context, events, done) {
    // Generate large payload for memory stress testing
    const largeData = [];
    for (let i = 0; i < 1000; i++) {
      largeData.push({
        id: i,
        data: crypto.randomBytes(1024).toString('hex'),
        timestamp: new Date().toISOString()
      });
    }
    context.vars.largePayload = largeData;
    return done();
  }
};