import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly heading: Locator;
  readonly availableTestsHeading: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole('heading', { name: /^Hello,/ });
    this.availableTestsHeading = page.getByRole('heading', { name: 'Recent Tests' });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async startTest(testName: string) {
    // Find the gate-card containing the test name and click its "Start Test" button
    const testCard = this.page.getByTestId('test-card').filter({ hasText: testName });
    await testCard.getByRole('link', { name: 'Start Test' }).click();
  }

  async viewResult(testName: string) {
    const testCard = this.page.getByTestId('test-card').filter({ hasText: testName });
    await testCard.getByRole('link', { name: 'View Result' }).click();
  }
}
