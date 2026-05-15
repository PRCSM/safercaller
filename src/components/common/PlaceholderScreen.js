import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { PageWrapper } from './PageWrapper';

/**
 * Reusable Phase-1 placeholder. Real screens replace these one by one.
 * Pass `actions` to add navigation buttons at the bottom.
 *
 * Props:
 *   title    string
 *   subtitle string (optional)
 *   actions  Array<{ label, onPress, variant?: 'primary' | 'secondary' | 'ghost' }>
 */
export function PlaceholderScreen({ title, subtitle, actions = [] }) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.center}>
          <AppText variant="heading">{title}</AppText>
          {!!subtitle && (
            <AppText variant="label" color={THEME.colors.muted} style={styles.subtitle}>
              {subtitle}
            </AppText>
          )}
          <AppText variant="caption" color={THEME.colors.muted} style={styles.hint}>
            Phase 1 placeholder
          </AppText>
        </ScrollView>
        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((a) => (
              <Button
                key={a.label}
                variant={a.variant || 'primary'}
                label={a.label}
                onPress={a.onPress}
              />
            ))}
          </View>
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

export default PlaceholderScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.lg,
  },
  subtitle: {
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
  },
  hint: {
    marginTop: THEME.spacing.xs,
  },
  actions: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },
});
