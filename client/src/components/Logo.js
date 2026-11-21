import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

export default function Logo({ size = 42, wordmark = false, light = false }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: light ? '#FFFFFF' : colors.coffee, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 40 40">
          <Path d="M9 10 H25 C31 10 31 19 25 19 H15 C9 19 9 28 15 28 H31" fill="none" stroke={light ? colors.coffee : '#FFF9F1'} strokeWidth="4.2" strokeLinecap="round" />
          <Circle cx="31" cy="10" r="2.3" fill={light ? colors.caramel : '#D8B18C'} />
        </Svg>
      </View>
      {wordmark && <Text style={{ marginLeft: 10, fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: light ? '#FFFFFF' : colors.coffeeDark }}>LinkPay</Text>}
    </View>
  );
}
