/**
 * Hardware specifications, by device type.
 *
 * Only computers and monitors carry specs; everything else in the register is
 * inventory-only and shows no specification tab at all. Keys are the column
 * names in public.assets, so nothing has to be mapped on the way to the
 * database - see supabase/migration-003-device-specs.sql.
 *
 * "suggestions" seed the dropdowns. They are not a closed list: whatever is
 * already recorded against other assets is offered too, and "Add new" takes
 * anything, so unusual kit is never unrecordable.
 */

export const SPEC_FIELDS = {
  spec_brand: {
    label: 'Brand',
    placeholder: 'e.g. Dell',
    suggestions: ['Dell', 'HP', 'Lenovo', 'Apple', 'Microsoft', 'Acer', 'ASUS', 'MSI', 'Samsung', 'LG', 'AOC', 'BenQ', 'Philips']
  },
  spec_model: {
    label: 'Model',
    placeholder: 'e.g. Latitude 5540',
    suggestions: []
  },
  spec_processor: {
    label: 'Processor',
    placeholder: 'e.g. Intel Core i7-1355U',
    suggestions: [
      'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
      'Intel Core Ultra 5', 'Intel Core Ultra 7',
      'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
      'Apple M2', 'Apple M3', 'Apple M4'
    ]
  },
  spec_ram: {
    label: 'RAM',
    placeholder: 'e.g. 16 GB',
    suggestions: ['4 GB', '8 GB', '12 GB', '16 GB', '24 GB', '32 GB', '64 GB', '128 GB']
  },
  spec_storage: {
    label: 'Hard drive',
    placeholder: 'e.g. 512 GB SSD',
    suggestions: [
      '128 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB SSD',
      '500 GB HDD', '1 TB HDD', '2 TB HDD'
    ]
  },
  spec_screen_size: {
    label: 'Screen size',
    placeholder: 'e.g. 15.6"',
    suggestions: ['13"', '13.3"', '14"', '15.6"', '16"', '17.3"', '21.5"', '24"', '27"', '32"', '34"']
  },
  spec_battery_type: {
    label: 'Battery type',
    placeholder: 'e.g. 4-cell 54 Wh',
    suggestions: ['3-cell', '4-cell', '6-cell', '3-cell 41 Wh', '4-cell 54 Wh', '6-cell 83 Wh']
  },
  spec_charger_type: {
    label: 'Charger type',
    placeholder: 'e.g. USB-C 65W',
    suggestions: ['USB-C 45W', 'USB-C 65W', 'USB-C 100W', 'Barrel 65W', 'Barrel 90W', 'Barrel 130W', 'MagSafe 3']
  },
  spec_resolution: {
    label: 'Resolution',
    placeholder: 'e.g. 1920 x 1080',
    suggestions: ['1366 x 768', '1920 x 1080', '2560 x 1080', '2560 x 1440', '3440 x 1440', '3840 x 2160']
  },
  spec_hdmi_ports: { label: 'HDMI ports', kind: 'count', max: 6 },
  spec_dp_ports: { label: 'DisplayPort ports', kind: 'count', max: 6 }
};

export const SPEC_COLUMNS = Object.keys(SPEC_FIELDS);

/** Whole numbers rather than text, so they are stored and sorted as numbers. */
export const SPEC_COUNT_COLUMNS = SPEC_COLUMNS.filter((key) => SPEC_FIELDS[key].kind === 'count');

/**
 * Ordered most identifying first: what the machine is, then what is inside it,
 * then the physical bits that only a laptop has.
 */
const SPECS_BY_DEVICE_TYPE = {
  Laptop: [
    'spec_brand', 'spec_model', 'spec_processor', 'spec_ram', 'spec_storage',
    'spec_screen_size', 'spec_battery_type', 'spec_charger_type'
  ],
  Desktop: ['spec_brand', 'spec_model', 'spec_processor', 'spec_ram', 'spec_storage'],
  Monitor: ['spec_screen_size', 'spec_resolution', 'spec_hdmi_ports', 'spec_dp_ports']
};

/** The spec columns that apply to a device type, in the order they are shown. */
export function specsFor(deviceType) {
  return SPECS_BY_DEVICE_TYPE[deviceType] ?? [];
}

export function hasSpecs(deviceType) {
  return specsFor(deviceType).length > 0;
}

/** True once at least one spec has been filled in. */
export function hasAnySpecValue(asset) {
  return specsFor(asset.device_type).some((key) => {
    const value = asset[key];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * The spec columns to write for an asset, ready for the database.
 *
 * Only the ones that apply to the device type carry a value; the rest are
 * nulled, so retyping a laptop as a phone cannot leave a screen size behind.
 * Blanks are stored as null rather than "" so there is one representation of
 * "not recorded", and port counts are stored as numbers.
 */
export function specPayload(deviceType, values) {
  const applicable = new Set(specsFor(deviceType));

  return Object.fromEntries(
    SPEC_COLUMNS.map((key) => {
      if (!applicable.has(key)) return [key, null];
      const text = String(values[key] ?? '').trim();
      if (text === '') return [key, null];
      return [key, SPEC_COUNT_COLUMNS.includes(key) ? Number(text) : text];
    })
  );
}

/**
 * Everything already recorded against other assets, so the dropdowns grow as
 * the register does rather than being stuck with whatever was hard-coded here.
 */
export function specSuggestions(assets) {
  const found = {};
  for (const key of SPEC_COLUMNS) {
    if (SPEC_FIELDS[key].kind === 'count') continue;
    found[key] = new Set(SPEC_FIELDS[key].suggestions);
  }

  for (const asset of assets) {
    for (const key of Object.keys(found)) {
      const value = asset[key];
      if (typeof value === 'string' && value.trim()) found[key].add(value.trim());
    }
  }

  return Object.fromEntries(
    Object.entries(found).map(([key, values]) => [
      key,
      [...values].sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' }))
    ])
  );
}
