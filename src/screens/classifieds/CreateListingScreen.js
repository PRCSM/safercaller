import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { classifiedsService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { useClassifiedsStore } from '../../store/classifiedsStore';
import { toast } from '../../utils/toast';

const MAX_MEDIA = 8;

const CATEGORIES = ['Plumbing', 'Electrical', 'Tutoring', 'Vehicles', 'Electronics', 'Furniture', 'Other'];
const SUBCATEGORIES = {
  Plumbing:    ['Repair', 'Installation', 'Maintenance'],
  Electrical:  ['Wiring', 'AC', 'Lighting', 'Repair'],
  Tutoring:    ['Math', 'Science', 'Language', 'Music'],
  Vehicles:    ['Cars', 'Bikes', 'Scooters', 'Cycles'],
  Electronics: ['Phones', 'Laptops', 'Audio', 'Cameras'],
  Furniture:   ['Tables', 'Chairs', 'Beds', 'Storage'],
  Other:       [],
};
const LOCATIONS = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune', 'Other'];
const CONDITIONS = ['New', 'Used', 'Refurbished'];
const CONTACT_METHODS = ['Call', 'Chat', 'Both'];

export default function CreateListingScreen({ navigation }) {
  const userId = useAuthStore((s) => s.user?.uid);
  const addListing = useClassifiedsStore((s) => s.addListing);

  const [type, setType] = useState('product'); // 'product' | 'service'
  const [media, setMedia] = useState([]); // [{ id, uri, mimeType }]
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    price: '',
    condition: '',
    contactMethod: 'Both',
    location: '',
  });
  const [tags, setTags] = useState([]); // [{ id, value }]
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (k, v) =>
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'category' && prev.category !== v) next.subcategory = '';
      return next;
    });

  /* ─────────────────  Media  ───────────────── */

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      toast.warning(`Max ${MAX_MEDIA} files`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Photo permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - media.length,
    });
    if (result.canceled) return;
    haptics.success();
    setMedia((prev) => [
      ...prev,
      ...result.assets.map((a) => ({
        id: `m-${Date.now()}-${Math.random()}`,
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
      })),
    ]);
  };

  const removeMedia = (id) =>
    setMedia((prev) => prev.filter((m) => m.id !== id));

  /* ─────────────────  Tags  ───────────────── */

  const commitTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (tags.some((t) => t.value.toLowerCase() === v.toLowerCase())) {
      setTagInput('');
      return;
    }
    haptics.light();
    setTags((prev) => [...prev, { id: `t-${Date.now()}-${Math.random()}`, value: v }]);
    setTagInput('');
  };

  const removeTag = (id) => setTags((prev) => prev.filter((t) => t.id !== id));

  /* ─────────────────  Use my location  ───────────────── */

  const useMyLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.warning('Location permission required');
        return;
      }
      const coords = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const city = places?.[0]?.city ?? places?.[0]?.subregion ?? places?.[0]?.region;
      if (city) {
        setField('location', city);
        haptics.success();
        toast.success('Location set', city);
      } else {
        toast.info('Could not resolve city');
      }
    } catch (err) {
      toast.error('Location lookup failed', err?.message ?? '');
    }
  };

  /* ─────────────────  Submit  ───────────────── */

  const submit = async () => {
    if (!form.title.trim() || !form.category || !form.location || !form.price) {
      toast.error('Required fields missing', 'Title, Category, Location, Price');
      haptics.error();
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type,
        category: form.category,
        subcategory: form.subcategory || null,
        price: Number(form.price) || 0,
        condition: type === 'product' ? (form.condition || null) : null,
        contactMethod: form.contactMethod,
        location: form.location,
        tags: tags.map((t) => t.value),
      };
      const newId = await classifiedsService.createListing(userId, payload, media);
      // Stamp our local store too so the seller can see it on My Listings.
      addListing({ id: newId, ...payload, sellerId: userId, mediaUrls: [], status: 'active' });
      haptics.success();
      toast.success('Listing posted', form.title.trim());
      navigation.goBack();
    } catch (err) {
      toast.error('Could not post listing', err?.message ?? 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.headerBack}>
              <Ionicons name="arrow-back" size={22} color="#000" />
            </Pressable>
            <AppText variant="label" style={styles.headerTitle}>
              {STRINGS.classifieds.createTitle}
            </AppText>
            <Pressable
              onPress={() => toast.info('Draft save coming soon')}
              hitSlop={6}
            >
              <AppText variant="caption" color={THEME.colors.muted}>
                {STRINGS.common.saveDraft}
              </AppText>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Product / Service segmented toggle */}
            <SegmentedToggle
              value={type}
              onChange={setType}
              options={[
                { id: 'product', label: STRINGS.classifieds.typeProduct, iconName: 'cube-outline' },
                { id: 'service', label: STRINGS.classifieds.typeService, iconName: 'construct-outline' },
              ]}
            />

            {/* Media upload row */}
            <MediaRow media={media} onAdd={pickMedia} onRemove={removeMedia} />

            {/* Form fields */}
            <View style={styles.fieldStack}>
              <TextField
                label={STRINGS.classifieds.labels.title}
                value={form.title}
                onChangeText={(v) => setField('title', v)}
                placeholder="e.g. AC Repair & Service"
              />

              <TextField
                label={STRINGS.classifieds.labels.description}
                value={form.description}
                onChangeText={(v) => setField('description', v)}
                placeholder="What you offer, hours, anything buyers should know"
                multiline
              />

              <PickerField
                label={STRINGS.classifieds.labels.category}
                value={form.category}
                options={CATEGORIES}
                onChange={(v) => setField('category', v)}
              />

              <View style={styles.indented}>
                <PickerField
                  label={STRINGS.classifieds.labels.subcategory}
                  value={form.subcategory}
                  options={SUBCATEGORIES[form.category] ?? []}
                  onChange={(v) => setField('subcategory', v)}
                  disabled={!form.category || (SUBCATEGORIES[form.category]?.length ?? 0) === 0}
                />
              </View>

              <PriceField
                value={form.price}
                onChangeText={(v) => setField('price', v.replace(/[^0-9]/g, ''))}
              />

              {type === 'product' && (
                <PillToggle
                  label={STRINGS.classifieds.labels.condition}
                  value={form.condition}
                  options={CONDITIONS}
                  onChange={(v) => setField('condition', v)}
                />
              )}

              <PillToggle
                label={STRINGS.classifieds.labels.contactMethod}
                value={form.contactMethod}
                options={CONTACT_METHODS}
                onChange={(v) => setField('contactMethod', v)}
              />

              <View>
                <PickerField
                  label={STRINGS.classifieds.labels.location}
                  value={form.location}
                  options={LOCATIONS}
                  onChange={(v) => setField('location', v)}
                />
                <Pressable onPress={useMyLocation} hitSlop={6} style={styles.useLocBtn}>
                  <Ionicons name="locate-outline" size={14} color={THEME.colors.primary} />
                  <AppText variant="caption" color={THEME.colors.primary}>
                    {STRINGS.classifieds.useMyLocation}
                  </AppText>
                </Pressable>
              </View>

              <TagsField
                tags={tags}
                input={tagInput}
                setInput={setTagInput}
                onCommit={commitTag}
                onRemove={removeTag}
              />
            </View>

            <View style={styles.expiryBanner}>
              <Ionicons name="time-outline" size={20} color="#5A585A" />
              <AppText variant="caption" color={THEME.colors.muted} style={{ flex: 1 }}>
                {STRINGS.classifieds.autoExpireNote}
              </AppText>
            </View>

            <Button
              variant="primary"
              label={STRINGS.classifieds.postListing}
              loading={submitting}
              onPress={submit}
              style={styles.submitBtn}
              leftIcon={<Ionicons name="rocket-outline" size={18} color="#fff" />}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Segmented toggle  ───────────────────────────── */

