export const isDesktopScreen =
  typeof window === 'undefined' ||
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(min-width: 565px)').matches
export const isMobileScreen = !isDesktopScreen
