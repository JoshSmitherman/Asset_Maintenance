// spec-lookup: fills in a device's specification from the web.
//
// The asset form sends a device name ("Dell Latitude 5540") and type; this
// asks Claude to search the web for the manufacturer's spec and hand back
// each field in the same format the register already uses. Nothing is saved
// here - the form fills the empty boxes and the person checks them first.
//
// Needs one secret, ANTHROPIC_API_KEY (Supabase Dashboard -> Edge Functions
// -> Secrets). Deploy like admin-users; see README.md. Only signed-in users
// can call it, so it cannot be used as an open proxy to the API.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, error: string) => reply(status, { error });

// Mirrors SPECS_BY_DEVICE_TYPE in src/lib/specs.js, with the formats the
// register's dropdowns use so a looked-up value matches what is there.
const FIELDS: Record<string, { label: string; format: string; count?: boolean }> = {
  spec_brand: { label: 'Brand', format: 'Manufacturer name, e.g. "Dell"' },
  spec_model: { label: 'Model', format: 'Model name without the brand, e.g. "Latitude 5540"' },
  spec_processor: { label: 'Processor', format: 'e.g. "Intel Core i7-1355U"' },
  spec_ram: { label: 'RAM', format: 'e.g. "16 GB"' },
  spec_storage: { label: 'Hard drive', format: 'e.g. "512 GB SSD"' },
  spec_screen_size: { label: 'Screen size', format: 'Inches with a double quote, e.g. "15.6\\""' },
  spec_battery_type: { label: 'Battery type', format: 'e.g. "4-cell 54 Wh"' },
  spec_charger_type: { label: 'Charger type', format: 'e.g. "USB-C 65W" or "Barrel 90W"' },
  spec_resolution: { label: 'Resolution', format: 'e.g. "1920 x 1080"' },
  spec_hdmi_ports: { label: 'HDMI ports', format: 'Whole number', count: true },
  spec_dp_ports: { label: 'DisplayPort ports', format: 'Whole number', count: true }
};

const BY_TYPE: Record<string, string[]> = {
  Laptop: ['spec_brand', 'spec_model', 'spec_processor', 'spec_ram', 'spec_storage',
    'spec_screen_size', 'spec_battery_type', 'spec_charger_type'],
  Desktop: ['spec_brand', 'spec_model', 'spec_processor', 'spec_ram', 'spec_storage'],
  Monitor: ['spec_brand', 'spec_model', 'spec_screen_size', 'spec_resolution', 'spec_hdmi_ports', 'spec_dp_ports']
};

function recordTool(keys: string[]): Anthropic.Beta.BetaTool {
  const properties: Record<string, unknown> = {
    found: { type: 'boolean', description: 'True if you identified the device with reasonable confidence.' },
    matched_device: { type: 'string', description: 'The exact device you found the spec for.' },
    source_url: { type: ['string', 'null'], description: 'The page the spec mostly came from.' },
    note: {
      type: ['string', 'null'],
      description: 'One short sentence if something is uncertain, e.g. the model ships in several configurations.'
    }
  };
  for (const key of keys) {
    const field = FIELDS[key];
    properties[key] = {
      type: field.count ? ['integer', 'null'] : ['string', 'null'],
      description: `${field.label}. ${field.format}. Null if unknown.`
    };
  }
  return {
    name: 'record_specs',
    description: 'Record the specification you found. Call this exactly once, after searching.',
    strict: true,
    input_schema: {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false
    }
  };
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (caught) {
    console.error(caught);
    if (caught instanceof Anthropic.RateLimitError) return fail(429, 'The lookup service is busy. Try again in a minute.');
    if (caught instanceof Anthropic.AuthenticationError) {
      return fail(500, 'The spec lookup is not set up: its ANTHROPIC_API_KEY secret is missing or wrong.');
    }
    return fail(500, 'The spec lookup failed. Fill the fields in by hand, or try again.');
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Use POST.');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const { data: who } = await supabase.auth.getUser();
  if (!who?.user) return fail(401, 'Sign in again.');

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    return fail(500, 'The spec lookup is not set up: add the ANTHROPIC_API_KEY secret to the function.');
  }

  let body: { query?: unknown; device_type?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Send a JSON body.');
  }
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const deviceType = typeof body.device_type === 'string' ? body.device_type : '';
  if (query.length < 3 || query.length > 120) return fail(400, 'Enter the device name, e.g. "Dell Latitude 5540".');
  const keys = BY_TYPE[deviceType];
  if (!keys) return fail(400, 'Spec lookup works for laptops, desktops and monitors.');

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content:
        `Find the hardware specification of this ${deviceType.toLowerCase()}: "${query}".\n\n` +
        'Search the web, preferring the manufacturer\'s own spec sheet. Where a model is sold in ' +
        'several configurations, give the most common business configuration and say so in the note. ' +
        'Leave a field null rather than guess. When you have the answer, call record_specs once.'
    }
  ];
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
    recordTool(keys)
  ] satisfies Anthropic.Beta.BetaToolUnion[];

  // A server-side search can pause a long turn; resume it a few times at most.
  for (let round = 0; round < 4; round += 1) {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // If the model declines, the API retries on a suitable fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools,
      messages
    });

    if (response.stop_reason === 'refusal') return fail(422, 'The lookup declined this request. Fill the fields in by hand.');

    const call = response.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use' && block.name === 'record_specs'
    );
    if (call) return reply(200, clean(call.input as Record<string, unknown>, keys));

    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }

  return fail(502, 'No specification came back. Try a more exact model name.');
}

/** Only the fields that apply, trimmed to what the database accepts. */
function clean(input: Record<string, unknown>, keys: string[]) {
  const specs: Record<string, string | number> = {};
  for (const key of keys) {
    const value = input[key];
    if (FIELDS[key].count) {
      if (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6) specs[key] = value as number;
    } else if (typeof value === 'string' && value.trim()) {
      specs[key] = value.trim().slice(0, 60);
    }
  }
  return {
    found: input.found === true,
    matched_device: typeof input.matched_device === 'string' ? input.matched_device.slice(0, 120) : null,
    source_url: typeof input.source_url === 'string' && /^https?:\/\//.test(input.source_url) ? input.source_url : null,
    note: typeof input.note === 'string' ? input.note.slice(0, 300) : null,
    specs
  };
}
