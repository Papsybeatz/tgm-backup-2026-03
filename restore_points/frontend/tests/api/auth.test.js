
// Example Jest test for backend API (auth route)
const request = require('supertest');
const app = require('../../server');

describe('Auth API', () => {
  beforeAll(async () => {
    // Sign up the user before testing login
    await request(app)
      .post('/api/signup')
      .send({ email: 'test@example.com', password: 'testpass' });
  });

  it('should return 200 for login route', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.statusCode).toBe(200);
  });
});
