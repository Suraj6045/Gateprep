import { type Page, type Locator, expect } from '@playwright/test';

export class TestEnginePage {
  readonly submitButtonSidebar: Locator;
  readonly confirmSubmitModal: Locator;
  readonly confirmSubmitButton: Locator;

  constructor(private page: Page) {
    this.submitButtonSidebar = page.getByRole('button', { name: 'Submit Test' });
    this.confirmSubmitModal = page.getByText('Submit Test?', { exact: true }).locator('..').locator('..');
    // The button inside the modal is just 'Submit'
    this.confirmSubmitButton = this.confirmSubmitModal.getByRole('button', { name: 'Submit', exact: true });
  }

  async selectOption(letter: string) {
    // Selects MCQ or MSQ option
    // It's a div containing the letter like "A."
    await this.page.locator('.q-option').filter({ hasText: new RegExp(`^${letter}\\.`) }).click();
  }

  async fillNAT(answer: string) {
    await this.page.getByPlaceholder('Enter answer...').fill(answer);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async saveAndNext() {
    await this.page.getByRole('button', { name: /Save & Next/ }).click();
  }

  async submitTest() {
    await this.submitButtonSidebar.click();
    await expect(this.confirmSubmitModal).toBeVisible();
    await this.confirmSubmitButton.click();
    // Wait for redirect to results
    await this.page.waitForURL(/\/results\/.+/);
  }
}
