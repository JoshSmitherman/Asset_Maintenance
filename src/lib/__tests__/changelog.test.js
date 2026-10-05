import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RELEASES } from '../releaseNotes';
import { changelogMarkdown, releaseBody } from '../releaseMarkdown';

describe('CHANGELOG.md', () => {
  it('matches the release notes - run `npm run changelog` if this fails', () => {
    const onDisk = readFileSync(new URL('../../../CHANGELOG.md', import.meta.url), 'utf8');
    expect(onDisk).toBe(changelogMarkdown(RELEASES));
  });
});

describe('releaseBody', () => {
  it('lists every change with its type, bold kept as Markdown', () => {
    const body = releaseBody({
      version: '9.9.9',
      title: 'Example',
      sections: [{ area: 'Assets', groups: [{ heading: 'Form', items: [{ type: 'fixed', text: 'The **Save** button' }] }] }]
    });
    expect(body).toContain('### Assets');
    expect(body).toContain('- **Fixed:** The **Save** button');
  });
});
