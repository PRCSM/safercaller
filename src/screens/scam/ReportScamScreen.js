import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  Easing,
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
import { scamService } from '../../services';
import { toast } from '../../utils/toast';

const COUNTRY_CODE = '+91';
const MAX_PROOFS = 6;

const LOCATIONS = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune', 'Other'];
const CATEGORIES = ['Phishing', 'UPI Fraud', 'Fake Jobs', 'Romance Scam', 'Investment Fraud', 'Other'];

export default function ReportScamScreen({ navigation }) {
  const [form, setForm] = useState({
    scammerName: '',
    scammerPhone: '',
    email: '',
    location: '',
    category: '',
    website: '',
    companyName: '',
    description: '',
  });
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState([]); // [{ id, value }]
  const [proofs, setProofs] = useState([]); // [{ id, uri, mimeType, name, type }]
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  /* ─────────────────  Social link add/remove  ───────────────── */

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    haptics.light();
    setLinks((prev) => [...prev, { id: `link-${Date.now()}-${Math.random()}`, value: trimmed }]);
    setLinkInput('');
  };

  const removeLink = (id) => {
    haptics.light();
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  /* ─────────────────  Proof upload  ───────────────── */

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Photo permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (result.canceled) return;
    const a = result.assets[0];
    setProofs((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random()}`,
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
        name: a.fileName ?? 'image.jpg',
        type: a.type === 'video' ? 'video' : 'image',
      },
    ]);
    haptics.success();
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const a = result.assets[0];
    setProofs((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random()}`,
        uri: a.uri,
        mimeType: a.mimeType ?? 'application/octet-stream',
        name: a.name ?? 'document',
        type: 'document',
      },
    ]);
    haptics.success();
  };

  const addProof = () => {
    if (proofs.length >= MAX_PROOFS) {
      toast.warning(`Max ${MAX_PROOFS} files`);
      return;
    }
    Alert.alert(
      'Add proof',
      'Choose a source',
      [
        { text: 'Photo / Video', onPress: pickImage },
        { text: 'Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeProof = (id) => {
    setProofs((prev) => prev.filter((p) => p.id !== id));
  };

  /* ─────────────────  Submit  ───────────────── */

  const submit = async () => {
    if (!form.scammerName.trim() && !form.scammerPhone.trim()) {
      toast.error('Provide a name or phone number');
      haptics.error();
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        scammerName: form.scammerName.trim() || null,
        scammerPhone: form.scammerPhone.trim() ? `${COUNTRY_CODE}${form.scammerPhone.replace(/\D/g, '')}` : null,
        email: form.email.trim() || null,
        location: form.location || null,
        category: form.category || null,
        website: form.website.trim() || null,
        companyName: form.companyName.trim() || null,
        description: form.description.trim() || null,
        socialLinks: links.map((l) => l.value),
      };
      await scamService.submitScamReport(payload, proofs);
      setSubmitting(false);
      setSuccess(true);
      haptics.success();
      setTimeout(() => {
        toast.success('Report submitted', 'The scammer will be notified.');
        navigation.goBack();
      }, 800);
    } catch (err) {
      setSubmitting(false);
      toast.error('Submission failed', err?.message ?? 'Try again');
    }
  };

  /* ─────────────────  Render  ───────────────── */

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
              {STRINGS.scam.reportTitle}
            </AppText>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <StaggerBlock index={0} style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={20} color="#FBE74E" />
              <AppText variant="caption" color={THEME.colors.muted} style={{ flex: 1 }}>
                {STRINGS.scam.warningBanner}
              </AppText>
            </StaggerBlock>

            <StaggerBlock index={1}>
              <TextField
                label={STRINGS.scam.labels.scammerName}
                value={form.scammerName}
                onChangeText={(v) => setField('scammerName', v)}
                placeholder="e.g. Unknown Scammer"
              />
            </StaggerBlock>

            <StaggerBlock index={2}>
              <PhoneField
                value={form.scammerPhone}
                onChangeText={(v) => setField('scammerPhone', v.replace(/\D/g, '').slice(0, 12))}
              />
            </StaggerBlock>

            <StaggerBlock index={3}>
              <TextField
                label={STRINGS.scam.labels.email}
                value={form.email}
                onChangeText={(v) => setField('email', v)}
                placeholder="fake@scammer.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </StaggerBlock>

            <StaggerBlock index={4}>
              <PickerField
                label={STRINGS.scam.labels.location}
                value={form.location}
                options={LOCATIONS}
                onChange={(v) => setField('location', v)}
              />
            </StaggerBlock>

            <StaggerBlock index={5}>
              <PickerField
                label={STRINGS.scam.labels.category}
                value={form.category}
                options={CATEGORIES}
                onChange={(v) => setField('category', v)}
              />
            </StaggerBlock>

            <StaggerBlock index={6}>
              <TextField
                label="Website"
                value={form.website}
                onChangeText={(v) => setField('website', v)}
                placeholder="scam-site.com"
                autoCapitalize="none"
              />
            </StaggerBlock>

            <StaggerBlock index={7}>
              <TextField
                label="Company Name"
                value={form.companyName}
                onChangeText={(v) => setField('companyName', v)}
                placeholder="Fake Co."
              />
            </StaggerBlock>

            <StaggerBlock index={8} style={styles.section}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="link-outline" size={12} color="#5A585A" />
                <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
                  {STRINGS.scam.labels.socialLinks.toUpperCase()}
                </AppText>
              </View>
              <View style={styles.linkRow}>
                <TextInput
                  value={linkInput}
                  onChangeText={setLinkInput}
                  placeholder="instagram.com/handle"
                  placeholderTextColor={THEME.colors.border}
                  style={[styles.input, { flex: 1 }]}
                  autoCapitalize="none"
                  onSubmitEditing={addLink}
                />
                <Pressable onPress={addLink} hitSlop={6}>
                  <View style={styles.addPill}>
                    <AppText variant="caption">{STRINGS.common.addPlus}</AppText>
                  </View>
                </Pressable>
              </View>
              {links.length > 0 && (
                <View style={styles.chipsWrap}>
                  {links.map((l) => (
                    <SocialLinkChip key={l.id} value={l.value} onRemove={() => removeLink(l.id)} />
                  ))}
                </View>
              )}
            </StaggerBlock>

            <StaggerBlock index={9}>
              <TextField
                label={STRINGS.scam.labels.description}
                value={form.description}
                onChangeText={(v) => setField('description', v)}
                placeholder={STRINGS.scam.descPlaceholder}
                multiline
              />
            </StaggerBlock>

            <StaggerBlock index={10} style={styles.section}>
              <AppText variant="label">{STRINGS.scam.uploadHeading}</AppText>
              <AppText variant="caption" color={THEME.colors.muted}>
                {STRINGS.scam.uploadSub}
              </AppText>
              <View style={styles.proofGrid}>
                {Array.from({ length: MAX_PROOFS }).map((_, i) => {
                  const proof = proofs[i];
                  if (proof) {
                    return <ProofTile key={proof.id} proof={proof} onRemove={() => removeProof(proof.id)} />;
                  }
                  return (
                    <Pressable key={`empty-${i}`} onPress={addProof}>
                      <View style={styles.emptySlot}>
                        <Ionicons name="camera-outline" size={22} color="#5A585A" />
                        <Ionicons name="add" size={20} color={THEME.colors.border} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.uploadTypesHint}>
                {STRINGS.scam.uploadTypes}
              </AppText>
            </StaggerBlock>

            <StaggerBlock index={11} style={styles.actions}>
              <Button
                variant="primary"
                label={STRINGS.scam.submit}
                loading={submitting}
                showSuccess={success}
                disabled={success}
                onPress={submit}
                leftIcon={<Ionicons name="document-text-outline" size={18} color="#fff" />}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
              />
              <Pressable onPress={() => navigation.goBack()} hitSlop={6} disabled={submitting}>
                <AppText variant="caption" color={THEME.colors.muted} style={styles.cancel}>
                  {STRINGS.common.cancel}
                </AppText>
              </Pressable>
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

/* ─────────────────────────────  Text field  ───────────────────────────── */

function TextField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline }) {
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
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

/* ─────────────────────────────  Phone field with +91 prefix  ───────────────────────────── */

function PhoneField({ value, onChangeText }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {STRINGS.scam.labels.phoneNumber.toUpperCase()}
      </AppText>
      <View style={[styles.input, styles.phoneRow]}>
        <AppText variant="label" color={THEME.colors.muted}>{COUNTRY_CODE}</AppText>
        <View style={styles.phoneDivider} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="9988776655"
          placeholderTextColor={THEME.colors.border}
          keyboardType="phone-pad"
          style={styles.phoneInput}
        />
      </View>
    </View>
  );
}

/* ─────────────────────────────  Picker field + sheet  ───────────────────────────── */

function PickerField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </AppText>
      <Pressable
        onPress={() => { haptics.light(); setOpen(true); }}
        style={[styles.input, styles.pickerInput]}
      >
        <AppText variant="label" color={value ? THEME.colors.text : THEME.colors.border}>
          {value || 'Select…'}
        </AppText>
        <Ionicons name="chevron-down" size={18} color="#5A585A" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <AppText variant="label" style={styles.modalTitle}>{label}</AppText>
            <ScrollView>
              {options.map((opt) => (
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

/* ─────────────────────────────  Social link chip (scale 0→1 spring)  ───────────────────────────── */

function SocialLinkChip({ value, onRemove }) {
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
    <Animated.View style={[styles.linkChip, style]}>
      <AppText variant="caption" numberOfLines={1} style={{ maxWidth: 160 }}>
        {value}
      </AppText>
      <Pressable onPress={handleRemove} hitSlop={6} style={{ marginLeft: 4 }}>
        <Ionicons name="close" size={14} color="#5A585A" />
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────────────────────  Proof tile  ───────────────────────────── */

function ProofTile({ proof, onRemove }) {
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    checkScale.value = withDelay(
      150,
      withSequence(
        withSpring(1.2, { damping: 10, stiffness: 260 }),
        withSpring(1,   { damping: 14, stiffness: 220 })
      )
    );
  }, [scale, checkScale]);

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Pressable onLongPress={onRemove} delayLongPress={350}>
      <Animated.View style={[styles.proofTile, tileStyle]}>
        {proof.type === 'image' ? (
          <Image source={{ uri: proof.uri }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.proofDocBody}>
            <Ionicons
              name={proof.type === 'video' ? 'videocam-outline' : 'document-outline'}
              size={28}
              color="#fff"
            />
            <AppText variant="caption" numberOfLines={1} color={THEME.colors.muted} style={{ maxWidth: 80 }}>
              {proof.name}
            </AppText>
          </View>
        )}
        <Animated.View style={[styles.proofCheck, checkStyle]}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </Animated.View>
      </Animated.View>
    </Pressable>
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
    marginRight: 24,
  },
  body: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.md,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251,190,36,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.warning,
    padding: 12,
  },
  warningEmoji: {
    fontSize: 20,
  },

  field: { gap: 4 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.5 },
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
  multilineInput: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
  },

  section: { gap: THEME.spacing.sm },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  proofGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  emptySlot: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  emptySlotEmoji: {
    fontSize: 18,
  },
  proofTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: THEME.colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  proofDocBody: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  proofCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTypesHint: {
    textAlign: 'center',
    marginTop: 4,
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
  modalTitle: { marginBottom: THEME.spacing.md },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },

  actions: {
    marginTop: THEME.spacing.md,
    gap: 12,
  },
  cancel: { textAlign: 'center' },
});
