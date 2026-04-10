// Example Jest test for backend API (auth route)
// Save as tests/auth.test.js

const request = require('supertest');
const app = require('../server'); // Adjust path as needed

describe('Auth API', () => {
  it('should return 200 for login route', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.statusCode).toBe(200);
  });
});
