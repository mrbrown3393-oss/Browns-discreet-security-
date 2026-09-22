import { useMemo } from 'react';
import { Appearance, StyleSheet } from 'react-native';

// Dark-first utility palette from /app/design_guidelines.json.
export const colors = {
  surface: '#09090B', onSurface: '#FAFAFA',
  surfaceSecondary: '#18181B', onSurfaceSecondary: '#A1A1AA',
  surfaceTertiary: '#27272A', onSurfaceTertiary: '#D4D4D8',
  surfaceInverse: '#FAFAFA', onSurfaceInverse: '#09090B',
  brand: '#EA580C', onBrand: '#FAFAFA',
  brandPrimary: '#EA580C', onBrandPrimary: '#FAFAFA',
  brandSecondary: '#C2410C', onBrandSecondary: '#FAFAFA',
  brandTertiary: '#9A3412', onBrandTertiary: '#FAFAFA',
  success: '#10B981', onSuccess: '#FAFAFA',
  warning: '#F59E0B', onWarning: '#09090B',
  error: '#EF4444', onError: '#FAFAFA',
  info: '#60A5FA', onInfo: '#09090B',
  border: '#27272A', borderStrong: '#3F3F46', divider: '#27272A', muted: '#A1A1AA',
  overlay: 'rgba(0,0,0,0.78)', brandWash: '#28150E',
};
export type ThemeColors = typeof colors;
export type ColorScheme = 'dark' | 'light';
export const defaultScheme = 'dark';
export const themes = { light: colors, dark: colors };
export const fonts = { display: 'Rajdhani_600SemiBold', body: 'DMSans_400Regular', medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };
export function setColorScheme() { Appearance.setColorScheme?.('dark'); }
setColorScheme();
export function useTheme() { return { scheme: 'dark' as const, colors }; }
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: ThemeColors) => T): () => T {
  return () => useMemo(() => StyleSheet.create(factory(colors)), []);
}