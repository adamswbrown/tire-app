import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

// Helper to compare XLSX files (values only)
function compareXlsx(file1: string, file2: string) {
  const wb1 = xlsx.readFile(file1);
  const wb2 = xlsx.readFile(file2);
  expect(wb1.SheetNames).toEqual(wb2.SheetNames);
  wb1.SheetNames.forEach((sheet, i) => {
    const s1 = xlsx.utils.sheet_to_json(wb1.Sheets[sheet]);
    const s2 = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[i]]);
    expect(s1).toEqual(s2);
  });
}

// Helper to compare CSV files (values only)
function compareCsv(file1: string, file2: string) {
  const c1 = csvParse(fs.readFileSync(file1), { columns: true });
  const c2 = csvParse(fs.readFileSync(file2), { columns: true });
  expect(c1).toEqual(c2);
}

test.describe('Parity Test Plan', () => {
  const fixtures = [
    'fixtures/small.xlsx',
    'fixtures/medium.xlsx',
    'fixtures/large.xlsx',
  ];
  const electronExports = 'fixtures/electron-exports';
  const webExports = 'fixtures/web-exports';

  for (const fixture of fixtures) {
    test(`Import/Parse Parity: ${path.basename(fixture)}`, async ({ page }) => {
      await page.goto('/import');
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('[data-testid="import-xlsx-btn"]'),
      ]);
      await fileChooser.setFiles(fixture);
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
      // Add assertions for app count, dedupe, filtering, etc.
    });
  }

  test('Questionnaire Save/Load Parity', async ({ page }) => {
    await page.goto('/applications');
    // Simulate answering questions, saving, reloading, and asserting values
    // ...
  });

  test('Export Parity: Completed Apps XLSX', async ({ page }) => {
    await page.goto('/export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-xlsx-btn"]'),
    ]);
    const webFile = path.join(webExports, 'completed-apps.xlsx');
    await download.saveAs(webFile);
    const electronFile = path.join(electronExports, 'completed-apps.xlsx');
    compareXlsx(webFile, electronFile);
  });

  test('Export Parity: App Questions CSV', async ({ page }) => {
    await page.goto('/export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-btn"]'),
    ]);
    const webFile = path.join(webExports, 'app-questions.csv');
    await download.saveAs(webFile);
    const electronFile = path.join(electronExports, 'app-questions.csv');
    compareCsv(webFile, electronFile);
  });

  test('Admin Thresholds Parity', async ({ page }) => {
    await page.goto('/admin');
    // Change thresholds, trigger scoring, and assert parity with Electron
    // ...
  });

  test('Reset/Clear Data Parity', async ({ page }) => {
    await page.goto('/settings');
    // Trigger reset/clear, assert web behavior matches Electron
    // ...
  });
});
