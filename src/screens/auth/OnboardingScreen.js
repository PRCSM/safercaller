import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/common/AppText';
import { PhoneMockup } from '../../components/common/PhoneMockup';
import { FloatCard } from '../../components/common/FloatCard';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';

export const ONBOARDING_KEY = 'onboarding_complete';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'protect',
    bg: '#EEF4FF',
    line1: 'Every Call.',
    line2: 'Now Protected.',
    sub: 'SAFERCALLER detects scams before you answer — in under 300ms.',
    visual: 'protect',
  },
  {
    id: 'services',
    bg: '#FFF8EE',
    line1: 'Trusted Services',
    line2: 'Near You.',
    sub: 'Browse verified listings and connect with trusted local services.',
    visual: 'services',
  },
  {
    id: 'community',
    bg: '#F0FFF4',
    line1: 'Built by a',
    line2: 'Community.',
    sub: 'A reputation system powered by real users — not algorithms.',
    visual: 'community',
  },
];

export default function OnboardingScreen({ navigation }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_) { /* ignore */ }
    navigation.replace('Splash');
  };

  const onNext = () => {
    haptics.light();
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const onMomentumScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: SLIDES[index].bg }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Skip — top right */}
        <Pressable onPress={finish} style={styles.skipBtn} hitSlop={8}>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.skipText}>
            Skip
          </AppText>
        </Pressable>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item, index: i }) => (
            <View style={[styles.slide, { backgroundColor: item.bg }]}>
              <SlideVisual variant={item.visual} active={i === index} />
            </View>
          )}
        />

        {/* Bottom sheet — fixed, not part of the swipe content */}
        <View style={styles.bottomSheet}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <Dot key={i} active={i === index} />
            ))}
          </View>

          <AppText variant="display" style={styles.headline}>{SLIDES[index].line1}</AppText>
          <AppText variant="display" color={THEME.colors.primary} style={styles.headline}>
            {SLIDES[index].line2}
          </AppText>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.sub}>
            {SLIDES[index].sub}
          </AppText>

          {index < SLIDES.length - 1 ? (
            <Pressable onPress={onNext} style={styles.nextBtn}>
              <AppText variant="label" color={THEME.colors.white} style={styles.nextLabel}>
                Next
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={THEME.colors.white} />
            </Pressable>
          ) : (
            <Pressable onPress={onNext} style={styles.getStartedBtn}>
              <AppText variant="label" color={THEME.colors.white} style={styles.getStartedLabel}>
                Get Started →
              </AppText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ───── Dot — animates width on active change ───── */

function Dot({ active }) {
  const w = useSharedValue(active ? 24 : 8);
  useEffect(() => {
    w.value = withSpring(active ? 24 : 8, { damping: 14, stiffness: 240 });
  }, [active, w]);
  const animStyle = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: active ? THEME.colors.primary : THEME.colors.border },
      ]}
    />
  );
}

/* ───── Slide visual area — phone mockup + floating cards ───── */

function SlideVisual({ variant, active }) {
  // Subtle float animation for the decorative cards.
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0,  { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [float]);

  const floatA = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const floatB = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value }] }));

  return (
    <View style={styles.visualArea}>
      {variant === 'protect'   && <ProtectMockup floatA={floatA} floatB={floatB} />}
      {variant === 'services'  && <ServicesMockup floatA={floatA} floatB={floatB} />}
      {variant === 'community' && <CommunityMockup floatA={floatA} floatB={floatB} />}
    </View>
  );
}

/* ───── Three slide visuals ───── */

function ProtectMockup({ floatA, floatB }) {
  return (
    <>
      <PhoneMockup bgColor={THEME.colors.dark}>
        <View style={mockupStyles.protectInner}>
          <AppText variant="caption" color="rgba(255,255,255,0.5)" style={mockupStyles.tinyLabel}>
            INCOMING CALL
          </AppText>
          <View style={mockupStyles.avatar}><AppText variant="label" color={THEME.colors.white}>UN</AppText></View>
          <AppText variant="caption" color={THEME.colors.white} style={mockupStyles.phoneNum}>
            +91 99887 76655
          </AppText>
          <View style={mockupStyles.flaggedCard}>
            <AppText variant="caption" color={THEME.colors.coral} style={mockupStyles.flaggedBadge}>
              HIGH RISK
            </AppText>
            <AppText variant="caption" color={THEME.colors.white} style={mockupStyles.flaggedText}>
              Reported as UPI Fraud
            </AppText>
          </View>
          <View style={mockupStyles.actionsRow}>
            <View style={[mockupStyles.actionDot, { backgroundColor: '#FF5A4D' }]} />
            <View style={[mockupStyles.actionDot, { backgroundColor: '#FBE74E' }]} />
            <View style={[mockupStyles.actionDot, { backgroundColor: '#22C55E' }]} />
          </View>
        </View>
      </PhoneMockup>

      <Animated.View style={[mockupStyles.floatTopLeft, floatA]}>
        <FloatCard rotation="-8deg">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" color={THEME.colors.primary} size={14} />
            <AppText variant="caption" style={mockupStyles.floatLabel}>Scam Detected</AppText>
          </View>
        </FloatCard>
      </Animated.View>

      <Animated.View style={[mockupStyles.floatBottomRight, floatB]}>
        <FloatCard rotation="6deg" bg={THEME.colors.primary}>
          <AppText variant="caption" color={THEME.colors.white} style={mockupStyles.timingPill}>
            &lt; 300ms
          </AppText>
        </FloatCard>
      </Animated.View>
    </>
  );
}

