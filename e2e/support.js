// Shared Supabase-stub helpers for the E2E specs. Everything the app sends to
// https://stub.supabase.co is intercepted here, so the browser never reaches a
// real backend and the tests are deterministic and offline.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': 'content-range'
};

/** A structurally-valid, decodable (unsigned) JWT — supabase-js only decodes
 *  the payload for expiry/claims; it never verifies the signature client-side. */
export function fakeJwt(overrides = {}) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'user-123',
    email: 'tech@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides
  };
  return `${b64(header)}.${b64(payload)}.stub-signature`;
}

export const USER = {
  id: 'user-123',
  email: 'tech@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z'
};

export function seedAssets() {
  return [
    {
      id: 'a1', asset_ref: 'LAP-001', device_type: 'Laptop', owner_name: 'Alice',
      department: 'IT', location: 'Office', date_cleaned: '2026-01-01', cleaned_by: 'AL',
      notes: null, cleaning_interval_months: 6, next_clean_due: '2026-07-01', version: 1,
      purchase_cost: 899, purchase_date: '2025-01-01', created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z', updated_by_email: 'tech@example.com',
      status: 'Overdue', days_until_due: -74
    },
    {
      id: 'a2', asset_ref: 'DSK-010', device_type: 'Desktop', owner_name: 'Bob',
      department: 'Finance', location: 'Office', date_cleaned: null, cleaned_by: null,
      notes: 'awaiting first clean', cleaning_interval_months: 6, next_clean_due: null,
      version: 1, purchase_cost: 650, purchase_date: '2025-06-01',
      created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
      updated_by_email: 'tech@example.com', status: 'Never Cleaned', days_until_due: null
    }
  ];
}

/** Wire up every Supabase endpoint the app touches. Returns a small handle so a
 *  test can inspect what was inserted. */
export async function mockSupabase(page, { assets = seedAssets() } = {}) {
  const state = { assets: [...assets], inserted: [] };

  await page.route('https://stub.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }

    const json = (status, data) =>
      route.fulfill({
        status,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });

    // --- Auth ---
    if (url.pathname === '/auth/v1/token') {
      return json(200, {
        access_token: fakeJwt(),
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-stub',
        user: USER
      });
    }
    if (url.pathname === '/auth/v1/user') {
      return json(200, USER);
    }
    if (url.pathname === '/auth/v1/logout') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }

    // --- Data (PostgREST) ---
    if (url.pathname === '/rest/v1/assets_with_status') {
      return json(200, state.assets);
    }
    if (url.pathname === '/rest/v1/assets') {
      if (method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const row = { id: `new-${state.inserted.length + 1}`, ...body };
        state.inserted.push(body);
        return json(201, [row]);
      }
      return json(200, []);
    }

    // Anything else the client probes for (settings, etc.)
    return json(200, {});
  });

  // Realtime websocket: accept and hold it open, no messages. The app tolerates
  // a silent channel and falls back to its polling refresh.
  await page.routeWebSocket('wss://stub.supabase.co/**', () => {});

  return state;
}

/** Move from the dashboard to the Assets register, where the toolbar and the
 *  "+ Add asset" button live. */
export async function gotoAssets(page) {
  const nav = page.getByRole('navigation', { name: /sections/i });
  await nav.getByRole('button', { name: /^assets/i }).click();
  await page.getByRole('button', { name: /add asset/i }).waitFor();
}

export async function signIn(page) {
  await page.getByLabel(/email address/i).fill('tech@example.com');
  await page.getByLabel(/^password$/i).fill('correct-horse');
  await page.getByRole('button', { name: /sign in/i }).click();
}
