import { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { TrustRing } from '../../components/common/TrustRing';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { authService, functionsService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { useDialerStore } from '../../store/dialerStore';
import { toast } from '../../utils/toast';

const initialsFor = (name) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export default function MoreScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const scamBlockEnabled  = useDialerStore((s) => s.scamBlockEnabled);
  const spamBlockEnabled  = useDialerStore((s) => s.spamBlockEnabled);
  const toggleScamBlock   = useDialerStore((s) => s.toggleScamBlock);
  const toggleSpamBlock   = useDialerStore((s) => s.toggleSpamBlock);

  // Refresh reputationScore on mount via the computeReputationScore Cloud
  // Function. Silent — the displayed score updates if the new value differs
  // from what's already on the persisted profile.
  //
  // Delayed 1s after mount so the Firebase Auth ID token is guaranteed to
  // be refreshed before the callable Function runs (calling it too early
  // on a cold-start mount yields UNAUTHENTICATED).
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const score = await functionsService.computeReputationScore(uid);
        if (cancelled || score == null) return;
        if (profile && profile.reputationScore !== score) {
          setProfile({ ...profile, reputationScore: score });
        }
      } catch (err) {
        // Silent — score row shows the cached value from authStore.profile.
        console.warn('Score refresh skipped:', err?.code ?? err?.message ?? err);
      }
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user?.uid]);

  const onSignOut = async () => {
    try {
      await authService.signOut();
      // signOut → resetAllStores → user becomes null → RootNavigator gate
      // flips to AuthStack → SplashScreen mounts as the initial route.
      // No manual navigate needed.
    } catch (err) {
      toast.error('Could not sign out', err?.message ?? '');
    }
  };

  const onDeactivate = () => {
    Alert.alert(
      'Deactivate account?',
      'Your profile will be hidden from People Search and Classifieds. You can reactivate by signing in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => toast.info('Deactivate flow coming soon'),
        },
      ]
    );
  };

  const comingSoon = (label) =>
    () => toast.info(`${label} coming soon`);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <AppText variant="heading">{STRINGS.more.title}</AppText>
          </View>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {profile?.profilePhoto ? (
                  <Image source={{ uri: profile.profilePhoto }} style={StyleSheet.absoluteFill} />
                ) : (
                  <AppText variant="heading" color={THEME.colors.white} style={styles.initials}>
                    {initialsFor(profile?.name)}
                  </AppText>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {profile?.name ?? 'Your name'}
                </AppText>
                <AppText variant="caption" color={THEME.colors.muted} numberOfLines={1}>
                  {profile?.profession ?? 'Profession'}
                </AppText>
              </View>

              <TrustRing score={profile?.reputationScore ?? 0} size={64} />
            </View>

            <View style={styles.verifyChips}>
              <Chip iconName="call-outline" label="Phone" />
              {profile?.verified?.idProof && <Chip iconName="card-outline" label="ID" />}
              {profile?.verified?.liveness && <Chip iconName="videocam-outline" label="Liveness" />}
            </View>

            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              hitSlop={6}
              style={styles.editProfileBtn}
            >
              <AppText variant="caption" color={THEME.colors.primary}>
                {STRINGS.more.editProfile}
              </AppText>
            </Pressable>
          </View>

          {/* Account section */}
          <Section iconName="person-outline" label={STRINGS.more.sections.account}>
            <Row
              iconName="star"
              iconColor={THEME.colors.trust.caution}
              label={STRINGS.more.items.premium}
              onPress={comingSoon('Premium upgrade')}
              right={<UpgradePill />}
            />
            <Row
              iconName="chatbubbles-outline"
              iconColor={THEME.colors.primary}
              label="Messages"
              onPress={() => navigation.getParent()?.navigate('ChatStack', { screen: 'Conversations' })}
            />
            <Row iconName="flag-outline" iconColor={THEME.colors.trust.danger} label={STRINGS.more.items.complaints} onPress={comingSoon('My Complaints')} />
            <Row iconName="storefront-outline" iconColor={THEME.colors.primary} label={STRINGS.more.items.listings} onPress={comingSoon('My Listings')} />
            <Row
              iconName="lock-closed-outline"
              label={STRINGS.more.items.security}
              onPress={() => navigation.navigate('Settings')}
            />
          </Section>

          {/* Support section */}
          <Section iconName="chatbubble-outline" label={STRINGS.more.sections.support}>
            <Row iconName="help-circle-outline" label={STRINGS.more.items.help} onPress={comingSoon('Help & Support')} />
            <Row iconName="document-text-outline" label={STRINGS.more.items.privacy} onPress={comingSoon('Privacy Policy')} />
            <Row iconName="document-outline" label={STRINGS.more.items.terms} onPress={comingSoon('Terms of Service')} />
          </Section>

          {/* App section */}
          <Section iconName="settings-outline" label={STRINGS.more.sections.app}>
            <Row iconName="notifications-outline" label={STRINGS.more.items.notifications} onPress={comingSoon('Notifications')} />
            <ToggleRow
              iconName="shield-checkmark-outline"
              iconColor={THEME.colors.primary}
              label={STRINGS.more.items.scamBlock}
              value={scamBlockEnabled}
              onChange={() => { haptics.light(); toggleScamBlock(); }}
            />
            <ToggleRow
              iconName="ban-outline"
              label={STRINGS.more.items.spamBlock}
              value={spamBlockEnabled}
              onChange={() => { haptics.light(); toggleSpamBlock(); }}
            />
          </Section>

          <Pressable onPress={onDeactivate} hitSlop={6} style={styles.deactivate}>
            <AppText variant="caption" color={THEME.colors.trust.danger}>
              {STRINGS.more.deactivate}
            </AppText>
          </Pressable>

          <Button
            variant="secondary"
            label={STRINGS.common.signOut}
            onPress={onSignOut}
            style={styles.signOutBtn}
            leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
          />
        </ScrollView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Subcomponents  ───────────────────────────── */

function Chip({ iconName, label }) {
  return (
    <View style={styles.chip}>
      {iconName && (
        <Ionicons name={iconName} size={11} color={THEME.colors.primary} style={{ marginRight: 4 }} />
      )}
      <AppText variant="caption" style={styles.chipText}>{label}</AppText>
    </View>
  );
}

function UpgradePill() {
  return (
    <View style={styles.upgradePill}>
      <AppText variant="caption" style={styles.upgradePillText}>
        {STRINGS.common.upgrade}
      </AppText>
    </View>
  );
}

function Section({ iconName, label, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        {iconName && <Ionicons name={iconName} size={12} color={THEME.colors.muted} />}
        <AppText variant="caption" color={THEME.colors.muted} style={styles.sectionLabel}>
          {label.toUpperCase()}
        </AppText>
      </View>
      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
}

function Row({ iconName, iconColor, label, onPress, right }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.row,
      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
    ]}>
      {iconName && (
        <Ionicons name={iconName} size={20} color={iconColor ?? THEME.colors.muted} style={styles.rowIcon} />
      )}
      <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
      {right ?? <Ionicons name="chevron-forward" size={18} color={THEME.colors.border} />}
    </Pressable>
  );
}

function ToggleRow({ iconName, iconColor, label, value, onChange }) {
  return (
    <View style={styles.row}>
      {iconName && (
        <Ionicons name={iconName} size={20} color={iconColor ?? THEME.colors.muted} style={styles.rowIcon} />
      )}
      <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
        thumbColor={THEME.colors.white}
      />
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: {
    paddingBottom: THEME.spacing.xxxl,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 4,
    paddingBottom: THEME.spacing.sm,
  },

  profileCard: {
    marginHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 24,
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontSize: 24,
    fontWeight: '600',
  },
  scorePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(0,102,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
  },
  scorePillText: {
    fontSize: 13,
  },
  verifyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.subtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  chipText: { fontSize: 10 },
  editProfileBtn: {
    alignSelf: 'flex-end',
  },

  section: {
    marginTop: THEME.spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionBody: {
    marginHorizontal: THEME.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },
  rowIcon: {
    width: 20,
    textAlign: 'center',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },

  upgradePill: {
    backgroundColor: THEME.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  upgradePillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  deactivate: {
    alignSelf: 'center',
    marginTop: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
  },
  signOutBtn: {
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
});
