import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { colors } from '../theme';

export default function Logo({ size = 'medium', light = false }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconSize = isLarge ? 28 : isSmall ? 18 : 22;
  const badgeSize = isLarge ? 54 : isSmall ? 36 : 44;
  const titleSize = isLarge ? 28 : isSmall ? 18 : 22;
  const subtitleSize = isLarge ? 12 : isSmall ? 9 : 10;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize * 0.38,
            backgroundColor: light ? 'rgba(255, 255, 255, 0.16)' : colors.coffeeDark
          }
        ]}
      >
        <Coffee size={iconSize} color={light ? colors.white : colors.caramel} strokeWidth={2.4} />
      </View>
      <View style={styles.textGroup}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandLink, { fontSize: titleSize, color: light ? colors.white : colors.coffeeDark }]}>
            Link
          </Text>
          <Text style={[styles.brandPay, { fontSize: titleSize, color: light ? colors.caramel : colors.coffee }]}>
            Pay
          </Text>
        </View>
        <Text style={[styles.tagline, { fontSize: subtitleSize, color: light ? '#E8DCCE' : colors.muted }]}>
          COFFEE-POWERED BANKING
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  textGroup: {
    justifyContent: 'center'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  brandLink: {
    fontWeight: '900',
    letterSpacing: -0.5
  },
  brandPay: {
    fontWeight: '900',
    letterSpacing: -0.5
  },
  tagline: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 1
  }
});
