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
import { Ionicons } from '@expo/vector-icons';
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
            <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
          </Pressable>
          <AppText variant="label" style={styles.topTitle}>Settings</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Section label="CALL PROTECTION">
            <ToggleRow
              iconName="shield-checkmark-outline"
              iconColor={THEME.colors.primary}
              label="Scam Block"
              sub="Auto-block flagged numbers"
              value={scamBlockEnabled}
              onChange={() => { haptics.light(); toggleScamBlock(); }}
            />
            <ToggleRow
              iconName="ban-outline"
              label="Spam Block"
              sub="Block known spam callers"
              value={spamBlockEnabled}
              onChange={() => { haptics.light(); toggleSpamBlock(); }}
            />
            <ToggleRow
              iconName="hardware-chip-outline"
              label="AI Receptionist"
              sub="Auto-answer unknown calls"
              value={receptionistMode}
              onChange={() => { haptics.light(); toggleReceptionist(); }}
            />
          </Section>

          <Section label="PRIVACY">
            <ToggleRow
              iconName="eye-outline"
              label="Go Online"
              sub="Show profile in People Search"
              value={goOnlineLocal}
              onChange={onToggleGoOnline}
            />
            <Row
              iconName="lock-closed-outline"
              label="Profile Visibility"
              onPress={() => toast.info('Profile visibility settings coming soon')}
            />
            <Row
              iconName="ban-outline"
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
                          <AppText variant="caption" color={THEME.colors.trust.danger}>Unblock</AppText>
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
              iconName="notifications-outline"
              label="Scam Alerts"
              sub="Reports filed against contacts"
              value={notifPrefs.scamAlerts}
              onChange={(v) => updateNotifPref('scamAlerts', v)}
            />
            <ToggleRow
              iconName="chatbubble-outline"
              label="Chat Messages"
              sub="Push notification on new message"
              value={notifPrefs.chatMessages}
              onChange={(v) => updateNotifPref('chatMessages', v)}
            />
            <ToggleRow
              iconName="time-outline"
              label="Listing Expiry"
              sub="Heads-up before listings expire"
              value={notifPrefs.listingExpiry}
              onChange={(v) => updateNotifPref('listingExpiry', v)}
            />
          </Section>

          <Section label="ACCOUNT">
            <Row
              iconName="call-outline"
              label="Change Phone Number"
              onPress={() => toast.info('Phone change coming soon')}
            />
            <Row
              iconName="download-outline"
              label="Download My Data"
              onPress={() => toast.info('Feature coming soon')}
            />
            <Row
              iconName="warning-outline"
              iconColor={THEME.colors.trust.danger}
              label="Delete Account"
              labelColor={THEME.colors.trust.danger}
              onPress={onDeleteAccount}
            />
          </Section>

          <Section label="ABOUT">
            <Row
              iconName="phone-portrait-outline"
              label="App Version"
              right={<AppText variant="caption" color={THEME.colors.muted}>{APP_VERSION}</AppText>}
            />
            <Row iconName="document-text-outline" label="Privacy Policy"   onPress={() => openExternal(PRIVACY_URL)} />
            <Row iconName="document-outline" label="Terms of Service"      onPress={() => openExternal(TERMS_URL)} />
            <Row iconName="star-outline" label="Rate the App"              onPress={() => openExternal(STORE_URL)} />
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

function Row({ iconName, iconColor, label, sub, right, labelColor, onPress }) {
  const content = (
    <View style={styles.row}>
      {iconName && (
        <Ionicons name={iconName} size={20} color={iconColor ?? THEME.colors.muted} style={styles.rowIcon} />
      )}
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={labelColor ?? THEME.colors.text}>{label}</AppText>
        {!!sub && (
          <AppText variant="caption" color={THEME.colors.muted} style={styles.rowSub}>
            {sub}
          </AppText>
        )}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={THEME.colors.border} />)}
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

function ToggleRow({ iconName, iconColor, label, sub, value, onChange }) {
  return (
    <View style={styles.row}>
      {iconName && (
        <Ionicons name={iconName} size={20} color={iconColor ?? THEME.colors.muted} style={styles.rowIcon} />
      )}
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

  section: { marginTop: 28 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '500',
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
  rowIcon: {
    width: 20,
    textAlign: 'center',
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
