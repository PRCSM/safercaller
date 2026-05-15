import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
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
import { haptics, springs } from '../../constants/animations';
import { peopleService } from '../../services';
import { usePeopleStore } from '../../store/peopleStore';
import { toast } from '../../utils/toast';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITALS = ['Single', 'Married', 'Divorced', 'Widowed'];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const PROFESSIONS = [
  'Software Engineer', 'Teacher', 'Doctor', 'Accountant', 'Designer',
  'Sales Manager', 'Plumber', 'Electrician', 'Driver', 'Photographer',
];

const EMPTY_FILTERS = {
  gender: '',
  maritalStatus: '',
  religion: '',
  profession: '',
  ageMin: '',
  ageMax: '',
  incomeMin: '',
  incomeMax: '',
  verifiedOnly: false,
};

const ringColorFor = (score) => {
  if (score >= 700) return THEME.colors.success;
  if (score >= 400) return THEME.colors.warning;
  return THEME.colors.coral;
};

export default function PeopleSearchScreen({ navigation }) {
  const results        = usePeopleStore((s) => s.searchResults);
  const setResults     = usePeopleStore((s) => s.setResults);
  const isLoading      = usePeopleStore((s) => s.isLoading);
  const setLoading     = usePeopleStore((s) => s.setLoading);
  const storeFilters   = usePeopleStore((s) => s.filters);
  const setStoreFilters = usePeopleStore((s) => s.setFilters);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [committed, setCommitted] = useState(storeFilters && Object.keys(storeFilters).length ? storeFilters : EMPTY_FILTERS);
  const [draft, setDraft] = useState(committed);

  /* Debounce search query — 400 ms */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  /* Refetch on debounced query or committed-filter change */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const filters = { ...committed, name: debouncedQuery || undefined };
        Object.keys(filters).forEach((k) => {
          if (filters[k] === '' || filters[k] == null) delete filters[k];
        });
        if (filters.ageMin) filters.ageMin = Number(filters.ageMin);
        if (filters.ageMax) filters.ageMax = Number(filters.ageMax);
        if (filters.incomeMin) filters.incomeMin = Number(filters.incomeMin);
        if (filters.incomeMax) filters.incomeMax = Number(filters.incomeMax);

        const { results: list } = await peopleService.searchPeople(filters);
        if (!cancelled) {
          setResults(list);
          setStoreFilters(committed);
        }
      } catch (err) {
        if (!cancelled) toast.error('Search failed', err?.message ?? '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, committed, setResults, setLoading, setStoreFilters]);

  const applyDraft = () => {
    haptics.success();
    setCommitted(draft);
    setPanelOpen(false);
  };
  const clearDraft = () => setDraft(EMPTY_FILTERS);

  const activeChips = useMemo(() => {
    const out = [];
    if (committed.gender)        out.push({ key: 'gender',        label: committed.gender });
    if (committed.maritalStatus) out.push({ key: 'maritalStatus', label: committed.maritalStatus });
    if (committed.religion)      out.push({ key: 'religion',      label: committed.religion });
    if (committed.profession)    out.push({ key: 'profession',    label: committed.profession });
    if (committed.ageMin || committed.ageMax) {
      out.push({ key: 'age', label: `Age ${committed.ageMin || '?'}–${committed.ageMax || '?'}` });
    }
    if (committed.incomeMin || committed.incomeMax) {
      out.push({ key: 'income', label: `₹${committed.incomeMin || '?'}–${committed.incomeMax || '?'}` });
    }
    if (committed.verifiedOnly) out.push({ key: 'verifiedOnly', label: 'Verified only' });
    return out;
  }, [committed]);

  const onClearChip = (chip) => {
    haptics.light();
    if (chip.key === 'age') {
      const next = { ...committed, ageMin: '', ageMax: '' };
      setCommitted(next); setDraft(next); return;
    }
    if (chip.key === 'income') {
      const next = { ...committed, incomeMin: '', incomeMax: '' };
      setCommitted(next); setDraft(next); return;
    }
    const next = { ...committed, [chip.key]: chip.key === 'verifiedOnly' ? false : '' };
    setCommitted(next); setDraft(next);
  };

  const openChat = (person) =>
    navigation.getParent()?.getParent()?.navigate('ChatStack', {
      screen: 'Chat',
      params: { otherUser: person },
    }) ?? navigation.navigate('ChatStack');

  const onCall = (person) =>
    toast.info('Call requires opt-in', `${person.name ?? 'User'} hasn't shared their phone publicly.`);

  const openProfile = (person) =>
    navigation.navigate('ProfileView', { userId: person.uid, person });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.header}>
          <AppText variant="heading">People Search</AppText>
        </View>

        <SearchInput value={query} onChange={setQuery} />

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => { haptics.light(); setPanelOpen((p) => !p); }}
            style={styles.filterBtn}
          >
            <AppText variant="caption">Filters {panelOpen ? '▴' : '▾'}</AppText>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {activeChips.map((c) => (
              <ActiveChip key={c.key} label={c.label} onRemove={() => onClearChip(c)} />
            ))}
          </ScrollView>
        </View>

        <FilterPanel
          open={panelOpen}
          draft={draft}
          setDraft={setDraft}
          onApply={applyDraft}
          onClear={clearDraft}
        />

        <View style={styles.countRow}>
          <AppText variant="caption" color={THEME.colors.muted}>
            {isLoading ? 'Searching…' : `Showing ${results.length} results`}
          </AppText>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          renderItem={({ item, index }) => (
            <PersonCard
              person={item}
              index={index}
              onChat={() => openChat(item)}
              onCall={() => onCall(item)}
              onPress={() => openProfile(item)}
            />
          )}
          ListEmptyComponent={
            !isLoading && (
              <View style={styles.emptyWrap}>
                <AppText variant="caption" color={THEME.colors.muted}>
                  No people match these filters.
                </AppText>
              </View>
            )
          }
        />
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Search input  ───────────────────────────── */

function SearchInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, progress]);
  const animStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [THEME.colors.dark, THEME.colors.primary]
    ),
  }));
  return (
    <Animated.View style={[styles.searchBar, animStyle]}>
      <AppText variant="label" color={THEME.colors.muted} style={{ marginRight: 8 }}>🔍</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search by name, profession…"
        placeholderTextColor={THEME.colors.muted}
        style={styles.searchInput}
        autoCapitalize="words"
      />
    </Animated.View>
  );
}

/* ─────────────────────────────  Filter panel  ───────────────────────────── */

function FilterPanel({ open, draft, setDraft, onApply, onClear }) {
  const HEIGHT = 600;
  const heightProgress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    heightProgress.value = withSpring(open ? 1 : 0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(open ? 1 : 0, { duration: 250 });
  }, [open, heightProgress, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    maxHeight: heightProgress.value * HEIGHT,
    opacity: opacity.value,
  }));

  const setField = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  return (
    <Animated.View style={[styles.panelWrap, animStyle]}>
      <View style={styles.panel}>
        <PickerField
          label="Gender"
          value={draft.gender}
          options={GENDERS}
          onChange={(v) => setField('gender', v)}
        />

        <View style={styles.rangeRow}>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.rangeLabel}>
            AGE RANGE
          </AppText>
          <View style={styles.rangeInputs}>
            <TextInput
              value={String(draft.ageMin ?? '')}
              onChangeText={(v) => setField('ageMin', v.replace(/[^0-9]/g, ''))}
              placeholder="Min"
              placeholderTextColor={THEME.colors.border}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
            <AppText variant="caption" color={THEME.colors.muted}>—</AppText>
            <TextInput
              value={String(draft.ageMax ?? '')}
              onChangeText={(v) => setField('ageMax', v.replace(/[^0-9]/g, ''))}
              placeholder="Max"
              placeholderTextColor={THEME.colors.border}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <PickerField label="Marital Status" value={draft.maritalStatus} options={MARITALS} onChange={(v) => setField('maritalStatus', v)} />
        <PickerField label="Religion" value={draft.religion} options={RELIGIONS} onChange={(v) => setField('religion', v)} />
        <PickerField label="Profession" value={draft.profession} options={PROFESSIONS} onChange={(v) => setField('profession', v)} />

        <View style={styles.rangeRow}>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.rangeLabel}>
            YEARLY INCOME (₹)
          </AppText>
          <View style={styles.rangeInputs}>
            <TextInput
              value={String(draft.incomeMin ?? '')}
              onChangeText={(v) => setField('incomeMin', v.replace(/[^0-9]/g, ''))}
              placeholder="Min"
              placeholderTextColor={THEME.colors.border}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
            <AppText variant="caption" color={THEME.colors.muted}>—</AppText>
            <TextInput
              value={String(draft.incomeMax ?? '')}
              onChangeText={(v) => setField('incomeMax', v.replace(/[^0-9]/g, ''))}
              placeholder="Max"
              placeholderTextColor={THEME.colors.border}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <View style={styles.verifyRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Verified only</AppText>
            <AppText variant="caption" color={THEME.colors.muted}>
              Liveness + ID + Thumbprint
            </AppText>
          </View>
          <Switch
            value={!!draft.verifiedOnly}
            onValueChange={(v) => { haptics.light(); setField('verifiedOnly', v); }}
            trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
            thumbColor={THEME.colors.white}
          />
        </View>

        <View style={styles.panelActions}>
          <Pressable onPress={onClear} hitSlop={6}>
            <AppText variant="caption" color={THEME.colors.muted}>Clear</AppText>
          </Pressable>
          <Button
            variant="primary"
            size="small"
            label="Apply Filters →"
            onPress={onApply}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

/* ─────────────────────────────  PickerField  ───────────────────────────── */

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
          {value || 'Any'}
        </AppText>
        <AppText variant="label" color={THEME.colors.muted}>▾</AppText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <AppText variant="label" style={styles.modalTitle}>{label}</AppText>
            <ScrollView>
              <Pressable
                onPress={() => { onChange(''); setOpen(false); }}
                style={styles.modalOption}
              >
                <AppText variant="label" color={THEME.colors.muted}>Any</AppText>
                {!value && <AppText variant="label" color={THEME.colors.primary}>✓</AppText>}
              </Pressable>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  style={styles.modalOption}
                >
                  <AppText variant="label" color={opt === value ? THEME.colors.primary : THEME.colors.text}>
                    {opt}
                  </AppText>
                  {opt === value && <AppText variant="label" color={THEME.colors.primary}>✓</AppText>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─────────────────────────────  Active chip  ───────────────────────────── */

function ActiveChip({ label, onRemove }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 240 });
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handleRemove = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 60 }),
      withTiming(0,   { duration: 140 })
    );
    setTimeout(onRemove, 220);
  };
  return (
    <Animated.View style={[styles.activeChip, animStyle]}>
      <AppText variant="caption" color={THEME.colors.white} style={{ fontSize: 11 }}>
        {label}
      </AppText>
      <Pressable onPress={handleRemove} hitSlop={4}>
        <AppText variant="caption" color={THEME.colors.white}>  ✕</AppText>
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────────────────────  Person card  ───────────────────────────── */

const RING_SIZE = 44;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function PersonCard({ person, index, onChat, onCall, onPress }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);

  const score = person.reputationScore ?? 0;
  const ringColor = ringColorFor(score);

  useEffect(() => {
    const delay = Math.min(index, 12) * 60;
    ty.value = withDelay(delay, withSpring(0, springs.default));
    opacity.value = withDelay(delay, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    ringProgress.value = withDelay(
      delay + 200,
      withTiming(Math.min(1, score / 1000), { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [index, score, ty, opacity, ringProgress]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - ringProgress.value),
  }));

  const verified = person.verified ?? {};
  const initials = (person.name ?? '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const lowTrust = score < 200;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(157,196,245,0.4)' }]}>
            <AppText variant="label">{initials}</AppText>
          </View>

          <View style={{ flex: 1 }}>
            <AppText variant="label" numberOfLines={1}>{person.name}</AppText>
            <AppText variant="caption" color={THEME.colors.muted} numberOfLines={1}>
              {person.profession ?? 'No profession'}{person.company ? ` · ${person.company}` : ''}
            </AppText>
            <AppText variant="caption" color={THEME.colors.muted}>
              {person.location ?? 'Unknown'}
            </AppText>

            <View style={styles.verifyChips}>
              {verified.idProof && <VerifyChip label="✓ ID" />}
              {verified.liveness && <VerifyChip label="✓ Liveness" />}
            </View>
          </View>

          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={THEME.colors.subtle}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                animatedProps={ringProps}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <AppText variant="caption" style={{ fontSize: 10 }}>{score}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {lowTrust ? (
            <AppText variant="caption" color={THEME.colors.coral}>
              🔴 Low trust score
            </AppText>
          ) : (
            <>
              <Button
                variant="secondary"
                size="small"
                label="Chat"
                onPress={onChat}
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                size="small"
                label="Call"
                onPress={onCall}
                style={{ flex: 1 }}
              />
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function VerifyChip({ label }) {
  return (
    <View style={styles.verifyChip}>
      <AppText variant="caption" style={{ fontSize: 9 }}>{label}</AppText>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    marginHorizontal: THEME.spacing.lg,
    paddingHorizontal: 24,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: THEME.colors.dark,
    backgroundColor: THEME.colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.text,
    paddingVertical: 0,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    gap: 8,
  },
  filterBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.dark,
  },

  panelWrap: {
    marginHorizontal: THEME.spacing.lg,
    overflow: 'hidden',
  },
  panel: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    gap: 16,
  },
  field: { gap: 4 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.5 },
  rangeRow: { gap: 4 },
  rangeLabel: { fontSize: 10, letterSpacing: 0.5 },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },

  countRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },

  list: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: 12,
  },

  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  verifyChip: {
    backgroundColor: THEME.colors.subtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: THEME.spacing.huge,
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
});