function SegmentedToggle({ value, onChange, options }) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => (
        <SegmentedOption
          key={opt.id}
          label={opt.label}
          iconName={opt.iconName}
          active={value === opt.id}
          onPress={() => { haptics.light(); onChange(opt.id); }}
        />
      ))}
    </View>
  );
}

function SegmentedOption({ label, iconName, active, onPress }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, progress]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', THEME.colors.white]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', THEME.colors.primary]
    ),
  }));

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[styles.segOpt, animStyle]}>
        {iconName && (
          <Ionicons
            name={iconName}
            size={16}
            color={active ? THEME.colors.text : THEME.colors.muted}
          />
        )}
        <AppText variant="label" color={active ? THEME.colors.text : THEME.colors.muted}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Media row  ───────────────────────────── */

function MediaRow({ media, onAdd, onRemove }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.mediaRow}
    >
      <Pressable onPress={onAdd}>
        <View style={styles.mediaEmpty}>
          <Ionicons name="camera-outline" size={24} color="#5A585A" />
          <AppText variant="caption" color={THEME.colors.muted} style={{ fontSize: 11 }}>
            Add Photos
          </AppText>
        </View>
      </Pressable>
      {media.map((m) => (
        <MediaTile key={m.id} item={m} onRemove={() => onRemove(m.id)} />
      ))}
    </ScrollView>
  );
}

