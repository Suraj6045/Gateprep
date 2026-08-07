import { test, expect } from '../fixtures';

test.describe('Core Test Execution Flow', () => {
  // These tests implicitly use the global storageState from auth.setup.ts,
  // meaning the user is already logged in when the test begins.

  test('Dashboard displays available tests', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.availableTestsHeading).toBeVisible();
    
    // There should be at least one gate-card visible if tests are seeded
    const testCards = page.getByTestId('test-card');
    const count = await testCards.count();
    test.skip(count === 0, 'No tests available to display');
    
    await expect(testCards.first()).toBeVisible();
  });

  test('Can start and submit a test', async ({ dashboardPage, testEnginePage, page }) => {
    await dashboardPage.goto();
    
    // Start the first available test
    const testCards = page.getByTestId('test-card').filter({ hasText: 'Start Test' });
    
    // If no tests are available to start, skip or fail the test. 
    // We expect the seeding/database to have at least one test.
    const count = await testCards.count();
    test.skip(count === 0, 'No tests available to start');
    
    // Click the first "Start Test" button
    await testCards.first().getByRole('link', { name: 'Start Test' }).click();

    // Now we are in the instructions page
    await expect(page).toHaveURL(/\/tests\/.+/);
    await expect(page.getByRole('heading', { name: 'General Instructions' })).toBeVisible();
    
    // Accept instructions and begin
    await page.getByLabel(/I have read and understood/).check();
    await page.getByRole('button', { name: 'Begin Test' }).click();
    
    // Now in the Test Engine
    // Let's answer one question (assuming it's MCQ for simplicity)
    // We try clicking 'A.' option if it exists
    const optionA = page.locator('.q-option').filter({ hasText: /^A\./ });
    if (await optionA.count() > 0) {
      await optionA.click();
    }
    
    // Save & Next
    await testEnginePage.saveAndNext();

    // Submit the test
    await testEnginePage.submitTest();
    
    // We should be redirected to results page
    await expect(page).toHaveURL(/\/results\/.+/);
    await expect(page.getByText('Test Summary')).toBeVisible();
  });
});
