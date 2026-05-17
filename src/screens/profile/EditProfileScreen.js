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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';
import { userService, functionsService } from '../../services';
import { uploadFile } from '../../services/storageService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

const GENDERS    = ['Male', 'Female', 'Other', 'Prefer not to say'];
const LOCATIONS  = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune'];
const RELIGIONS  = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const MARITALS   = ['Single', 'Married', 'Divorced', 'Widowed'];
const FALLBACK_PROFESSIONS = [
  'Software Engineer', 'Teacher', 'Doctor', 'Accountant', 'Designer',
  'Sales Manager', 'Plumber', 'Electrician', 'Driver', 'Photographer',
];

const formatDateISO = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const initialsFor = (name) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function EditProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    dob: profile?.dob ?? '',
    gender: profile?.gender ?? '',
    location: profile?.location ?? '',
    religion: profile?.religion ?? '',
    maritalStatus: profile?.maritalStatus ?? '',
    profession: profile?.profession ?? '',
    subProfession: profile?.subProfession ?? '',
    yearlyIncome: profile?.yearlyIncome ? String(profile.yearlyIncome) : '',
  });
  const [photoUri, setPhotoUri] = useState(profile?.profilePhoto ?? null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [goOnline, setGoOnline] = useState(profile?.goOnline ?? true);

  const [professions, setProfessions] = useState(FALLBACK_PROFESSIONS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch profession list once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await functionsService.getAIProfessions();
      if (cancelled) return;
      if (Array.isArray(list) && list.length > 0) setProfessions(list);
    })();
    return () => { cancelled = true; };
  }, []);

  // Unsaved-changes guard.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || saving) return;
      e.preventDefault();
      Alert.alert('⚠️ Unsaved changes', 'Discard changes and go back?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsub;
  }, [navigation, dirty, saving]);

  const setField = (k, v) => {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'profession' && prev.profession !== v) next.subProfession = '';
      return next;
    });
    setDirty(true);
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Photo permission required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // FIX: MediaTypeOptions deprecated
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        haptics.success();
        setPhotoUri(result.assets[0].uri);
        setPhotoChanged(true);
        setDirty(true);
      }
    } catch (err) {
      toast.error('Could not open photo library', err?.message ?? '');
    }
  };

  const onSave = async () => {
    if (!user?.uid) return;
    if (!form.name.trim()) {
      toast.error('Name is required');
      haptics.error();
      return;
    }
    setSaving(true);
    try {
      const changes = {
        ...form,
        goOnline,
        yearlyIncome: form.yearlyIncome ? Number(form.yearlyIncome) : null,
      };

      if (photoChanged && photoUri) {
        const url = await uploadFile(`profilePhotos/${user.uid}/avatar.jpg`, photoUri, 'image/jpeg');
        changes.profilePhoto = url;
      }

      await userService.updateUserProfile(user.uid, changes);
      setProfile({ ...profile, ...changes });
      setDirty(false);
      haptics.success();
      toast.success('Profile updated');
      navigation.goBack();
    } catch (err) {
      toast.error('Could not save', err?.message ?? '');
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#000" />
            </Pressable>
            <AppText variant="label" style={styles.topTitle}>Edit Profile</AppText>
            <Button
              variant="primary"
              size="small"
              label={saving ? 'Saving…' : 'Save'}
              onPress={onSave}
              disabled={saving}
              style={styles.saveBtn}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.photoWrap}>
              <Pressable onPress={pickPhoto}>
                <View style={styles.photoCircle}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <AppText variant="heading" color={THEME.colors.white} style={styles.photoInitials}>
                      {initialsFor(form.name)}
                    </AppText>
                  )}
                </View>
              </Pressable>
              <Pressable onPress={pickPhoto}>
                <View style={styles.changePhotoRow}>
                  <Ionicons name="camera-outline" size={14} color={THEME.colors.primary} />
                  <AppText variant="caption" color={THEME.colors.primary} style={styles.changePhoto}>
                    Change Photo
                  </AppText>
                </View>
              </Pressable>
            </View>

            <FloatingTextField
              label="Full Name *"
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="Your full name"
            />
            <FloatingDateField
              label="Date of Birth"
              value={form.dob}
              onChange={(v) => setField('dob', v)}
            />
            <PickerField
              label="Gender"
              value={form.gender}
              options={GENDERS}
              onChange={(v) => setField('gender', v)}
            />
            <PickerField
              label="Location"
              value={form.location}
              options={LOCATIONS}
              onChange={(v) => setField('location', v)}
            />
            <PickerField
              label="Religion"
              value={form.religion}
              options={RELIGIONS}
              onChange={(v) => setField('religion', v)}
            />
            <PickerField
              label="Marital Status"
              value={form.maritalStatus}
              options={MARITALS}
              onChange={(v) => setField('maritalStatus', v)}
            />
            <PickerField
              label="Profession"
              value={form.profession}
              options={professions}
              onChange={(v) => setField('profession', v)}
            />
            <FloatingTextField
              label="Sub-Profession"
              value={form.subProfession}
              onChangeText={(v) => setField('subProfession', v)}
              placeholder="e.g. Backend"
            />
            <FloatingTextField
              label="Yearly Income (₹)"
              value={form.yearlyIncome}
              onChangeText={(v) => setField('yearlyIncome', v.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 600000"
              keyboardType="number-pad"
            />

            <View style={styles.goOnlineCard}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">Go Online</AppText>
                <AppText variant="caption" color={THEME.colors.muted}>
                  Show profile in People Search
                </AppText>
              </View>
              <Switch
                value={goOnline}
                onValueChange={(v) => { haptics.light(); setGoOnline(v); setDirty(true); }}
                trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
                thumbColor={THEME.colors.white}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ───── Floating text field ───── */

function FloatingTextField({ label, value, onChangeText, placeholder, keyboardType }) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || !!value;
  return (
    <View style={styles.field}>
      <AppText
        variant="caption"
        color={focused ? THEME.colors.primary : THEME.colors.muted}
        style={[styles.fieldLabel, isFloating && styles.fieldLabelFloating]}
      >
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={isFloating ? placeholder : ''}
        placeholderTextColor={THEME.colors.border}
        keyboardType={keyboardType}
        style={[styles.fieldInput, { borderColor: focused ? THEME.colors.primary : THEME.colors.border }]}
      />
    </View>
  );
}

/* ───── Floating date field ───── */

function FloatingDateField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  const initialDate = value ? new Date(value) : new Date(2000, 0, 1);

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event?.type === 'dismissed') return;
    if (selected) onChange(formatDateISO(selected));
  };

  return (
    <View style={styles.field}>
      <AppText
        variant="caption"
        color={THEME.colors.muted}
        style={[styles.fieldLabel, !!value && styles.fieldLabelFloating]}
      >
        {label}
      </AppText>
      <Pressable onPress={() => { haptics.light(); setShow(true); }}>
        <View style={[styles.fieldInput, styles.pickerInput]}>
          <AppText variant="label" color={value ? THEME.colors.text : 'transparent'}>
            {value || '—'}
          </AppText>
          <Ionicons name="calendar-outline" size={18} color="#5A585A" />
        </View>
      </Pressable>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={initialDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShow(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <AppText variant="label">{label}</AppText>
                <Pressable onPress={() => setShow(false)}>
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

/* ───── Picker field ───── */

function PickerField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <AppText
        variant="caption"
        color={open ? THEME.colors.primary : THEME.colors.muted}
        style={[styles.fieldLabel, (!!value || open) && styles.fieldLabelFloating]}
      >
        {label}
      </AppText>
      <Pressable onPress={() => { haptics.light(); setOpen(true); }}>
        <View style={[styles.fieldInput, styles.pickerInput, { borderColor: open ? THEME.colors.primary : THEME.colors.border }]}>
          <AppText variant="label" color={value ? THEME.colors.text : 'transparent'}>
            {value || '—'}
          </AppText>
          <Ionicons name="chevron-down" size={18} color="#5A585A" />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
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
  saveBtn: { height: 36, paddingHorizontal: 16, borderRadius: 35, minWidth: 80 },

  scroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 40,
    gap: 16,
  },

  photoWrap: { alignItems: 'center', gap: 6, marginTop: 8 },
  photoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#9DC4F5',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  photoInitials: { fontSize: 28 },
  changePhoto: {},
  changePhotoRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  field: { position: 'relative' },
  fieldLabel: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 14,
    zIndex: 1,
  },
  fieldLabelFloating: {
    top: -8,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: THEME.colors.background,
    fontSize: 12,
  },
  fieldInput: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.white,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  goOnlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
    gap: THEME.spacing.md,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { marginBottom: 12 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
  },
});
