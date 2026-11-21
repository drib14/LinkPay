import { Platform } from 'react-native';

export const colors = {
  background: '#F7F2EA',      // Cream background
  surface: '#FFFCF7',         // Warm white card surface
  surfaceMuted: '#EFE5D8',    // Latte tint
  coffee: '#5B3828',          // Coffee roast brown (primary)
  coffeeDark: '#2C1810',      // Dark espresso
  coffeeLight: '#8C583E',     // Mocha accent
  caramel: '#C99A6B',         // Golden caramel highlight
  caramelLight: '#F3E5D4',    // Soft caramel pill
  text: '#2F241F',            // Deep roasted text
  muted: '#8B7B70',           // Warm muted grey
  border: '#E8DCCE',          // Subtle divider border
  white: '#FFFFFF',
  green: '#2E8060',           // Emerald success
  red: '#B94A48',             // Ruby alert / danger
  paleGreen: '#E5F2EA',       // Success badge background
  paleRed: '#F8E9E6',         // Danger badge background
  gold: '#D4A359'             // ATM card chip gold
};

export const shadow = Platform.select({
  web: {
    boxShadow: '0 4px 14px rgba(44, 24, 16, 0.08)'
  },
  default: {
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  }
});

export const cardShadow = Platform.select({
  web: {
    boxShadow: '0 8px 24px rgba(44, 24, 16, 0.22)'
  },
  default: {
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7
  }
});