function MediaTile({ item, onRemove }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.mediaTile, animStyle]}>
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} />
      <Pressable onPress={onRemove} style={styles.mediaRemove} hitSlop={4}>
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────────────────────  Field primitives  ───────────────────────────── */

function TextField({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.border}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function PriceField({ value, onChangeText }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {STRINGS.classifieds.labels.price.toUpperCase()}
      </AppText>
      <View style={[styles.input, styles.priceRow]}>
        <AppText variant="label" color={THEME.colors.muted}>₹</AppText>
        <View style={styles.priceDivider} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={THEME.colors.border}
          keyboardType="number-pad"
          style={styles.priceInput}
        />
      </View>
    </View>
  );
}

function PickerField({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const openPicker = () => {
    if (disabled) return;
    haptics.light();
    setOpen(true);
  };
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </AppText>
      <Pressable onPress={openPicker} disabled={disabled}>
        <View
          style={[
            styles.input,
            styles.pickerInput,
            disabled && { opacity: 0.4 },
          ]}
        >
          <AppText variant="label" color={value ? THEME.colors.text : THEME.colors.border}>
            {value || 'Select…'}
          </AppText>
          <Ionicons name="chevron-down" size={18} color="#5A585A" />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <AppText variant="label" style={styles.modalTitle}>{label}</AppText>
            <ScrollView>
              {options.length === 0 ? (
                <AppText variant="caption" color={THEME.colors.muted} style={{ paddingVertical: 12 }}>
                  Pick a category first.
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

function PillToggle({ label, value, options, onChange }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </AppText>
      <View style={styles.pillRow}>
        {options.map((opt) => (
          <PillOption
            key={opt}
            label={opt}
            active={value === opt}
            onPress={() => { haptics.light(); onChange(opt); }}
          />
        ))}
      </View>
    </View>
  );
}

function PillOption({ label, active, onPress }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, progress]);
  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [THEME.colors.subtle, THEME.colors.dark]
    ),
  }));
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[styles.pill, animStyle]}>
        <AppText variant="caption" color={active ? THEME.colors.white : THEME.colors.text}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

function TagsField({ tags, input, setInput, onCommit, onRemove }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name="pricetag-outline" size={12} color="#5A585A" />
        <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
          {STRINGS.classifieds.labels.tags.toUpperCase()}
        </AppText>
      </View>
      <View style={styles.tagsBox}>
        <View style={styles.tagsWrap}>
          {tags.map((t) => (
            <TagChip key={t.id} value={t.value} onRemove={() => onRemove(t.id)} />
          ))}
          <TextInput
            value={input}
            onChangeText={(v) => {
              // Comma or space commits the tag.
              if (/[,\s]$/.test(v)) {
                setInput(v.replace(/[,\s]+$/, ''));
                onCommit();
              } else {
                setInput(v);
              }
            }}
            onSubmitEditing={onCommit}
            placeholder={tags.length ? 'Add another' : 'plumber, repair, …'}
            placeholderTextColor={THEME.colors.border}
            style={styles.tagInput}
            blurOnSubmit={false}
            returnKeyType="done"
          />
        </View>
      </View>
    </View>
  );
}

function TagChip({ value, onRemove }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 240 });
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleRemove = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withTiming(0,   { duration: 120 })
    );
    setTimeout(onRemove, 200);
  };

  return (
    <Animated.View style={[styles.tagChip, style]}>
      <AppText variant="caption" style={{ fontSize: 12 }}>{value}</AppText>
      <Pressable onPress={handleRemove} hitSlop={4} style={{ marginLeft: 4 }}>
        <Ionicons name="close" size={12} color="#5A585A" />
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    gap: THEME.spacing.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.lg,
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.subtle,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segOpt: {
    flexDirection: 'row',
    gap: 6,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaRow: {
    paddingVertical: 4,
    gap: 12,
  },
  mediaEmpty: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mediaTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: THEME.colors.subtle,
    overflow: 'hidden',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldStack: { gap: THEME.spacing.lg },
  indented: { paddingLeft: 16 },

  field: { gap: 4 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.5 },

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.white,
  },
  multilineInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
  },

  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  useLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },

  tagsBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
    padding: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.subtle,
  },
  tagInput: {
    flex: 1,
    minWidth: 80,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },

  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251,190,36,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.warning,
    padding: 14,
    paddingHorizontal: 16,
  },

  submitBtn: { marginTop: THEME.spacing.sm },

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
  modalTitle: { marginBottom: THEME.spacing.md },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },
});
