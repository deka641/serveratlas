import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const API_BASE = 'https://serveratlas-api.deka-labs.dev/api/v1';

interface Ids {
  server: number | null;
  provider: number | null;
  sshKey: number | null;
  sshConnection: number | null;
  application: number | null;
  backup: number | null;
}

let ids: Ids = {
  server: null,
  provider: null,
  sshKey: null,
  sshConnection: null,
  application: null,
  backup: null,
};

async function fetchFirstId(endpoint: string): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0].id : null;
  } catch {
    return null;
  }
}

test.beforeAll(async () => {
  ids.server = await fetchFirstId('/servers');
  ids.provider = await fetchFirstId('/providers');
  ids.sshKey = await fetchFirstId('/ssh-keys');
  ids.sshConnection = await fetchFirstId('/ssh-connections');
  ids.application = await fetchFirstId('/applications');
  ids.backup = await fetchFirstId('/backups');
});

function collectErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg);
    }
  });
  return errors;
}

function hasRuntimeError(errors: ConsoleMessage[]): boolean {
  return errors.some((e) => {
    const text = e.text();
    return text.includes('TypeError') || text.includes('ReferenceError') || text.includes('is not a function');
  });
}

async function smokeTest(page: Page, path: string, expectText?: string | RegExp) {
  const errors = collectErrors(page);
  await page.goto(path);
  // Wait for network idle to ensure data is loaded
  await page.waitForLoadState('networkidle');
  // Ensure no Next.js error overlay with actual error content
  const errorDialog = page.locator('nextjs-portal [role="dialog"]');
  await expect(errorDialog).toHaveCount(0);
  // Check for expected content if specified
  if (expectText) {
    await expect(page.getByText(expectText).first()).toBeVisible({ timeout: 10_000 });
  }
  // Check for runtime errors in console
  expect(hasRuntimeError(errors), `Runtime error on ${path}: ${errors.map(e => e.text()).join('; ')}`).toBe(false);
}

// Dashboard
test('Dashboard loads without errors', async ({ page }) => {
  await smokeTest(page, '/', /Dashboard|Server|Overview/i);
  // Verify no NaN in cost values
  const body = await page.textContent('body');
  expect(body).not.toContain('NaN');
});

// Servers
test('Servers list page', async ({ page }) => {
  await smokeTest(page, '/servers', /Servers/i);
});

test('Servers new page', async ({ page }) => {
  await smokeTest(page, '/servers/new', /Add|Create|New.*Server/i);
});

test('Server detail page', async ({ page }) => {
  test.skip(!ids.server, 'No server exists');
  await smokeTest(page, `/servers/${ids.server}`);
});

test('Server edit page', async ({ page }) => {
  test.skip(!ids.server, 'No server exists');
  await smokeTest(page, `/servers/${ids.server}/edit`, /Edit/i);
});

// Providers
test('Providers list page', async ({ page }) => {
  await smokeTest(page, '/providers', /Providers/i);
});

test('Providers new page', async ({ page }) => {
  await smokeTest(page, '/providers/new', /Add|Create|New.*Provider/i);
});

test('Provider detail page', async ({ page }) => {
  test.skip(!ids.provider, 'No provider exists');
  await smokeTest(page, `/providers/${ids.provider}`);
});

test('Provider edit page', async ({ page }) => {
  test.skip(!ids.provider, 'No provider exists');
  await smokeTest(page, `/providers/${ids.provider}/edit`, /Edit/i);
});

// SSH Keys
test('SSH Keys list page', async ({ page }) => {
  await smokeTest(page, '/ssh-keys', /SSH Keys/i);
});

test('SSH Keys new page', async ({ page }) => {
  await smokeTest(page, '/ssh-keys/new', /Add|Create|New.*SSH Key/i);
});

test('SSH Key detail page', async ({ page }) => {
  test.skip(!ids.sshKey, 'No SSH key exists');
  await smokeTest(page, `/ssh-keys/${ids.sshKey}`);
});

test('SSH Key edit page', async ({ page }) => {
  test.skip(!ids.sshKey, 'No SSH key exists');
  await smokeTest(page, `/ssh-keys/${ids.sshKey}/edit`, /Edit/i);
});

// SSH Connections
test('SSH Connections list page', async ({ page }) => {
  await smokeTest(page, '/ssh-connections', /SSH Connections/i);
});

test('SSH Connections new page', async ({ page }) => {
  await smokeTest(page, '/ssh-connections/new', /Add|Create|New.*SSH Connection/i);
});

test('SSH Connection detail page', async ({ page }) => {
  test.skip(!ids.sshConnection, 'No SSH connection exists');
  await smokeTest(page, `/ssh-connections/${ids.sshConnection}`);
});

test('SSH Connection edit page', async ({ page }) => {
  test.skip(!ids.sshConnection, 'No SSH connection exists');
  await smokeTest(page, `/ssh-connections/${ids.sshConnection}/edit`, /Edit/i);
});

// Applications
test('Applications list page', async ({ page }) => {
  await smokeTest(page, '/applications', /Applications/i);
});

test('Applications new page', async ({ page }) => {
  await smokeTest(page, '/applications/new', /Add|Create|New.*Application/i);
});

test('Application detail page', async ({ page }) => {
  test.skip(!ids.application, 'No application exists');
  await smokeTest(page, `/applications/${ids.application}`);
});

test('Application edit page', async ({ page }) => {
  test.skip(!ids.application, 'No application exists');
  await smokeTest(page, `/applications/${ids.application}/edit`, /Edit/i);
});

// Backups
test('Backups list page', async ({ page }) => {
  await smokeTest(page, '/backups', /Backups/i);
});

test('Backups new page', async ({ page }) => {
  await smokeTest(page, '/backups/new', /Add|Create|New.*Backup/i);
});

test('Backup detail page', async ({ page }) => {
  test.skip(!ids.backup, 'No backup exists');
  await smokeTest(page, `/backups/${ids.backup}`);
});

test('Backup edit page', async ({ page }) => {
  test.skip(!ids.backup, 'No backup exists');
  await smokeTest(page, `/backups/${ids.backup}/edit`, /Edit/i);
});

// Connectivity
test('Connectivity page', async ({ page }) => {
  await smokeTest(page, '/connectivity', /Connectivity/i);
});
