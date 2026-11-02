import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { TestEnginePage } from '../pages/test-engine-page';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  testEnginePage: TestEnginePage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  testEnginePage: async ({ page }, use) => {
    await use(new TestEnginePage(page));
  },
});

export { expect };
