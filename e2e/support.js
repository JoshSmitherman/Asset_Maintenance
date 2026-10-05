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
/** History for LAP-001: added with Alice, moved to Carol, cleaned once. */
export function seedEvents() {
  return [
    {
      id: 'ev1', asset_id: 'a1', event_type: 'created',
      details: { owner: 'Alice', department: 'IT', location: 'Office' },
      happened_at: '2025-01-05T09:00:00Z', actor_email: 'tech@example.com'
    },
    {
      id: 'ev2', asset_id: 'a1', event_type: 'owner', old_value: 'Alice', new_value: 'Carol',
      happened_at: '2025-08-01T09:00:00Z', actor_email: 'tech@example.com'
    },
    {
      id: 'ev3', asset_id: 'a1', event_type: 'location', old_value: 'Office', new_value: 'Remote',
      happened_at: '2025-08-01T09:00:00Z', actor_email: 'tech@example.com'
    },
    {
      id: 'ev4', asset_id: 'a1', event_type: 'owner', old_value: 'Carol', new_value: 'Alice',
      happened_at: '2026-03-01T09:00:00Z', actor_email: 'tech@example.com'
    }
  ];
}

/** The team, as public.team_members() returns it. */
export const TEAM = [
  { id: 'user-456', email: 'colleague@example.com' },
  { id: 'user-123', email: 'tech@example.com' }
];

/** PostgREST filters arrive as "eq.a1" or "in.(a1,a2)". */
function idsFrom(value) {
  if (!value) return [];
  if (value.startsWith('eq.')) return [value.slice(3)];
  const inList = value.match(/^in\.\((.*)\)$/);
  return inList ? inList[1].split(',').map((id) => id.replace(/"/g, '')) : [];
}

export async function mockSupabase(page, { assets = seedAssets(), events = seedEvents(), role = 'user' } = {}) {
  const state = { assets: [...assets], inserted: [], repairs: [], attachments: [], uploads: [] };

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
      const ids = idsFrom(url.searchParams.get('id'));
      if (method === 'PATCH') {
        const body = JSON.parse(req.postData() || '{}');
        if ('retired_on' in body && body.retired_on === null && role !== 'admin') {
          return json(403, { code: '42501', message: 'Only an admin can restore retired kit.' });
        }
        const touched = [];
        state.assets = state.assets.map((asset) => {
          if (!ids.includes(asset.id)) return asset;
          const next = { ...asset, ...body };
          if (body.retired_on) {
            next.status = 'Retired';
            next.retired_by_email = USER.email;
            next.data_wiped_by_email = body.data_wiped
              ? TEAM.find((member) => member.id === body.data_wiped_by)?.email ?? null
              : null;
          }
          touched.push({ id: asset.id });
          return next;
        });
        return json(200, touched);
      }
      if (method === 'DELETE') {
        // Row Level Security: anyone but an admin deletes nothing.
        if (role !== 'admin') return json(200, []);
        const gone = state.assets.filter((asset) => ids.includes(asset.id));
        state.assets = state.assets.filter((asset) => !ids.includes(asset.id));
        return json(200, gone.map((asset) => ({ id: asset.id })));
      }
      return json(200, []);
    }

    // --- Repairs: the total is worked out by the "database" ---
    if (url.pathname === '/rest/v1/repairs') {
      const assetId = idsFrom(url.searchParams.get('asset_id'))[0];
      if (method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const total = (body.parts ?? []).reduce((sum, part) => sum + Math.round(part.cost * 100), 0) / 100;
        const fixer = TEAM.find((member) => member.id === body.fixed_by);
        const row = {
          id: `rep-${state.repairs.length + 1}`,
          ...body,
          total_cost: total,
          fixed_by_email: fixer?.email ?? USER.email,
          created_at: new Date().toISOString()
        };
        state.repairs.unshift(row);
        return json(201, { id: row.id });
      }
      if (method === 'DELETE') {
        if (role !== 'admin') return json(200, []);
        const ids = idsFrom(url.searchParams.get('id'));
        state.repairs = state.repairs.filter((repair) => !ids.includes(repair.id));
        return json(200, ids.map((id) => ({ id })));
      }
      return json(200, assetId ? state.repairs.filter((repair) => repair.asset_id === assetId) : state.repairs);
    }

    // --- Attachments: the record, and the private bucket behind it ---
    if (url.pathname === '/rest/v1/attachments') {
      if (method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        state.attachments.unshift({
          id: `file-${state.attachments.length + 1}`,
          ...body,
          uploaded_at: new Date().toISOString(),
          uploaded_by: USER.id,
          uploaded_by_email: USER.email
        });
        return json(201, []);
      }
      const assetId = idsFrom(url.searchParams.get('asset_id'))[0];
      const repairId = idsFrom(url.searchParams.get('repair_id'))[0];
      return json(200, state.attachments.filter((file) =>
        (assetId ? file.asset_id === assetId : true) && (repairId ? file.repair_id === repairId : true)));
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/asset-files/')) {
      return json(200, { signedURL: `/object/sign/asset-files/stub?token=stub` });
    }
    if (url.pathname.startsWith('/storage/v1/object/asset-files/') && method === 'POST') {
      state.uploads.push(decodeURIComponent(url.pathname.replace('/storage/v1/object/asset-files/', '')));
      return json(200, { Key: url.pathname });
    }
    if (url.pathname === '/storage/v1/object/asset-files' && method === 'DELETE') {
      return json(200, []);
    }

    // --- The team, for "who fixed it" ---
    if (url.pathname === '/rest/v1/rpc/team_members') {
      return json(200, TEAM);
    }

    if (url.pathname === '/rest/v1/asset_events') {
      const id = url.searchParams.get('asset_id')?.replace(/^eq\./, '');
      return json(200, events.filter((event) => event.asset_id === id));
    }
    if (url.pathname === '/rest/v1/cleaning_log') {
      const id = url.searchParams.get('asset_id')?.replace(/^eq\./, '');
      const cleans = [{ id: 'c1', asset_id: 'a1', cleaned_on: '2026-01-01', cleaned_by: 'AL' }];
      return json(200, id ? cleans.filter((clean) => clean.asset_id === id) : cleans);
    }
    if (url.pathname === '/rest/v1/user_roles') {
      return json(200, role ? [{ user_id: USER.id, role }] : []);
    }

    // --- Edge Functions ---
    if (url.pathname === '/functions/v1/admin-users') {
      if (role !== 'admin') return json(403, { error: 'Only admins can manage accounts.' });
      return json(200, {
        users: [
          { id: USER.id, email: USER.email, role: 'admin', created_at: '2026-01-01T00:00:00Z',
            last_sign_in_at: '2026-10-05T08:00:00Z', is_you: true },
          { id: 'user-456', email: 'colleague@example.com', role: 'user', created_at: '2026-03-01T00:00:00Z',
            last_sign_in_at: null, is_you: false }
        ]
      });
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
