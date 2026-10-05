import { describe, it, expect } from 'vitest';
import { displayNameFromEmail, initialsFor } from '../accountName';

describe('displayNameFromEmail', () => {
  it('turns first.last into a name', () => {
    expect(displayNameFromEmail('bruce.baldomero@adaro.net')).toBe('Bruce Baldomero');
    expect(displayNameFromEmail('josh_smitherman2@adaro.net')).toBe('Josh Smitherman');
  });
  it('copes with a single word or nothing usable', () => {
    expect(displayNameFromEmail('it@adaro.net')).toBe('It');
    expect(displayNameFromEmail('')).toBe('Signed in');
  });
});

describe('initialsFor', () => {
  it('takes the first and last initials', () => {
    expect(initialsFor('Bruce Baldomero')).toBe('BB');
    expect(initialsFor('Mary Ann Smith')).toBe('MS');
    expect(initialsFor('Support')).toBe('SU');
  });
});
