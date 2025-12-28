import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';

import { darkColors, lightColors } from './colors';

const baseFonts = {
  regular: 'System',
};

export const lightNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: lightColors.background,
    card: lightColors.surface,
    primary: lightColors.accent,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.accent,
  },
};

export const darkNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: darkColors.background,
    card: darkColors.surface,
    primary: darkColors.accent,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.accent,
  },
};

export const fonts = baseFonts;
