import { displayNameFromEmail } from './accountName';

// Who may use Orbit and what they may do. Mirrors the members table in
// supabase/setup.sql (section 4b), which has the final say: hiding a button
// here is a courtesy, the database is the lock.

export const DEPARTMENTS = [
  'Customer Service',
  'Technical Support',
  'Developer',
  'Credit Control',
  'Finance',
  'Exec'
];

export const ACCESS_LEVELS = [
  { value: 'viewer', label: 'View only', description: 'Sees every asset, report and history. Cannot change anything.' },
  { value: 'editor', label: 'Can edit', description: 'Adds and edits assets, records cleans and repairs, retires kit.' },
  { value: 'admin', label: 'Admin', description: 'Everything, plus deleting, restoring retired kit and managing people.' }
];

/** Technical Support look after the kit; everyone else starts on view only. */
export function defaultAccessFor(department) {
  return department === 'Technical Support' ? 'editor' : 'viewer';
}

export function accessLabel(access) {
  return ACCESS_LEVELS.find((level) => level.value === access)?.label ?? 'No access';
}

export const canEditWith = (access) => access === 'editor' || access === 'admin';

/** The company's email domain(s). Mirrors allowed_email_domains. */
export const COMPANY_DOMAINS = ['adaro.net'];

export function isCompanyEmail(email) {
  const domain = String(email ?? '').trim().toLowerCase().split('@')[1];
  return Boolean(domain) && COMPANY_DOMAINS.includes(domain);
}

/** A person's name: the one recorded for them, else worked out from their email. */
export function displayName(person) {
  return person?.full_name?.trim() || (person?.email ? displayNameFromEmail(person.email) : '');
}
