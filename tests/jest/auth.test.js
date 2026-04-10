const request = require('supertest');
const app = require('../../server');

describe('Auth API', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/signup')
      .send({ email: 'test@example.com', password: 'testpass' });
  });

  it('should return 200 for login route', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'testpass' });
    expect(res.statusCode).toBe(200);
  });
});
