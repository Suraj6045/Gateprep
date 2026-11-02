import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'e2e/.auth/user.json';
const apiURL = (process.env.API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

setup('authenticate', async ({ page }) => {
  // Ensure the .auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'testpassword';
  const authEmail = process.env.AUTH_TEST_USER_EMAIL || 'auth-flow@example.com';
  const authPassword = process.env.AUTH_TEST_USER_PASSWORD || password;

  // Seed user if it doesn't exist (ignores 400 if already exists)
  await page.request.post(`${apiURL}/auth/register`, {
    data: {
      email,
      password,
      full_name: 'Test User'
    }
  });
  await page.request.post(`${apiURL}/auth/register`, {
    data: {
      email: authEmail,
      password: authPassword,
      full_name: 'Auth Flow User'
    }
  });

  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.login(email, password);

  // Wait for redirect to dashboard to confirm login success
  await page.waitForURL(/\/dashboard/);
  await page.screenshot({ path: 'debug.png' });
  
  // Wait for the Dashboard title to be visible to ensure state is fully loaded
  await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible();

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
