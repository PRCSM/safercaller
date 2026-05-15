import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * App-level error boundary.
 *
 * Wrapped around the entire navigation tree in App.js so any rendering or
 * lifecycle error caught by React shows a recoverable fallback instead of
 * a blank screen / red box. Catches render-phase errors only — async errors
 * inside callbacks must still be try/caught at the caller and routed through
 * `handleError`.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production this is the only signal we get when a render throws.
    // Keep console.error so it surfaces in Sentry/Crashlytics output once
    // a crash reporter is wired up in Phase 12.
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AppText variant="display" style={styles.emoji}>⚠️</AppText>
          <AppText variant="heading" style={styles.title}>Something went wrong</AppText>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.sub}>
            The app encountered an unexpected error.{'\n'}
            Please try again — if it keeps happening, restart the app.
          </AppText>
          <Button
            variant="primary"
            label="Try Again"
            onPress={this.reset}
            style={styles.btn}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: THEME.colors.background,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { textAlign: 'center', marginBottom: 8 },
  sub: { textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 24, width: 200 },
});

export default ErrorBoundary;
