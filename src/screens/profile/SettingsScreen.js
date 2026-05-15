import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';
import { authService, userService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { useDialerStore } from '../../store/dialerStore';
import { toast } from '../../utils/toast';

const APP_VERSION = '1.0.0';
const PRIVACY_URL = 'https://safercaller.app/privacy';
const TERMS_URL   = 'https://safercaller.app/terms';
const STORE_URL   = 'https://play.google.com/store/apps/details?id=com.safercaller.app';
const NOTIF_PREFS_KEY = 'safercaller-notification-prefs';

const defaultNotifPrefs = {
  scamAlerts: true,
  chatMessages: true,
  listingExpiry: true,
};

export default function SettingsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const scamBlockEnabled  = useDialerStore((s) => s.scamBlockEnabled);
  const spamBlockEnabled  = useDialerStore((s) => s.spamBlockEnabled);
  const receptionistMode  = useDialerStore((s) => s.receptionistMode);
  const toggleScamBlock   = useDialerStore((s) => s.toggleScamBlock);
  const toggleSpamBlock   = useDialerStore((s) => s.toggleSpamBlock);
  const toggleReceptionist = useDialerStore((s) => s.toggleReceptionist);
  const blockedNumbers    = useDialerStore((s) => s.blockedNumbers);
  const removeBlockedNumber = useDialerStore((s) => s.removeBlockedNumber);

  const [goOnlineLocal, setGoOnlineLocal] = useState(profile?.goOnline ?? true);
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);
  const [blockedOpen, setBlockedOpen] = useState(false);

  // Load notification prefs.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) setNotifPrefs({ ...defaultNotifPrefs, ...JSON.parse(raw) });
      } catch (_) { /* ignore */ }
    })();
  }, []);

  const updateNotifPref = (key, value) => {
    haptics.light();
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const onToggleGoOnline = async (v) => {
    if (!user?.uid) return;
    haptics.light();
    setGoOnlineLocal(v); // optimistic
    try {
      await userService.updateOnlineStatus(user.uid, v);
      if (profile) setProfile({ ...profile, goOnline: v });
    } catch (err) {
      setGoOnlineLocal(!v);
      toast.error('Could not update', err?.message ?? '');
    }
  };

  const onUnblock = (number) => {
    Alert.alert('Unblock number?', number, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => { haptics.light(); removeBlockedNumber(number); },
      },
    ]);
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will sign you out and remove your profile. Contact support@safercaller.app to permanently delete account data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try { await authService.signOut(); } catch (_) { /* swallow */ }
          },
        },
      ],
    );
  };

  const openExternal = (url) =>
    Linking.openURL(url).catch(() => toast.error('Could not open link'));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <AppText variant="label">←</AppText>
          </Pressable>
          <AppText variant="label" style={styles.topTitle}>Settings</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Section label="CALL PROTECTION">
            <ToggleRow
              label="Scam Block"
              sub="Auto-block flagged numbers"
              value={scamBlockEnabled}
              onChange={() => { haptics.light(); toggleScamBlock(); }}
            />
            <ToggleRow
              label="Spam Block"
              sub="Block known spam callers"
              value={spamBlockEnabled}
              onChange={() => { haptics.light(); toggleSpamBlock(); }}
            />
            <ToggleRow
              label="AI Receptionist"
              sub="Auto-answer unknown calls"
              value={receptionistMode}
              onChange={() => { haptics.light(); toggleReceptionist(); }}
            />
          </Section>

          <Section label="PRIVACY">
            <ToggleRow
              label="Go Online"
              sub="Show profile in People Search"
              value={goOnlineLocal}
              onChange={onToggleGoOnline}
            />
            <Row
              label="Profile Visibility"
              onPress={() => toast.info('Profile visibility settings coming soon')}
            />
            <Row
              label="Blocked Users"
              right={
                <AppText variant="caption" color={THEME.colors.muted}>
                  {blockedNumbers.length}
                </AppText>
              }
              onPress={() => setBlockedOpen((o) => !o)}
            />
            {blockedOpen && (
              <View style={styles.blockedList}>
                {blockedNumbers.length === 0 ? (
                  <AppText variant="caption" color={THEME.colors.muted} style={{ padding: 16 }}>
                    No blocked numbers.
                  </AppText>
                ) : (
                  <FlatList
                    data={blockedNumbers}
                    keyExtractor={(item) => item}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.blockedRow}>
                        <AppText variant="label" style={{ flex: 1 }}>{item}</AppText>
                        <Pressable hitSlop={6} onPress={() => onUnblock(item)}>
                          <AppText variant="caption" color={THEME.colors.coral}>Unblock</AppText>
                        </Pressable>
                      </View>
                    )}
                  />
                )}
              </View>
            )}
          </Section>

          <Section label="NOTIFICATIONS">
            <ToggleRow
              label="Scam Alerts"
              sub="Reports filed against contacts"
              value={notifPrefs.scamAlerts}
              onChange={(v) => updateNotifPref('scamAlerts', v)}
            />
            <ToggleRow
              label="Chat Messages"
              sub="Push notification on new message"
              value={notifPrefs.chatMessages}
              onChange={(v) => updateNotifPref('chatMessages', v)}
            />
            <ToggleRow
              label="Listing Expiry"
              sub="Heads-up before listings expire"
              value={notifPrefs.listingExpiry}
              onChange={(v) => updateNotifPref('listingExpiry', v)}
            />
          </Section>

          <Section label="ACCOUNT">
            <Row
              label="Change Phone Number"
              onPress={() => toast.info('Phone change coming soon')}
            />
            <Row
              label="Download My Data"
              onPress={() => toast.info('Feature coming soon')}
            />
            <Row
              label="Delete Account"
              labelColor={THEME.colors.coral}
              onPress={onDeleteAccount}
            />
          </Section>

          <Section label="ABOUT">
            <Row
              label="App Version"
              right={<AppText variant="caption" color={THEME.colors.muted}>{APP_VERSION}</AppText>}
            />
            <Row label="Privacy Policy"   onPress={() => openExternal(PRIVACY_URL)} />
            <Row label="Terms of Service" onPress={() => openExternal(TERMS_URL)} />
            <Row label="Rate the App"     onPress={() => openExternal(STORE_URL)} />
          </Section>
        </ScrollView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ───── Subcomponents ───── */

function Section({ label, children }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.sectionLabel}>
        {label}
      </AppText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, sub, right, labelColor, onPress }) {
  const content = (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={labelColor ?? THEME.colors.text}>{label}</AppText>
        {!!sub && (
          <AppText variant="caption" color={THEME.colors.muted} style={styles.rowSub}>
            {sub}
          </AppText>
        )}
      </View>
      {right ?? (onPress && <AppText variant="label" color={THEME.colors.border}>›</AppText>)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { backgroundColor: 'rgba(0,0,0,0.02)' }}
    >
      {content}
    </Pressable>
  );
}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{label}</AppText>
        {!!sub && (
          <AppText variant="caption" color={THEME.colors.muted} style={styles.rowSub}>
            {sub}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
        thumbColor={THEME.colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 18, fontWeight: '500' },

  scroll: { paddingBottom: 40 },

  section: { marginTop: 24 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionBody: {
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.subtle,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
    gap: 12,
  },
  rowSub: { fontSize: 12, marginTop: 2 },

  blockedList: {
    backgroundColor: THEME.colors.surface,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },
});
