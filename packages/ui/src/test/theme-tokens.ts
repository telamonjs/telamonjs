/**
 * Raw Tailwind neutral classes (`bg-slate-50/50`, `text-gray-600`,
 * `hover:border-zinc-200`…) found anywhere under `root`. They are light-only:
 * shell, tabs, breadcrumb and page chrome use the theme tokens (`bg-muted`,
 * `border-border`, `text-muted-foreground`…) so dark mode follows without app
 * overrides.
 */
const RAW_NEUTRAL = /(?:slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?$/

export function rawNeutralClasses(root: Element): string[] {
  const elements = [root, ...Array.from(root.querySelectorAll('[class]'))]
  return elements.flatMap(el =>
    (el.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter(c => RAW_NEUTRAL.test(c))
  )
}
