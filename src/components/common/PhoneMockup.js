import { View } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * Decorative phone-frame mockup used inside OnboardingScreen.
 *
 * Renders a rounded rect 180×320 with a hairline border and a soft shadow.
 * The interior (`children`) is clipped by `overflow: 'hidden'` and uses
 * `bgColor` for the screen background.
 */
export function PhoneMockup({ children, bgColor = THEME.colors.white, style }) {
  return (
    <View style={[styles.frame, { backgroundColor: bgColor }, style]}>
      {children}
    </View>
  );
}

const styles = {
  frame: {
    width: 180,
    height: 320,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.10)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
};

export default PhoneMockup;
