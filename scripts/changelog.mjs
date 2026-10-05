// Writes CHANGELOG.md from src/lib/releaseNotes.js. Run: npm run changelog
import { writeFileSync } from 'node:fs';
import { RELEASES } from '../src/lib/releaseNotes.js';
import { changelogMarkdown } from '../src/lib/releaseMarkdown.js';

writeFileSync(new URL('../CHANGELOG.md', import.meta.url), changelogMarkdown(RELEASES));
console.log(`CHANGELOG.md written: ${RELEASES.length} releases, latest ${RELEASES[0].version}.`);
