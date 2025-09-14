import { test as base } from '@playwright/test';

// Extend the base test to always start at '/'
const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');   // resolved against baseURL in config
    await use(page);
  },
});

export { test };
export { expect } from '@playwright/test';
