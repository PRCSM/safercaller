import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { toast } from '../../utils/toast';
import { functionsService } from '../../services';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const LOCATIONS = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune'];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const MARITALS = ['Single', 'Married', 'Divorced', 'Widowed'];
const FALLBACK_PROFESSIONS = [
  'Software Engineer', 'Teacher', 'Doctor', 'Accountant', 'Designer',
  'Sales Manager', 'Plumber', 'Electrician', 'Driver', 'Photographer',
];
const SUB_PROFESSIONS = {
  'Software Engineer': ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps'],
  'Teacher':           ['Primary', 'Secondary', 'College', 'Tutoring'],
  'Doctor':            ['General', 'Cardiology', 'Pediatrics', 'Dermatology'],
};

const formatDateISO = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ProfileSetupScreen({ navigation, route }) {
  // Carry only phone forward — the signed-in user lives in RNFirebase
  // Auth (auth().currentUser) and VerificationScreen reads it from there.
  // Passing the Firebase user object through nav params would warn about
  // non-serializable values and can break state persistence.
  const phone = route?.params?.phone ?? null;

  const [form, setForm] = useState({
    // AUDIT FIX: added name as a required field per spec.
    name: '',
    dob: '',
    gender: '',
    location: '',
    religion: '',
    maritalStatus: '',
    profession: '',
    subProfession: '',
    yearlyIncome: '',
  });
  const [photoUri, setPhotoUri] = useState(null);
  const [goOnline, setGoOnline] = useState(true);

  // AI-fetched professions via the getAIProfessions Cloud Function.
  // While loading, the picker shows FALLBACK_PROFESSIONS without a badge;
  // once the call resolves, the list swaps in and the AI badge appears.
  const [professions, setProfessions] = useState(FALLBACK_PROFESSIONS);
  const [aiReady, setAiReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await functionsService.getAIProfessions();
      if (cancelled) return;
      if (Array.isArray(list) && list.length > 0) setProfessions(list);
      setAiReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const setField = (k, v) =>
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'profession' && prev.profession !== v) next.subProfession = '';
      return next;
    });

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Photo permission required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        haptics.success();
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      toast.error('Could not open photo library', err?.message ?? '');
    }
  };

  const onContinue = () => {
    // AUDIT FIX: validate every required field with specific messages.
    // Name regex: 2-50 letters/spaces only.
    const name = (form.name ?? '').trim();
    if (!name || !/^[a-zA-Z\s]{2,50}$/.test(name)) {
      toast.error('Invalid name', 'Name must be 2–50 letters only');
      haptics.error();
      return;
    }
    if (!form.dob) {
      toast.error('Date of birth is required');
      haptics.error();
      return;
    }
    // AUDIT FIX: must be at least 18.
    const dobDate = new Date(form.dob);
    const now = new Date();
    let age = now.getFullYear() - dobDate.getFullYear();
    const m = now.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) age--;
    if (Number.isNaN(age) || age < 18) {
      toast.error('You must be at least 18 years old');
      haptics.error();
      return;
    }
    if (!form.gender)     { toast.error('Gender is required');     haptics.error(); return; }
    if (!form.location)   { toast.error('Location is required');   haptics.error(); return; }
    if (!form.profession) { toast.error('Profession is required'); haptics.error(); return; }

    haptics.light();
    const profileData = {
      ...form,
      name,
      goOnline,
      photoUri, // raw local uri — upload happens in VerificationScreen
      yearlyIncome: form.yearlyIncome ? Number(form.yearlyIncome) : null,
    };
    navigation.navigate('Verification', { phone, profileData });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topBar}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                <View style={styles.backButton}>
                  <Ionicons name="arrow-back" size={22} color="#000" />
                </View>
              </Pressable>
              <View style={styles.progressDots}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
              </View>
              <Pressable
                onPress={() => navigation.navigate('Verification', { phone, profileData: null })}
                hitSlop={10}
              >
                <AppText variant="caption" color={THEME.colors.muted}>
                  {STRINGS.common.skip}
                </AppText>
              </Pressable>
            </View>

            <StaggerBlock index={0}>
              <AppText variant="heading">{STRINGS.profileSetup.title}</AppText>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.subtitle}>
                {STRINGS.profileSetup.subtitle}
              </AppText>
            </StaggerBlock>

            <StaggerBlock index={1} style={styles.photoWrap}>
              <Pressable onPress={pickPhoto}>
                <View style={styles.photoCircle}>
                  {photoUri ? (
                    <PhotoPreview uri={photoUri} />
                  ) : (
                    <Ionicons name="camera-outline" size={32} color="#5A585A" />
                  )}
                </View>
              </Pressable>
              <Pressable onPress={pickPhoto}>
                <AppText variant="caption" color={THEME.colors.primary} style={styles.photoLabel}>
                  {STRINGS.profileSetup.addPhoto}
                </AppText>
              </Pressable>
            </StaggerBlock>

            <StaggerBlock index={2}>
              <GoOnlineRow value={goOnline} onChange={setGoOnline} />
            </StaggerBlock>

            <View style={styles.fieldStack}>
              {/* AUDIT FIX: name field added (required, letters only). */}
              <StaggerBlock index={2.5}>
                <FloatingTextField
                  label="Full Name *"
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  placeholder="Your full name"
                />
              </StaggerBlock>
              <StaggerBlock index={3}>
                <FloatingDateField
                  label={STRINGS.profileSetup.labels.dob}
                  value={form.dob}
                  onChange={(v) => setField('dob', v)}
                />
              </StaggerBlock>
              <StaggerBlock index={4}>
                <PickerField
                  label={STRINGS.profileSetup.labels.gender}
                  value={form.gender}
                  options={GENDERS}
                  onChange={(v) => setField('gender', v)}
                />
              </StaggerBlock>
              <StaggerBlock index={5}>
                <PickerField
                  label={STRINGS.profileSetup.labels.location}
                  value={form.location}
                  options={LOCATIONS}
                  onChange={(v) => setField('location', v)}
                />
              </StaggerBlock>
              <StaggerBlock index={6}>
                <PickerField
                  label={STRINGS.profileSetup.labels.religion}
                  value={form.religion}
                  options={RELIGIONS}
                  onChange={(v) => setField('religion', v)}
                />
              </StaggerBlock>
              <StaggerBlock index={7}>
                <PickerField
                  label={STRINGS.profileSetup.labels.maritalStatus}
                  value={form.maritalStatus}
                  options={MARITALS}
                  onChange={(v) => setField('maritalStatus', v)}
                />
              </StaggerBlock>
              <StaggerBlock index={8}>
                <PickerField
                  label={STRINGS.profileSetup.labels.profession}
                  value={form.profession}
                  options={professions}
                  onChange={(v) => setField('profession', v)}
                  badge={aiReady ? STRINGS.profileSetup.aiBadge : null}
                />
              </StaggerBlock>
              <StaggerBlock index={9}>
                <PickerField
                  label={STRINGS.profileSetup.labels.subProfession}
                  value={form.subProfession}
                  options={SUB_PROFESSIONS[form.profession] ?? []}
                  onChange={(v) => setField('subProfession', v)}
                  disabled={!form.profession}
                />
              </StaggerBlock>
              <StaggerBlock index={10}>
                <FloatingTextField
                  label={STRINGS.profileSetup.labels.yearlyIncome}
                  value={form.yearlyIncome}
                  onChangeText={(v) => setField('yearlyIncome', v.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 600000"
                  keyboardType="number-pad"
                />
              </StaggerBlock>
            </View>

            <StaggerBlock index={11}>
              <Button
                variant="primary"
                label={STRINGS.common.continue}
                onPress={onContinue}
                style={styles.continueButton}
              />
            </StaggerBlock>
          </ScrollView>
        </KeyboardAvoidingView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Stagger wrapper  ───────────────────────────── */

function StaggerBlock({ index, children, style }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);
  useEffect(() => {
    ty.value = withDelay(
      index * 40,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      index * 40,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

/* ─────────────────────────────  Photo preview (pop-in)  ───────────────────────────── */

function PhotoPreview({ uri }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  }, [uri, scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.photoPreviewWrap, animStyle]}>
      <Image source={{ uri }} style={styles.photoImage} />
    </Animated.View>
  );
}

/* ─────────────────────────────  Go Online row  ───────────────────────────── */

function GoOnlineRow({ value, onChange }) {
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 250 });
  }, [value, progress]);
  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [THEME.colors.surface, 'rgba(0,102,255,0.06)']
    ),
  }));
  return (
    <Animated.View style={[styles.goOnlineCard, cardStyle]}>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{STRINGS.profileSetup.goOnline}</AppText>
        <AppText variant="caption" color={THEME.colors.muted}>
          {STRINGS.profileSetup.goOnlineSub}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { haptics.light(); onChange(v); }}
        trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
        thumbColor={THEME.colors.white}
      />
    </Animated.View>
  );
}

