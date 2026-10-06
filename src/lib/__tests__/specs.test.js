import { describe, it, expect } from 'vitest';
import {
  SPEC_FIELDS,
  fillEmptySpecs,
  hasAnySpecValue,
  knownModels,
  matchKnownModel,
  modelOptionsFor,
  replaceSpecs,
  hasSpecs,
  specPayload,
  specSuggestions,
  specsFor
} from '../specs';

describe('specsFor', () => {
  it('gives laptops the full list, most identifying first', () => {
    expect(specsFor('Laptop')).toEqual([
      'spec_brand', 'spec_model', 'spec_processor', 'spec_ram', 'spec_storage',
      'spec_screen_size', 'spec_battery_type', 'spec_charger_type'
    ]);
  });

  it('leaves the laptop-only bits off a desktop', () => {
    const desktop = specsFor('Desktop');
    expect(desktop).toContain('spec_processor');
    expect(desktop).not.toContain('spec_screen_size');
    expect(desktop).not.toContain('spec_battery_type');
    expect(desktop).not.toContain('spec_charger_type');
  });

  it('gives a monitor its make and model, then its own four', () => {
    expect(specsFor('Monitor')).toEqual([
      'spec_brand', 'spec_model',
      'spec_screen_size', 'spec_resolution', 'spec_hdmi_ports', 'spec_dp_ports'
    ]);
  });

  it('gives phones, cameras and other devices the specs that suit them', () => {
    expect(specsFor('Phone')).toEqual(['spec_brand', 'spec_model', 'spec_storage']);
    expect(specsFor('Camera')).toEqual(['spec_brand', 'spec_model', 'spec_resolution']);
    expect(specsFor('Device')).toEqual(['spec_brand', 'spec_model']);
  });

  it('gives the older types without specs none at all', () => {
    for (const type of ['Tablet', 'Printer', 'Docking Station', 'Peripheral', 'Other']) {
      expect(specsFor(type)).toEqual([]);
      expect(hasSpecs(type)).toBe(false);
    }
  });
});

describe('specPayload', () => {
  it('trims text, nulls blanks and stores port counts as numbers', () => {
    const payload = specPayload('Monitor', {
      spec_screen_size: '  27"  ',
      spec_resolution: '',
      spec_hdmi_ports: '2',
      spec_dp_ports: '0'
    });
    expect(payload.spec_screen_size).toBe('27"');
    expect(payload.spec_resolution).toBeNull();
    expect(payload.spec_hdmi_ports).toBe(2);
    expect(payload.spec_dp_ports).toBe(0);
  });

  it('clears specs that do not apply, so a retyped asset keeps nothing stale', () => {
    const wasALaptop = {
      spec_brand: 'Dell',
      spec_screen_size: '15.6"',
      spec_battery_type: '4-cell',
      spec_charger_type: 'USB-C 65W'
    };

    const asDesktop = specPayload('Desktop', wasALaptop);
    expect(asDesktop.spec_brand).toBe('Dell');
    expect(asDesktop.spec_screen_size).toBeNull();
    expect(asDesktop.spec_battery_type).toBeNull();

    const asPrinter = specPayload('Printer', wasALaptop);
    expect(Object.values(asPrinter).every((value) => value === null)).toBe(true);

    const asPhone = specPayload('Phone', wasALaptop);
    expect(asPhone.spec_brand).toBe('Dell');
    expect(asPhone.spec_battery_type).toBeNull();
  });
});

