// Spotting the same model spelt two ways - "Lattitude 5540" and "Latitude
// 5540", or "Latitude5540" - so the form can warn while someone types and an
// admin can merge the variants already on the register.

/** Lower case, letters and digits only: "Dell  Latitude-5540" -> "delllatitude5540". */
export function normaliseModelName(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The numbers in a name, in order: "EliteBook 840 G10" -> "840-10". */
function digitsOf(text) {
  return (String(text ?? '').match(/\d+/g) ?? []).join('-');
}

/** Edits to turn one string into the other, a swap of neighbours counting as one. */
export function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * True when two "brand model" names are probably the same model spelt
 * differently. The numbers must match exactly - a Latitude 5540 and a 5550
 * are different machines, not a typo - and the rest may differ by a letter
 * or two (two only in longer names, so short ones are not over-matched).
 */
export function looksLikeSameModel(a, b) {
  const left = normaliseModelName(a);
  const right = normaliseModelName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (digitsOf(a) !== digitsOf(b)) return false;
  const allowed = Math.max(left.length, right.length) >= 10 ? 2 : 1;
  return editDistance(left, right) <= allowed;
}

/**
 * Known models that look like the brand and model typed, but are not exactly
 * it (an exact match is the normal case and needs no warning).
 */
export function similarKnownModels(models = [], brand, model) {
  if (!String(model ?? '').trim()) return [];
  const typed = `${String(brand ?? '').trim()} ${String(model ?? '').trim()}`.trim();
  const typedKey = typed.toLowerCase();
  return models.filter((entry) => entry.key !== typedKey && looksLikeSameModel(entry.label, typed));
}

/**
 * Groups of known models that look like spellings of one another, per device
 * type, for the tidy-up tool. Each group lists its spellings, most assets
 * first - that one is the suggested spelling to keep. Pairs someone has said
 * are genuinely different (`notSame`, a set of "keyA|keyB") stay apart.
 */
export function similarModelGroups(modelsByType = {}, notSame = new Set()) {
  const groups = [];
  for (const [deviceType, models] of Object.entries(modelsByType)) {
    const parent = models.map((_, index) => index);
    const find = (index) => (parent[index] === index ? index : (parent[index] = find(parent[index])));
    for (let i = 0; i < models.length; i += 1) {
      for (let j = i + 1; j < models.length; j += 1) {
        if (notSame.has(pairKey(models[i].key, models[j].key))) continue;
        if (looksLikeSameModel(models[i].label, models[j].label)) parent[find(i)] = find(j);
      }
    }
    const clusters = new Map();
    models.forEach((entry, index) => {
      const root = find(index);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(entry);
    });
    for (const members of clusters.values()) {
      if (members.length < 2) continue;
      members.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en-GB'));
      groups.push({ deviceType, id: `${deviceType}|${members.map((m) => m.key).join('|')}`, members });
    }
  }
  return groups;
}

/** Order-independent key for a pair of model keys. */
export function pairKey(a, b) {
  return [a, b].sort().join('|');
}
