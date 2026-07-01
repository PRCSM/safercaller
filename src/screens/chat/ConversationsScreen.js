import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { RowSkeleton } from '../../components/common/Skeleton';
import { THEME } from '../../constants/theme';
import { haptics } from '../../constants/animations';
import { chatService, userService } from '../../services';
import { useAuthStore } from '../../store/authStore';

const initialsFor = (name) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

export default function ConversationsScreen({ navigation }) {
  const myUid = useAuthStore((s) => s.user?.uid);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});
  const [filter, setFilter] = useState('');

  // Subscribe to conversations in real-time.
  useEffect(() => {
    if (!myUid) return;
    setLoading(true);
    const unsub = chatService.getConversations(myUid, (convos) => {
      setConversations(Array.isArray(convos) ? convos : []);
      setLoading(false);
    });
    return () => { try { unsub?.(); } catch (_) { /* ignore */ } };
  }, [myUid]);

  // For every other-participant we haven't yet seen, fetch the profile once.
  useEffect(() => {
    if (!myUid) return;
    const otherIds = new Set();
    for (const c of conversations) {
      const other = (c.participants ?? []).find((p) => p !== myUid);
      if (other && !userMap[other]) otherIds.add(other);
    }
    if (otherIds.size === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        Array.from(otherIds).map(async (uid) => {
          try {
            const profile = await userService.getUserProfile(uid);
            return [uid, profile];
          } catch (_) {
            return [uid, null];
          }
        }),
      );
      if (cancelled) return;
      setUserMap((prev) => {
        const next = { ...prev };
        for (const [uid, profile] of entries) next[uid] = profile;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [conversations, myUid, userMap]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const rows = conversations.map((c) => {
      const otherId = (c.participants ?? []).find((p) => p !== myUid);
      const other = userMap[otherId];
      const name = other?.name ?? other?.fullName ?? 'Unknown';
      return { ...c, otherId, otherName: name, otherPhoto: other?.profilePhoto };
    });
    if (!needle) return rows;
    return rows.filter((r) => r.otherName.toLowerCase().includes(needle));
  }, [conversations, userMap, myUid, filter]);

  const openChat = (row) => {
    haptics.light();
    navigation.navigate('Chat', {
      chatId: row.id,
      otherUserId: row.otherId,
      otherUserName: row.otherName,
    });
  };

  const openCompose = () => {
    haptics.light();
    navigation.getParent()?.navigate('PeopleStack');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.topBar}>
          <AppText variant="heading" style={styles.title}>Messages</AppText>
          <Pressable onPress={openCompose} hitSlop={6} style={styles.composeBtn}>
            <Ionicons name="pencil-outline" size={20} color={THEME.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Search conversations..."
            placeholderTextColor={THEME.colors.muted}
            style={styles.searchInput}
          />
          {filter.length > 0 && (
            <Pressable hitSlop={6} onPress={() => setFilter('')}>
              <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ paddingTop: 8 }}>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={8}
            renderItem={({ item }) => (
              <ConversationRow
                row={item}
                myUid={myUid}
                onPress={() => openChat(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={56} color={THEME.colors.textDisabled} style={styles.emptyIcon} />
                <AppText variant="label" style={styles.emptyTitle}>No conversations yet</AppText>
                <AppText variant="caption" color={THEME.colors.muted} style={styles.emptyHint}>
                  Search for people to start chatting.
                </AppText>
                <Button
                  variant="primary"
                  label="Find People"
                  onPress={openCompose}
                  style={styles.emptyCta}
                />
              </View>
            }
          />
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ───── Row ───── */

function ConversationRow({ row, myUid, onPress }) {
  const lastDate = toDate(row.lastAt);
  const timeAgo = lastDate
    ? formatDistanceToNowStrict(lastDate, { addSuffix: false })
    : '';
  const lastBySelf = row.lastSenderId === myUid;
  const previewRaw = row.lastMessage ?? '';
  // No per-user unread counter on chat doc yet. Heuristic: dot if the
  // other user sent the most recent message.
  const isUnread = !lastBySelf && !!row.lastMessage;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.row,
      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
    ]}>
      <View style={styles.avatar}>
        {row.otherPhoto ? (
          <Image source={{ uri: row.otherPhoto }} style={StyleSheet.absoluteFill} />
        ) : (
          <AppText variant="label" color={THEME.colors.white} style={styles.avatarInitials}>
            {initialsFor(row.otherName)}
          </AppText>
        )}
        {isUnread && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.rowBody}>
        <AppText variant="label" numberOfLines={1} style={styles.rowName}>
          {row.otherName}
        </AppText>
        <AppText
          variant="caption"
          color={THEME.colors.muted}
          numberOfLines={1}
          style={styles.rowPreview}
        >
          {lastBySelf && <AppText variant="caption" style={styles.selfPrefix}>You: </AppText>}
          {previewRaw || 'No messages yet'}
        </AppText>
      </View>

      <View style={styles.rowMeta}>
        <AppText variant="caption" color={THEME.colors.muted} style={styles.timeText}>
          {timeAgo}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 4,
    paddingBottom: THEME.spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '500' },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#9DC4F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: { fontSize: 18, fontWeight: '600' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.primary,
    borderWidth: 2,
    borderColor: THEME.colors.white,
  },

  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowPreview: { fontSize: 13 },

  rowMeta: { alignItems: 'flex-end' },
  timeText: { fontSize: 11 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: { marginBottom: 4 },
  selfPrefix: {
    fontStyle: 'italic',
    color: THEME.colors.muted,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  emptyHint: { textAlign: 'center', paddingHorizontal: 40 },
  emptyCta: { marginTop: 16, alignSelf: 'center', minWidth: 200 },
});
