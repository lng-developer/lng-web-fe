export function isCompactBreakpoint(
  screens: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', boolean>>,
) {
  return Object.keys(screens).length > 0 && !screens.md
}
