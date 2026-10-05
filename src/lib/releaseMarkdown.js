// Release notes as Markdown, for CHANGELOG.md and the GitHub Release made for
// each version. Both come from RELEASES in releaseNotes.js, so the page in the
// app, the changelog and GitHub always say the same thing. Kept free of other
// imports so scripts/ can run it with plain Node.

import { CHANGE_TYPES } from './releaseNotes.js';

export const REPO_URL = 'https://github.com/JoshSmitherman/Asset_Maintenance';

/** The body of one release: areas, then groups, then badged items. */
export function releaseBody(release) {
  const lines = [`_${release.title}_`, ''];
  for (const section of release.sections) {
    lines.push(`### ${section.area}`, '');
    for (const group of section.groups) {
      lines.push(`**${group.heading}**`, '');
      for (const item of group.items) {
        lines.push(`- **${CHANGE_TYPES[item.type]}:** ${item.text}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

/** The whole changelog, newest first, in the Keep a Changelog layout. */
export function changelogMarkdown(releases) {
  const parts = [
    '# Changelog',
    '',
    'Every change people using the tracker will notice, newest first. The same',
    'notes appear in the app (click the version next to the title) and on each',
    `[GitHub Release](${REPO_URL}/releases).`,
    '',
    '<!-- Generated from src/lib/releaseNotes.js by `npm run changelog`.',
    '     Edit that file, not this one; a test fails if they drift apart. -->',
    ''
  ];
  for (const release of releases) {
    parts.push(`## [${release.version}](${REPO_URL}/releases/tag/v${release.version}) - ${release.date}`, '');
    parts.push(releaseBody(release));
  }
  return parts.join('\n').trimEnd() + '\n';
}
