// Used by the release workflow. Prints the notes for one version as Markdown:
//   node scripts/release-notes.mjs 2.2.0      -> that release's notes
//   node scripts/release-notes.mjs --current  -> the current version number
//   node scripts/release-notes.mjs --list     -> every version, newest first
import { RELEASES } from '../src/lib/releaseNotes.js';
import { releaseBody } from '../src/lib/releaseMarkdown.js';

const arg = process.argv[2];
if (arg === '--current') {
  console.log(RELEASES[0].version);
} else if (arg === '--list') {
  console.log(RELEASES.map((release) => release.version).join('\n'));
} else if (arg === '--title') {
  const release = RELEASES.find((item) => item.version === process.argv[3]);
  if (!release) process.exit(1);
  console.log(`${release.version} - ${release.title}`);
} else {
  const release = RELEASES.find((item) => item.version === arg);
  if (!release) {
    console.error(`No release notes for version ${arg}.`);
    process.exit(1);
  }
  process.stdout.write(releaseBody(release));
}
