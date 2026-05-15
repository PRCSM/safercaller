import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { SkeletonBox } from '../../components/common/Skeleton';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';
import { userService, classifiedsService, scamService, chatService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

const initialsFor = (name) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const ringColorFor = (score) => {
  if (score >= 700) return THEME.colors.primary;
  if (score >= 400) return THEME.colors.warning;
  return THEME.colors.coral;
};

export default function ProfileViewScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const prefilled = route?.params?.person ?? null;
  const myUid = useAuthStore((s) => s.user?.uid);

  const [profile, setProfile] = useState(prefilled);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(!prefilled);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [data, theirListings] = await Promise.all([
          userService.getUserProfile(userId),
          classifiedsService.getMyListings(userId).catch(() => []),
        ]);
        if (cancelled) return;
        if (data) setProfile(data);
        setListings(
          Array.isArray(theirListings)
            ? theirListings.filter((l) => l.status === 'active')
            : []
        );
      } catch (err) {
        if (!cancelled) toast.error('Could not load profile', err?.message ?? '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const onChat = () => {
    if (!myUid || !userId) return;
    if (userId === myUid) {
      toast.info("That's you");
      return;
    }
    haptics.light();
    navigation.getParent()?.navigate('ChatStack', {
      screen: 'Chat',
      params: {
        chatId: chatService.getChatId(myUid, userId),
        otherUserId: userId,
        otherUserName: profile?.name ?? 'User',
      },
    });
  };

  const onCall = async () => {
    if (!profile?.phone) {
      toast.warning('Phone not shared by this user');
      return;
    }
    haptics.light();
    try {
      const lookup = await scamService.lookupNumber(profile.phone);
      if (lookup?.isFlagged) {
        Alert.alert(
          '⚠️ Flagged number',
          `This number has ${lookup.count} report${lookup.count === 1 ? '' : 's'}. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${profile.phone}`) },
          ],
        );
        return;
      }
      Linking.openURL(`tel:${profile.phone}`).catch(() => toast.error('Could not place call'));
    } catch (_) {
      Linking.openURL(`tel:${profile.phone}`).catch(() => {});
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <PageWrapper>
          <SkeletonBox width="100%" height={200} radius={0} />
          <View style={styles.content}>
            <SkeletonBox width="60%" height={24} />
            <View style={{ height: 8 }} />
            <SkeletonBox width="40%" height={14} />
          </View>
        </PageWrapper>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <PageWrapper>
          <View style={styles.notFoundWrap}>
            <AppText variant="heading">Profile not found</AppText>
            <Button variant="primary" label="Back" onPress={() => navigation.goBack()} />
          </View>
        </PageWrapper>
      </SafeAreaView>
    );
  }

  const ringColor = ringColorFor(profile.reputationScore ?? 900);
  const isOffline = profile.goOnline === false;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#9DC4F5' }]} />
            )}
          </View>

          <Pressable onPress={() => navigation.goBack()} style={styles.backFloating} hitSlop={8}>
            <AppText variant="label" color={THEME.colors.white}>←</AppText>
          </Pressable>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {profile.profilePhoto ? (
                <Image source={{ uri: profile.profilePhoto }} style={StyleSheet.absoluteFill} />
              ) : (
                <AppText variant="heading" color={THEME.colors.white} style={styles.avatarInitials}>
                  {initialsFor(profile.name)}
                </AppText>
              )}
            </View>
          </View>

          {isOffline && (
            <View style={styles.offlineBanner}>
              <AppText variant="caption" color={THEME.colors.text}>
                This user is not discoverable.
              </AppText>
            </View>
          )}

          <View style={styles.content}>
            <AppText variant="heading" style={styles.name}>{profile.name ?? '—'}</AppText>
            {!!profile.profession && (
              <AppText variant="caption" color={THEME.colors.muted} style={styles.profession}>
                {profile.profession}
                {profile.subProfession ? ` · ${profile.subProfession}` : ''}
              </AppText>
            )}
            {!!profile.location && (
              <AppText variant="caption" color={THEME.colors.muted}>📍 {profile.location}</AppText>
            )}

            <View style={styles.chipRow}>
              <Chip label="✓ Phone" />
              {profile.verified?.idProof  && <Chip label="✓ ID" />}
              {profile.verified?.liveness && <Chip label="✓ Liveness" />}
            </View>

            <View style={styles.scoreCard}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={THEME.colors.muted}>Trust Score</AppText>
                <AppText variant="heading" style={styles.scoreNumber}>
                  {profile.reputationScore ?? 900}
                </AppText>
                <AppText variant="caption" color={THEME.colors.muted} style={styles.scoreFootnote}>
                  Based on community reports and activity
                </AppText>
              </View>
              <View style={[styles.scoreRing, { borderColor: ringColor }]}>
                <AppText variant="caption" style={styles.scoreRingText}>
                  {profile.reputationScore ?? 900}
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <AppText variant="label" style={styles.sectionLabel}>Listings by this user</AppText>
            {listings.length === 0 ? (
              <AppText variant="caption" color={THEME.colors.muted} style={{ marginTop: 8 }}>
                No active listings.
              </AppText>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listingRow}
              >
                {listings.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() =>
                      navigation.getParent()?.navigate('MainTabs', {
                        screen: 'ListingsTab',
                        params: { screen: 'ListingDetail', params: { listingId: l.id, listing: l } },
                      })
                    }
                    style={styles.listingCard}
                  >
                    <View style={styles.listingThumb}>
                      {Array.isArray(l.mediaUrls) && l.mediaUrls[0] ? (
                        <Image source={{ uri: l.mediaUrls[0] }} style={StyleSheet.absoluteFill} />
                      ) : (
                        <AppText variant="label" color={THEME.colors.white}>
                          {(l.category ?? l.title ?? '?')[0]?.toUpperCase()}
                        </AppText>
                      )}
                    </View>
                    <AppText variant="caption" numberOfLines={2} style={styles.listingTitle}>
                      {l.title}
                    </AppText>
                    <AppText variant="caption" color={THEME.colors.primary} style={styles.listingPrice}>
                      ₹{l.price?.toLocaleString?.('en-IN') ?? '—'}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {userId !== myUid && (
          <View style={styles.bottomBar}>
            <Button variant="secondary" label="Chat" onPress={onChat} style={styles.bottomBtn} />
            <Button variant="primary"   label="Call" onPress={onCall} style={styles.bottomBtn} />
          </View>
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <AppText variant="caption" style={styles.chipText}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.white },
  scroll: { paddingBottom: 100 },

  hero: { height: 200, width: '100%' },
  backFloating: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarWrap: { position: 'absolute', top: 160, left: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: THEME.colors.white,
    backgroundColor: '#9DC4F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: { fontSize: 26, fontWeight: '600' },

  offlineBanner: {
    backgroundColor: 'rgba(251,231,78,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 52,
    marginHorizontal: 20,
    borderRadius: 8,
  },

  content: { paddingTop: 52, paddingHorizontal: 20, gap: 6 },
  name: { fontSize: 24, fontWeight: '700' },
  profession: { fontSize: 14 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: THEME.colors.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 35,
  },
  chipText: { fontSize: 10 },

  scoreCard: {
    marginTop: 16,
    backgroundColor: THEME.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreNumber: { fontSize: 28, fontWeight: '700' },
  scoreFootnote: { fontSize: 11 },
  scoreRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 16 },

  sectionLabel: { fontSize: 14, fontWeight: '600' },

  listingRow: { gap: 10, paddingVertical: 8 },
  listingCard: {
    width: 160,
    backgroundColor: THEME.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  listingThumb: {
    height: 100,
    backgroundColor: '#9DC4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingTitle: { fontSize: 12, paddingHorizontal: 8, paddingTop: 6 },
  listingPrice: { fontSize: 13, fontWeight: '700', paddingHorizontal: 8, paddingBottom: 8 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  bottomBtn: { flex: 1 },

  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
