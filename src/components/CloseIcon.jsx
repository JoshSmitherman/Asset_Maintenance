/**
 * A drawn cross rather than the "times" character, which sat small and
 * off-centre inside the button's box because its glyph carries its own
 * spacing. Two strokes centred in the box look the same everywhere.
 */
export default function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M5 5 19 19M19 5 5 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
