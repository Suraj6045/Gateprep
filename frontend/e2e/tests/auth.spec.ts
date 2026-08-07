import { test, expect } from '../fixtures';

test.describe('Authentication Flow', () => {
  // Disable storage state so these tests start completely unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Successful login redirects to dashboard', async ({ loginPage, page }) => {
    await loginPage.goto();
    // Use test credentials
    const email = process.env.AUTH_TEST_USER_EMAIL || 'auth-flow@example.com';
    const password = process.env.AUTH_TEST_USER_PASSWORD || process.env.TEST_USER_PASSWORD || 'testpassword';
    
    await loginPage.login(email, password);
    
    // Expect redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Available Tests' })).toBeVisible();
  });

  test('Invalid credentials show error toast', async ({ loginPage, page }) => {
    await loginPage.goto();
    
    await loginPage.login('wrong@example.com', 'badpassword');
    
    // Check for the error message shown in the toast or similar
    await loginPage.expectError('Invalid email or password');
    
    // Ensure we are still on the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