/* ─────────────────────────────  Floating text field  ───────────────────────────── */

function FloatingTextField({ label, value, onChangeText, placeholder, keyboardType }) {
  const [focused, setFocused] = useState(false);
  const labelProgress = useSharedValue(value ? 1 : 0);
  const labelColor = useSharedValue(0);

  const isFloating = focused || !!value;

  useEffect(() => {
    labelProgress.value = withTiming(isFloating ? 1 : 0, { duration: 200 });
    labelColor.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [isFloating, focused, labelProgress, labelColor]);

  const labelAnimStyle = useAnimatedStyle(() => {
    const t = labelProgress.value;
    return {
      transform: [{ translateY: -22 * t }, { scale: 1 - 0.22 * t }],
      color: interpolateColor(
        labelColor.value,
        [0, 1],
        [THEME.colors.muted, THEME.colors.primary]
      ),
    };
  });

  return (
    <View style={styles.fieldContainer}>
      <Animated.Text style={[styles.floatingLabel, labelAnimStyle]}>{label}</Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={isFloating ? placeholder : ''}
        placeholderTextColor={THEME.colors.border}
        keyboardType={keyboardType}
        style={[
          styles.fieldInput,
          { borderColor: focused ? THEME.colors.focusCyan : THEME.colors.border },
        ]}
      />
    </View>
  );
}

/* ─────────────────────────────  Floating date field  ───────────────────────────── */

function FloatingDateField({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const initialDate = value ? new Date(value) : new Date(2000, 0, 1);

  const isFloating = !!value || showPicker;
  const labelProgress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    labelProgress.value = withTiming(isFloating ? 1 : 0, { duration: 200 });
  }, [isFloating, labelProgress]);

  const labelStyle = useAnimatedStyle(() => {
    const t = labelProgress.value;
    return {
      transform: [{ translateY: -22 * t }, { scale: 1 - 0.22 * t }],
      color: showPicker ? THEME.colors.primary : THEME.colors.muted,
    };
  });

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'dismissed') return;
    if (selected) onChange(formatDateISO(selected));
  };

  return (
    <View style={styles.fieldContainer}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>{label}</Animated.Text>
      <Pressable onPress={() => { haptics.light(); setShowPicker(true); }}>
        <View
          style={[
            styles.fieldInput,
            styles.pickerInput,
            { borderColor: showPicker ? THEME.colors.focusCyan : THEME.colors.border },
          ]}
        >
          <AppText variant="label" color={value ? THEME.colors.text : 'transparent'}>
            {value || '—'}
          </AppText>
          <Ionicons name="calendar-outline" size={18} color="#5A585A" />
        </View>
      </Pressable>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={initialDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <AppText variant="label">{label}</AppText>
                <Pressable onPress={() => setShowPicker(false)}>
                  <AppText variant="label" color={THEME.colors.primary}>Done</AppText>
                </Pressable>
              </View>
              <DateTimePicker
                value={initialDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

/* ─────────────────────────────  Picker field + modal  ───────────────────────────── */

function PickerField({ label, value, options, onChange, badge, disabled }) {
  const [open, setOpen] = useState(false);

  const labelProgress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    labelProgress.value = withTiming(value || open ? 1 : 0, { duration: 200 });
  }, [value, open, labelProgress]);

  const labelStyle = useAnimatedStyle(() => {
    const t = labelProgress.value;
    return {
      transform: [{ translateY: -22 * t }, { scale: 1 - 0.22 * t }],
      color: open ? THEME.colors.primary : THEME.colors.muted,
    };
  });

  const openPicker = () => {
    if (disabled) return;
    haptics.light();
    setOpen(true);
  };

  return (
    <View style={styles.fieldContainer}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>{label}</Animated.Text>
      <Pressable onPress={openPicker} disabled={disabled}>
        <View
          style={[
            styles.fieldInput,
            styles.pickerInput,
            { borderColor: open ? THEME.colors.focusCyan : THEME.colors.border },
            disabled && { opacity: 0.4 },
          ]}
        >
          <AppText variant="label" color={value ? THEME.colors.text : 'transparent'} style={{ flex: 1 }}>
            {value || '—'}
          </AppText>
          <View style={styles.pickerRight}>
            {!!badge && (
              <View style={styles.aiBadge}>
                <AppText variant="caption" style={styles.aiBadgeText}>{badge}</AppText>
              </View>
            )}
            <Ionicons name="chevron-down" size={18} color="#5A585A" />
          </View>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <AppText variant="label" style={styles.modalTitle}>{label}</AppText>
            <ScrollView>
              {options.length === 0 ? (
                <AppText variant="caption" color={THEME.colors.muted} style={styles.emptyOptions}>
                  Select a profession first.
                </AppText>
              ) : options.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  style={styles.modalOption}
                >
                  <AppText variant="label" color={opt === value ? THEME.colors.primary : THEME.colors.text}>
                    {opt}
                  </AppText>
                  {opt === value && <Ionicons name="checkmark" size={18} color={THEME.colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { marginTop: 4 },

  photoWrap: { alignItems: 'center', gap: 6, marginBottom: 24 },
  photoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: THEME.colors.subtle,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreviewWrap: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoLabel: { marginTop: 4 },

  goOnlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: THEME.spacing.md,
  },

  fieldStack: { gap: 20 },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.subtle,
  },
  progressDotActive: {
    backgroundColor: THEME.colors.primary,
  },
  fieldContainer: { position: 'relative' },
  floatingLabel: {
    fontSize: 14,
    color: THEME.colors.muted,
    transformOrigin: 'left center',
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  pickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    backgroundColor: THEME.colors.accentBlue,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '600' },
  fieldInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.white,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: { marginBottom: THEME.spacing.md },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },
  emptyOptions: { paddingVertical: THEME.spacing.md },

  continueButton: { marginTop: THEME.spacing.md },
});
