const { test, expect } = require('@playwright/test');

test.describe('Auth API', () => {
  test.beforeAll(async ({ request }) => {
    // Sign up the user before testing login
    await request.post('/api/signup', {
      data: { email: 'test@example.com', password: 'testpass' }
    });
  });

  test('should return 200 for login route', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'testpass' }
    });
    expect(res.status()).toBe(200);
  });
});
