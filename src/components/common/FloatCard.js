import { View } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * A small floating card with a rotation transform, used to decorate the
 * onboarding visual area (e.g. "🛡️ Scam Detected", "< 300ms").
 */
export function FloatCard({ children, rotation = '0deg', bg = THEME.colors.white, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
          transform: [{ rotate: rotation }],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default FloatCard;