describe('specSuggestions', () => {
  it('offers what the register already holds alongside the built-in list', () => {
    const options = specSuggestions([
      { spec_brand: 'Panasonic' },
      { spec_brand: '  Dell  ' },
      { spec_brand: null }
    ]);
    expect(options.spec_brand).toContain('Panasonic');
    expect(options.spec_brand).toContain('Dell');
    expect(options.spec_brand.filter((brand) => brand === 'Dell')).toHaveLength(1);
    expect(options.spec_brand).toEqual(SPEC_FIELDS.spec_brand.suggestions
      .concat('Panasonic')
      .sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' })));
  });

  it('has nothing to suggest for the port counts', () => {
    expect(specSuggestions([]).spec_hdmi_ports).toBeUndefined();
  });
});

describe('hasAnySpecValue', () => {
  it('is false until something that applies is filled in', () => {
    expect(hasAnySpecValue({ device_type: 'Laptop' })).toBe(false);
    expect(hasAnySpecValue({ device_type: 'Laptop', spec_ram: '16 GB' })).toBe(true);
    // A leftover value that does not apply to this type does not count.
    expect(hasAnySpecValue({ device_type: 'Phone', spec_ram: '16 GB' })).toBe(false);
  });
});

describe('fillEmptySpecs', () => {
  it('fills only the empty boxes that apply, and reports what it kept', () => {
    const values = { spec_brand: 'Dell', spec_model: '', spec_ram: '32 GB', spec_resolution: '' };
    const result = fillEmptySpecs('Laptop', values, {
      spec_brand: 'Dell',
      spec_model: 'Latitude 5540',
      spec_ram: '16 GB',
      spec_resolution: '1920 x 1080'
    });
    expect(result.values.spec_model).toBe('Latitude 5540');
    expect(result.values.spec_ram).toBe('32 GB');
    // Resolution is a monitor spec, so a laptop never takes it.
    expect(result.values.spec_resolution).toBe('');
    expect(result.filled).toEqual(['spec_model']);
    expect(result.kept).toEqual(['spec_ram']);
  });
});

describe('knownModels', () => {
  const assets = [
    { asset_ref: 'L1', device_type: 'Laptop', spec_brand: 'Dell', spec_model: 'Latitude 5540', spec_ram: '16 GB', updated_at: '2026-01-01' },
    { asset_ref: 'L2', device_type: 'Laptop', spec_brand: 'dell ', spec_model: 'latitude 5540', spec_ram: '16 GB', spec_storage: '256 GB SSD', updated_at: '2026-02-01' },
    { asset_ref: 'L3', device_type: 'Laptop', spec_brand: 'Dell', spec_model: 'Latitude 5540', spec_ram: '32 GB', spec_storage: '512 GB SSD', updated_at: '2026-03-01' },
    { asset_ref: 'L4', device_type: 'Laptop', spec_brand: 'HP', spec_model: null, spec_ram: '8 GB' },
    { asset_ref: 'M1', device_type: 'Monitor', spec_brand: 'Dell', spec_model: 'P2422H', spec_resolution: '1920 x 1080' }
  ];

  it('groups by make and model, ignoring case and spaces, taking the commonest value', () => {
    const [latitude] = knownModels(assets).Laptop;
    expect(latitude.count).toBe(3);
    expect(latitude.refs).toEqual(['L3', 'L2', 'L1']);
    expect(latitude.specs.spec_ram).toBe('16 GB');
    // A tie goes to the most recently updated asset.
    expect(latitude.specs.spec_storage).toBe('512 GB SSD');
  });

  it('leaves out kit with no model, and keeps each device type separate', () => {
    const models = knownModels(assets);
    expect(models.Laptop).toHaveLength(1);
    expect(models.Monitor[0].label).toBe('Dell P2422H');
  });

  it('matches what is typed against the known models', () => {
    const { Laptop } = knownModels(assets);
    expect(matchKnownModel(Laptop, ' DELL', 'Latitude 5540 ')?.count).toBe(3);
    expect(matchKnownModel(Laptop, 'Dell', '')).toBeNull();
  });
});

describe('replaceSpecs', () => {
  it('sets every box that applies, emptying what the model never recorded', () => {
    const next = replaceSpecs(
      'Laptop',
      { asset_ref: 'L9', spec_ram: '64 GB', spec_storage: '2 TB SSD' },
      { spec_ram: '16 GB' }
    );
    expect(next.spec_ram).toBe('16 GB');
    expect(next.spec_storage).toBe('');
    expect(next.asset_ref).toBe('L9');
  });
});

describe('modelOptionsFor', () => {
  const models = [
    { brand: 'Dell', model: 'Latitude 5540' },
    { brand: 'HP', model: 'EliteBook 840' }
  ];
  it("offers only the chosen brand's models", () => {
    expect(modelOptionsFor(models, 'dell', ['Latitude 5540', 'EliteBook 840'])).toEqual(['Latitude 5540']);
  });
  it('offers everything with no brand, or a brand with nothing recorded', () => {
    const all = ['Latitude 5540', 'EliteBook 840'];
    expect(modelOptionsFor(models, '', all)).toBe(all);
    expect(modelOptionsFor(models, 'Lenovo', all)).toBe(all);
  });
});
