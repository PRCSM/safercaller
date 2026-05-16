import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { SkeletonBox } from '../../components/common/Skeleton';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';
import { classifiedsService, userService, scamService, chatService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

const HERO_HEIGHT = 280;
const WINDOW_WIDTH = Dimensions.get('window').width;

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

const CATEGORY_BG = {
  Plumbing:    '#A7CBF6',
  Electrical:  '#FBE74E',
  Tutoring:    '#FFCAFC',
  Vehicles:    '#9DC4F5',
  Electronics: '#ECEFEC',
  Furniture:   '#FFE0A7',
};

export default function ListingDetailScreen({ navigation, route }) {
  const myUid = useAuthStore((s) => s.user?.uid);
  const myProfile = useAuthStore((s) => s.profile);
  const listingId = route?.params?.listingId;
  const prefilled = route?.params?.listing ?? null;

  const [listing, setListing] = useState(prefilled);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(!prefilled);
  const [notFound, setNotFound] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Fetch listing if not prefilled.
  useEffect(() => {
    if (prefilled || !listingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await classifiedsService.getListingById(listingId);
        if (cancelled) return;
        if (!data) setNotFound(true);
        else setListing(data);
      } catch (err) {
        if (!cancelled) toast.error('Could not load listing', err?.message ?? '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, prefilled]);

  // Fetch seller profile.
  useEffect(() => {
    if (!listing?.sellerId) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await userService.getUserProfile(listing.sellerId);
        if (!cancelled) setSeller(profile);
      } catch (_) { /* ignore — seller card just stays empty */ }
    })();
    return () => { cancelled = true; };
  }, [listing?.sellerId]);

  const onShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `${listing.title} — ${formatPrice(listing)}\n\n${listing.description ?? ''}`,
      });
    } catch (_) { /* user cancelled */ }
  };

  const onCallSeller = async () => {
    if (!seller?.phone) {
      toast.warning('Seller phone unavailable');
      return;
    }
    haptics.light();
    try {
      const lookup = await scamService.lookupNumber(seller.phone);
      if (lookup?.isFlagged) {
        Alert.alert(
          '⚠️ Flagged number',
          `This number has ${lookup.count} report${lookup.count === 1 ? '' : 's'}` +
            (lookup.categories?.length ? ` (${lookup.categories.join(', ')})` : '') +
            '. Continue anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(`tel:${seller.phone}`) },
          ],
        );
        return;
      }
      Linking.openURL(`tel:${seller.phone}`).catch(() => toast.error('Could not place call'));
    } catch (_) {
      Linking.openURL(`tel:${seller.phone}`).catch(() => {});
    }
  };

  const onChatSeller = () => {
    if (!myUid || !listing?.sellerId) return;
    if (listing.sellerId === myUid) {
      toast.info("That's your listing");
      return;
    }
    haptics.light();
    const sellerName = seller?.name ?? seller?.fullName ?? 'Seller';
    navigation.getParent()?.getParent()?.navigate('ChatStack', {
      screen: 'Chat',
      params: {
        chatId: chatService.getChatId(myUid, listing.sellerId),
        otherUserId: listing.sellerId,
        otherUserName: sellerName,
        listing: { listingId: listing.id, listingTitle: listing.title },
      },
    });
  };

  if (notFound) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <PageWrapper>
          <View style={styles.notFoundWrap}>
            <AppText variant="heading">Listing not found</AppText>
            <AppText variant="caption" color={THEME.colors.muted}>
              It may have expired or been removed.
            </AppText>
            <Button
              variant="primary"
              label="Back to listings"
              onPress={() => navigation.goBack()}
              style={styles.notFoundBtn}
            />
          </View>
        </PageWrapper>
      </SafeAreaView>
    );
  }

  if (loading || !listing) return <ListingDetailSkeleton />;

  const images = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
  const createdAt = toDate(listing.createdAt);
  const expiresAt = toDate(listing.expiresAt);
  const tags = Array.isArray(listing.tags) ? listing.tags : [];
  const heroBg = CATEGORY_BG[listing.category] ?? THEME.colors.subtle;
  const contactMethod = listing.contactMethod ?? 'both';
  const showCall = contactMethod === 'call' || contactMethod === 'both';
  const showChat = contactMethod === 'chat' || contactMethod === 'both';
  const typeLabel = listing.type ?? (listing.condition ? listing.condition : 'Service');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { backgroundColor: heroBg }]}>
            {images.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setActiveImageIdx(Math.round(e.nativeEvent.contentOffset.x / WINDOW_WIDTH))
                }
              >
                {images.map((url, i) => (
                  <Image
                    key={url + i}
                    source={{ uri: url }}
                    style={[styles.heroImage, { width: WINDOW_WIDTH }]}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.heroPlaceholder}>
                <AppText variant="heading" color={THEME.colors.white}>
                  {(listing.category ?? listing.title ?? '?')[0]?.toUpperCase()}
                </AppText>
              </View>
            )}

            <View style={styles.typeBadge}>
              <AppText variant="caption" color={THEME.colors.white} style={styles.typeBadgeText}>
                {typeLabel}
              </AppText>
            </View>

            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeImageIdx && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.topBarFloating}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconButton} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={onShare} style={styles.iconButton} hitSlop={8}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.content}>
            <AppText variant="heading" style={styles.title}>{listing.title}</AppText>

            <View style={styles.priceRow}>
              <AppText variant="heading" color={THEME.colors.primary} style={styles.price}>
                {formatPrice(listing)}
              </AppText>
              {!!listing.condition && (
                <View style={styles.conditionPill}>
                  <AppText variant="caption" style={styles.conditionText}>
                    {listing.condition}
                  </AppText>
                </View>
              )}
            </View>

            {!!listing.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#5A585A" />
                <AppText variant="caption" color={THEME.colors.muted}>{listing.location}</AppText>
              </View>
            )}

            <View style={styles.divider} />

            <AppText variant="label" style={styles.sectionLabel}>About this listing</AppText>
            <AppText variant="caption" color={THEME.colors.text} style={styles.description}>
              {listing.description ?? 'No description provided.'}
            </AppText>

            {tags.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.tagRow}>
                  {tags.map((t) => (
                    <View key={t} style={styles.tag}>
                      <AppText variant="caption" style={styles.tagText}>{t}</AppText>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.sellerLabelRow}>
              <Ionicons name="person-outline" size={12} color="#5A585A" />
              <AppText variant="caption" color={THEME.colors.muted} style={styles.sellerLabel}>
                POSTED BY
              </AppText>
            </View>
            <Pressable
              onPress={() => seller?.uid && navigation.getParent()?.getParent()?.navigate('PeopleStack', {
                screen: 'ProfileView',
                params: { userId: seller.uid },
              })}
              style={styles.sellerRow}
            >
              <View style={styles.sellerAvatar}>
                {seller?.profilePhoto ? (
                  <Image source={{ uri: seller.profilePhoto }} style={StyleSheet.absoluteFill} />
                ) : (
                  <AppText variant="label" color={THEME.colors.white}>
                    {(seller?.name ?? '?')[0]?.toUpperCase()}
                  </AppText>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>{seller?.name ?? '—'}</AppText>
                {!!seller?.profession && (
                  <AppText variant="caption" color={THEME.colors.muted} numberOfLines={1}>
                    {seller.profession}
                  </AppText>
                )}
              </View>
              <ScoreRing score={seller?.reputationScore ?? 900} />
              <AppText variant="caption" color={THEME.colors.primary} style={{ marginLeft: 6 }}>
                View →
              </AppText>
            </Pressable>

            <View style={styles.metaRow}>
              {createdAt && (
                <View style={styles.metaCluster}>
                  <Ionicons name="calendar-outline" size={12} color="#5A585A" />
                  <AppText variant="caption" color={THEME.colors.muted}>
                    Listed {formatDistanceToNowStrict(createdAt)} ago
                  </AppText>
                </View>
              )}
              {expiresAt && (
                <AppText variant="caption" color={THEME.colors.muted}>
                  Expires {format(expiresAt, 'dd MMM yyyy')}
                </AppText>
              )}
            </View>
          </View>
        </ScrollView>

        {(showCall || showChat) && listing.sellerId !== myUid && (
          <View style={styles.bottomBar}>
            {showCall && (
              <Button
                variant="primary"
                label="Call Seller"
                onPress={onCallSeller}
                style={styles.bottomBtn}
                leftIcon={<Ionicons name="call" size={18} color="#fff" />}
              />
            )}
            {showChat && (
              <Button
                variant="secondary"
                label="Chat"
                onPress={onChatSeller}
                style={styles.bottomBtn}
                leftIcon={<Ionicons name="chatbubble-outline" size={18} color="#fff" />}
              />
            )}
          </View>
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

function formatPrice(listing) {
  if (typeof listing.price !== 'number') return '—';
  const formatted = `₹${listing.price.toLocaleString('en-IN')}`;
  return listing.priceUnit ? `${formatted}${listing.priceUnit}` : formatted;
}

function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(1, score / 1000));
  const ringColor =
    pct >= 0.7 ? THEME.colors.primary : pct >= 0.4 ? THEME.colors.warning : THEME.colors.coral;
  return (
    <View style={[styles.scoreRing, { borderColor: ringColor }]}>
      <AppText variant="caption" style={styles.scoreText}>{score}</AppText>
    </View>
  );
}

function ListingDetailSkeleton() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <SkeletonBox width="100%" height={HERO_HEIGHT} radius={0} />
        <View style={styles.content}>
          <SkeletonBox width="70%" height={24} />
          <View style={{ height: 12 }} />
          <SkeletonBox width="40%" height={22} />
          <View style={{ height: 16 }} />
          <SkeletonBox width="100%" height={14} />
          <View style={{ height: 8 }} />
          <SkeletonBox width="80%" height={14} />
          <View style={{ height: 8 }} />
          <SkeletonBox width="90%" height={14} />
        </View>
      </PageWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.white },
  scroll: { paddingBottom: 100 },

  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { height: HERO_HEIGHT },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 35,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: THEME.colors.white, width: 14 },

  topBarFloating: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 20,
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: { fontSize: 22, fontWeight: '700' },
  conditionPill: {
    backgroundColor: THEME.colors.subtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 35,
  },
  conditionText: { fontSize: 12 },
  locationRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaCluster: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 12 },

  sectionLabel: { fontSize: 14, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 22, marginTop: 8 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: THEME.colors.subtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 35,
  },
  tagText: { fontSize: 12 },

  sellerLabel: { fontSize: 11, letterSpacing: 0.5 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9DC4F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scoreRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: 12, fontWeight: '700' },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

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
    paddingHorizontal: 24,
  },
  notFoundBtn: { marginTop: 16, minWidth: 200 },
});
