import { defineConfig, devices, type Project } from '@playwright/test';

const baseURL = 'http://localhost:4200/frosthaven-assistant';

const iphoneModels = [
  'iPhone 14 Pro',
  'iPhone 15 Pro',
  'iPhone 15 Pro Max',
] as const;

const iOS_Safari: Project[] = iphoneModels.map(name => ({
  name: `iOS Safari - ${name}`,
  use: { ...devices[name] },
}));

const iOS_Chrome: Project[] = iphoneModels.map(name => ({
  name: `iOS Chrome - ${name}`,
  use: {
    ...devices[name],
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.76 Mobile/15E148 Safari/604.1',
  },
}));

const lenovoTabM11Portrait: Project = {
  name: 'Android Chrome - Lenovo Tab M11 (portrait)',
  use: {
    ...devices['Galaxy Tab S7'],
    viewport: { width: 1200, height: 1920 }, // portrait
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  },
};

const lenovoTabM11Landscape: Project = {
  name: 'Android Chrome - Lenovo Tab M11 (landscape)',
  use: {
    ...lenovoTabM11Portrait.use,
    viewport: { width: 1920, height: 1200 },
  },
};


export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    lenovoTabM11Portrait,
    lenovoTabM11Landscape,
    ...iOS_Safari,
    ...iOS_Chrome,
  ],
});