function ServicesMockup({ floatA, floatB }) {
  return (
    <>
      <PhoneMockup bgColor={THEME.colors.white}>
        <View style={mockupStyles.servicesInner}>
          <AppText variant="caption" color={THEME.colors.muted} style={mockupStyles.tinyLabel}>
            CLASSIFIEDS
          </AppText>
          <View style={[mockupStyles.listingCard, { backgroundColor: '#A7CBF6' }]}>
            <View style={mockupStyles.listingThumb} />
            <AppText variant="caption" style={mockupStyles.listingTitle}>AC Repair</AppText>
            <AppText variant="caption" color={THEME.colors.primary} style={mockupStyles.listingPrice}>
              ₹500
            </AppText>
          </View>
          <View style={[mockupStyles.listingCard, { backgroundColor: '#FFCAFC' }]}>
            <View style={mockupStyles.listingThumb} />
            <AppText variant="caption" style={mockupStyles.listingTitle}>iPhone 13</AppText>
            <AppText variant="caption" color={THEME.colors.primary} style={mockupStyles.listingPrice}>
              ₹42,000
            </AppText>
          </View>
        </View>
      </PhoneMockup>

      <Animated.View style={[mockupStyles.floatTopRight, floatA]}>
        <FloatCard rotation="8deg">
          <AppText variant="caption" style={mockupStyles.floatLabel}>⭐ 4.9</AppText>
        </FloatCard>
      </Animated.View>

      <Animated.View style={[mockupStyles.floatBottomLeft, floatB]}>
        <FloatCard rotation="-6deg" bg="rgba(34,197,94,0.12)">
          <AppText variant="caption" color={THEME.colors.success} style={mockupStyles.floatLabel}>
            ✓ Verified Seller
          </AppText>
        </FloatCard>
      </Animated.View>
    </>
  );
}

function CommunityMockup({ floatA, floatB }) {
  return (
    <>
      <PhoneMockup bgColor={THEME.colors.white}>
        <View style={mockupStyles.communityInner}>
          <AppText variant="caption" color={THEME.colors.muted} style={mockupStyles.tinyLabel}>
            PEOPLE SEARCH
          </AppText>
          {[
            { name: 'Meena Devi',   color: '#9DC4F5', ring: THEME.colors.success, score: 920 },
            { name: 'Rohit Verma',  color: '#FBE74E', ring: THEME.colors.warning, score: 410 },
            { name: 'Unknown',      color: '#FF5A4D', ring: THEME.colors.coral,   score: 180 },
          ].map((p) => (
            <View key={p.name} style={mockupStyles.personRow}>
              <View style={[mockupStyles.personAvatar, { backgroundColor: p.color }]} />
              <AppText variant="caption" style={mockupStyles.personName}>{p.name}</AppText>
              <View style={[mockupStyles.scoreRing, { borderColor: p.ring }]}>
                <AppText variant="caption" style={mockupStyles.scoreText}>{p.score}</AppText>
              </View>
            </View>
          ))}
        </View>
      </PhoneMockup>

      <Animated.View style={[mockupStyles.floatTopLeft, floatA]}>
        <FloatCard rotation="-8deg">
          <AppText variant="caption" style={mockupStyles.floatLabel}>👥 50K+ Users</AppText>
        </FloatCard>
      </Animated.View>

      <Animated.View style={[mockupStyles.floatBottomRight, floatB]}>
        <FloatCard rotation="6deg" bg={THEME.colors.primary}>
          <AppText variant="caption" color={THEME.colors.white} style={mockupStyles.floatLabel}>
            🛡️ 2M+ Blocked
          </AppText>
        </FloatCard>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  slide: { width: SCREEN_WIDTH, flex: 1 },
  visualArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    position: 'relative',
  },
  skipBtn: {
    position: 'absolute',
    top: 52, right: 20, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: { fontSize: 13, fontWeight: '500' },

  bottomSheet: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },

  headline: { fontSize: 36, lineHeight: 42 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 12 },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.dark,
    borderRadius: 35,
    height: 56,
    paddingHorizontal: 32,
    alignSelf: 'flex-start',
    marginTop: 32,
  },
  nextLabel: { fontSize: 15, fontWeight: '600' },

  getStartedBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 35,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 32,
  },
  getStartedLabel: { fontSize: 15, fontWeight: '600' },
});

const mockupStyles = StyleSheet.create({
  tinyLabel: { fontSize: 9, letterSpacing: 1, marginBottom: 8 },

  protectInner: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#9DC4F5',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  phoneNum: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  flaggedCard: {
    backgroundColor: 'rgba(255,90,77,0.15)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  flaggedBadge: { fontSize: 9, fontWeight: '700' },
  flaggedText: { fontSize: 10, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  actionDot: { width: 32, height: 32, borderRadius: 16 },

  servicesInner: { flex: 1, padding: 14, gap: 10 },
  listingCard: {
    borderRadius: 12,
    padding: 8,
  },
  listingThumb: {
    width: '100%',
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
  },
  listingTitle: { fontSize: 11, fontWeight: '600' },
  listingPrice: { fontSize: 12, fontWeight: '700' },

  communityInner: { flex: 1, padding: 14, gap: 10 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personAvatar: { width: 28, height: 28, borderRadius: 14 },
  personName: { flex: 1, fontSize: 11, fontWeight: '600' },
  scoreRing: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontSize: 9, fontWeight: '700' },

  floatTopLeft:     { position: 'absolute', top:  60, left:  10 },
  floatTopRight:    { position: 'absolute', top:  60, right: 10 },
  floatBottomLeft:  { position: 'absolute', bottom: 30, left:  10 },
  floatBottomRight: { position: 'absolute', bottom: 30, right: 10 },
  floatLabel: { fontSize: 11, fontWeight: '600' },
  timingPill: { fontSize: 13, fontWeight: '700' },
});
