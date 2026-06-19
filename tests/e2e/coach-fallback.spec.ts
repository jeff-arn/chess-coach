import { test, expect } from '@playwright/test';

test('plan screen shows the offline banner when the coach falls back', async ({ page }) => {
  await page.route('**/api/coach', (route) =>
    route.fulfill({
      json: {
        plan: {
          modules: [{ moduleId: 'dont-hang-pieces', rationale: 'You hang pieces.' }],
          milestoneRationale: 'x',
        },
        usedFallback: true,
      },
    }),
  );
  await page.goto('/plan');
  await page.getByRole('button', { name: /build my plan/i }).click();
  await expect(page.getByText(/offline coaching/i)).toBeVisible();
  await expect(page.getByText(/dont-hang-pieces/)).toBeVisible();
});
