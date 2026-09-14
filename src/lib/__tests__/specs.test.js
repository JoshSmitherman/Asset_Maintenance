import { describe, it, expect } from 'vitest';
import {
  SPEC_FIELDS,
  hasAnySpecValue,
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

  it('gives a monitor its own four', () => {
    expect(specsFor('Monitor')).toEqual([
      'spec_screen_size', 'spec_resolution', 'spec_hdmi_ports', 'spec_dp_ports'
    ]);
  });

  it('gives everything else none at all', () => {
    for (const type of ['Phone', 'Tablet', 'Printer', 'Docking Station', 'Peripheral', 'Other']) {
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

    const asPhone = specPayload('Phone', wasALaptop);
    expect(Object.values(asPhone).every((value) => value === null)).toBe(true);
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
