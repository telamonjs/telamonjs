// Tailwind only generates classes it finds verbatim in the scanned source: a
// template string (`grid-cols-${n}`) produces nothing unless something else
// happens to spell the same class. These literal maps make every value exist.
//
// Below `sm` every form grid is one column and spans are dropped (a
// `col-span-2` inside a 1-column grid would create an implicit second column);
// from `sm` up the classes match the old `grid-cols-N` / `col-span-N` output.
const GRID_COLS: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-4',
  '5': 'grid-cols-1 sm:grid-cols-5',
  '6': 'grid-cols-1 sm:grid-cols-6',
  '7': 'grid-cols-1 sm:grid-cols-7',
  '8': 'grid-cols-1 sm:grid-cols-8',
  '9': 'grid-cols-1 sm:grid-cols-9',
  '10': 'grid-cols-1 sm:grid-cols-10',
  '11': 'grid-cols-1 sm:grid-cols-11',
  '12': 'grid-cols-1 sm:grid-cols-12',
}

const COL_SPAN: Record<string, string> = {
  '1': 'sm:col-span-1',
  '2': 'sm:col-span-2',
  '3': 'sm:col-span-3',
  '4': 'sm:col-span-4',
  '5': 'sm:col-span-5',
  '6': 'sm:col-span-6',
  '7': 'sm:col-span-7',
  '8': 'sm:col-span-8',
  '9': 'sm:col-span-9',
  '10': 'sm:col-span-10',
  '11': 'sm:col-span-11',
  '12': 'sm:col-span-12',
  full: 'col-span-full',
}

/** Responsive grid columns for a form grid of `cols` columns. */
export function gridColsClass(cols: string | number): string {
  // An out-of-range value keeps the old (dynamic) class rather than vanishing.
  return GRID_COLS[String(cols)] ?? `grid-cols-${cols}`
}

/** Responsive column span for a field's `span` (`'1'`–`'12'` or `'full'`). */
export function colSpanClass(span: string | number): string {
  return COL_SPAN[String(span)] ?? `col-span-${span}`
}
