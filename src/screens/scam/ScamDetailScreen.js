import { View, StyleSheet, Pressable, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';

const RISK_BADGE = {
  open:      { label: 'HIGH RISK', bg: THEME.colors.coral,   fg: THEME.colors.white, iconName: 'alert-circle', iconColor: '#fff' },
  resolved:  { label: 'RESOLVED',  bg: THEME.colors.primary, fg: THEME.colors.white, iconName: 'checkmark-circle', iconColor: '#fff' },
  reviewing: { label: 'REVIEWING', bg: THEME.colors.warning, fg: THEME.colors.text,  iconName: 'time', iconColor: '#000' },
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate?.() ?? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  if (Number.isNaN(d.getTime?.())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ScamDetailScreen({ navigation, route }) {
  const report = route?.params?.report ?? null;

  if (!report) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <PageWrapper>
          <View style={styles.notFound}>
            <AppText variant="heading">Report not found</AppText>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <AppText variant="label" color={THEME.colors.primary}>Go back</AppText>
            </Pressable>
          </View>
        </PageWrapper>
      </SafeAreaView>
    );
  }

  const status = report.status ?? 'open';
  const badge = RISK_BADGE[status] ?? RISK_BADGE.open;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </Pressable>
          <AppText variant="label">Report Detail</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.riskBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.iconName} size={12} color={badge.iconColor} />
            <AppText variant="caption" color={badge.fg} style={styles.riskBadgeText}>
              {badge.label}
            </AppText>
          </View>

          <AppText variant="heading" style={styles.title}>
            {report.scammerName ?? 'Unknown Scammer'}
          </AppText>

          <DetailRow label="Phone" value={report.scammerPhone} pressableUrl={
            report.scammerPhone ? `tel:${report.scammerPhone}` : null
          } />
          <DetailRow label="Email" value={report.email} />
          <DetailRow label="Category" value={report.category} />
          <DetailRow label="Reported on" value={formatDate(report.createdAt)} />
          <DetailRow label="Reputation score" value={String(report.reputationScore ?? '—')} />

          <View style={styles.divider} />

          <AppText variant="label" style={styles.sectionLabel}>Description</AppText>
          <AppText variant="caption" color={THEME.colors.text} style={styles.description}>
            {report.description ?? 'No description provided.'}
          </AppText>

          {Array.isArray(report.proofUrls) && report.proofUrls.length > 0 && (
            <>
              <View style={styles.divider} />
              <AppText variant="label" style={styles.sectionLabel}>
                Evidence ({report.proofUrls.length})
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.proofRow}
              >
                {report.proofUrls.map((url, i) => (
                  <Image key={url + i} source={{ uri: url }} style={styles.proofImage} />
                ))}
              </ScrollView>
            </>
          )}

          {report.resolveNote && (
            <>
              <View style={styles.divider} />
              <AppText variant="label" style={styles.sectionLabel}>Scammer's response</AppText>
              <AppText variant="caption" color={THEME.colors.text} style={styles.description}>
                {report.resolveNote}
              </AppText>
            </>
          )}
        </ScrollView>
      </PageWrapper>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, pressableUrl }) {
  const display = value && String(value).trim() ? String(value) : '—';
  const onPress = pressableUrl
    ? () => Linking.openURL(pressableUrl).catch(() => {})
    : undefined;
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.rowLabel}>
        {label}
      </AppText>
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
        <AppText
          variant="label"
          color={onPress ? THEME.colors.primary : THEME.colors.text}
          numberOfLines={2}
        >
          {display}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 80,
    gap: 12,
  },

  riskBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },

  title: { marginBottom: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
    gap: 16,
  },
  rowLabel: { width: 120, fontSize: 12 },

  divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 12 },

  sectionLabel: { fontSize: 14, fontWeight: '600' },
  description: { lineHeight: 22, fontSize: 14 },

  proofRow: { gap: 10, paddingVertical: 4 },
  proofImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: THEME.colors.subtle,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
