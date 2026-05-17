import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { formatDistanceToNowStrict } from 'date-fns';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';
import { haptics, springs } from '../../constants/animations';
import { chatService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { mockPeople } from '../../services/mock/mockData';
import { toast } from '../../utils/toast';

export default function ChatScreen({ navigation, route }) {
  const myUid = useAuthStore((s) => s.user?.uid) ?? 'dev-uid-001';
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setStoreMessages = useChatStore((s) => s.setMessages);

  // Resolve other user — from params first, otherwise fall back to mock.
  const otherUser =
    route?.params?.otherUser ?? route?.params?.user ?? mockPeople[0];
  const otherUserId = route?.params?.otherUserId ?? otherUser?.uid ?? 'u2';
  const otherUserName = route?.params?.otherUserName ?? otherUser?.name ?? 'Rahul Kumar';
  const chatId =
    route?.params?.chatId ?? chatService.getChatId(myUid, otherUserId);
  const listingContext = route?.params?.listing ?? null;

  /* ─────────────────  Messages: subscription + optimistic send  ───────────────── */

  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    setActiveChat(chatId);
    const unsub = chatService.getMessages(chatId, (incoming) => {
      // Merge by id — keep optimistic locals not yet echoed by the snapshot.
      setMessages((prev) => {
        const byId = new Map();
        incoming.forEach((m) => byId.set(m.id, m));
        prev.forEach((m) => { if (!byId.has(m.id)) byId.set(m.id, m); });
        const merged = Array.from(byId.values());
        merged.sort((a, b) => {
          const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return aT - bT;
        });
        setStoreMessages(chatId, merged);
        return merged;
      });
    });
    return () => {
      setActiveChat(null);
      if (typeof unsub === 'function') unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  /* markAsRead on focus */
  useFocusEffect(
    useCallback(() => {
      chatService.markAsRead(chatId, myUid).catch(() => {});
    }, [chatId, myUid])
  );

  /* ─────────────────  Composer  ───────────────── */

  const [draft, setDraft] = useState('');
  const [showTyping, setShowTyping] = useState(true);

  // Hide demo typing indicator after 2.5 s — feels alive on first open.
  useEffect(() => {
    const t = setTimeout(() => setShowTyping(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const optimisticAppend = (msg) =>
    setMessages((prev) => [...prev, msg]);

  const sendText = async () => {
    const text = draft.trim();
    if (!text) return;
    const optimisticId = `local-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      senderId: myUid,
      receiverId: otherUserId,
      text,
      read: false,
      createdAt: new Date(),
    };
    optimisticAppend(optimistic);
    setDraft('');
    haptics.light();
    try {
      const realId = await chatService.sendMessage(chatId, myUid, otherUserId, text);
      // Replace optimistic id with the persisted one so the snapshot dedupes.
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: realId ?? m.id } : m))
      );
    } catch (err) {
      toast.error('Send failed', err?.message ?? '');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const sendAttachment = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Photo permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // FIX: MediaTypeOptions deprecated
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const optimisticId = `local-${Date.now()}`;
    optimisticAppend({
      id: optimisticId,
      senderId: myUid,
      receiverId: otherUserId,
      text: null,
      mediaUrl: uri,
      mediaType: 'image/jpeg',
      read: false,
      createdAt: new Date(),
    });
    haptics.light();
    try {
      const realId = await chatService.sendMessage(chatId, myUid, otherUserId, null, uri);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: realId ?? m.id } : m))
      );
    } catch (err) {
      toast.error('Could not send image', err?.message ?? '');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const showKebabActions = () => {
    haptics.medium();
    Alert.alert(
      otherUserName,
      undefined,
      [
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.blockUser(myUid, otherUserId);
              toast.success('User blocked');
              navigation.goBack();
            } catch (err) {
              toast.error('Could not block', err?.message ?? '');
            }
          },
        },
        { text: 'Report', onPress: () => toast.info('Report flow coming soon') },
        {
          text: 'Delete Conversation',
          style: 'destructive',
          onPress: () => {
            toast.info('Delete conversation coming soon');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /* ─────────────────  Image lightbox state  ───────────────── */

  const [lightboxUri, setLightboxUri] = useState(null);

  /* ─────────────────  Render  ───────────────── */

  // Inverted FlatList: data is rendered bottom-to-top, so we pass
  // newest-first. Each message keeps its semantic order via createdAt.
  const inverted = messages.slice().reverse();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar
        name={otherUserName}
        score={otherUser?.reputationScore ?? 847}
        verified={otherUser?.verified}
        onBack={() => navigation.goBack()}
        onCall={() =>
          toast.info('Call requires opt-in', `${otherUserName} hasn't shared their phone publicly.`)
        }
        onKebab={showKebabActions}
      />

      {!!listingContext && <ContextBanner listing={listingContext} />}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={inverted}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={styles.list}
          removeClippedSubviews
          maxToRenderPerBatch={12}
          windowSize={7}
          initialNumToRender={15}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              myUid={myUid}
              onImagePress={(uri) => setLightboxUri(uri)}
            />
          )}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
        />

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={sendText}
          onAttach={sendAttachment}
        />
      </KeyboardAvoidingView>

      <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Top bar  ───────────────────────────── */

function TopBar({ name, score, verified, onBack, onCall, onKebab }) {
  const isVerified = verified?.liveness && verified?.idProof;
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.topBack}>
        <Ionicons name="arrow-back" size={22} color="#000" />
      </Pressable>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.nameRow}>
          <AppText variant="label" numberOfLines={1} style={styles.topName}>{name}</AppText>
          <View style={styles.onlineDot} />
          <AppText variant="caption" color={THEME.colors.primary} style={{ fontSize: 11 }}>
            Online
          </AppText>
        </View>
        <View style={styles.scoreRow}>
          <AppText variant="caption" color={THEME.colors.muted} style={{ fontSize: 11 }}>
            Score {score}
          </AppText>
          {isVerified && (
            <>
              <AppText variant="caption" color={THEME.colors.muted} style={{ fontSize: 11 }}>·</AppText>
              <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
              <AppText variant="caption" color={THEME.colors.muted} style={{ fontSize: 11 }}>Verified</AppText>
            </>
          )}
        </View>
      </View>
      <Pressable onPress={onCall} hitSlop={6} style={styles.topIcon}>
        <Ionicons name="call" size={20} color="#000" />
      </Pressable>
      <Pressable onPress={onKebab} hitSlop={6} style={styles.topIcon}>
        <Ionicons name="ellipsis-vertical" size={20} color="#000" />
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────  Classifieds context banner  ───────────────────────────── */

function ContextBanner({ listing }) {
  const maxH = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    maxH.value = withSpring(64, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 250 });
    const collapse = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      maxH.value = withTiming(0, { duration: 250 });
    }, 4000);
    return () => clearTimeout(collapse);
  }, [maxH, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    maxHeight: maxH.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.contextBanner, animStyle]}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={THEME.colors.muted} style={{ fontSize: 11 }}>
          Re:
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {listing?.title ?? 'Listing'}
        </AppText>
      </View>
      <View style={styles.contextThumb}>
        {listing?.mediaUrls?.[0] ? (
          <Image source={{ uri: listing.mediaUrls[0] }} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
    </Animated.View>
  );
}

/* ─────────────────────────────  Message bubble  ───────────────────────────── */

function MessageBubble({ msg, myUid, onImagePress }) {
  const isMine = msg.senderId === myUid;
  const tx = useSharedValue(isMine ? 0 : -20);
  const ty = useSharedValue(isMine ? 20 : 0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    tx.value = withSpring(0, { damping: 16, stiffness: 220 });
    ty.value = withSpring(0, { damping: 16, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [tx, ty, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  const timeStr = msg.createdAt
    ? formatDistanceToNowStrict(
        msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt?.toMillis?.() ?? msg.createdAt),
        { addSuffix: false }
      )
    : '';

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        { justifyContent: isMine ? 'flex-end' : 'flex-start' },
        animStyle,
      ]}
    >
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {msg.mediaUrl ? (
          <Pressable onPress={() => onImagePress(msg.mediaUrl)}>
            <Image source={{ uri: msg.mediaUrl }} style={styles.bubbleImage} />
          </Pressable>
        ) : null}
        {!!msg.text && (
          <AppText
            variant="caption"
            color={isMine ? THEME.colors.white : THEME.colors.text}
            style={[styles.bubbleText, !!msg.mediaUrl && { marginTop: 6 }]}
          >
            {msg.text}
          </AppText>
        )}
        <View style={[styles.bubbleMeta, isMine && { justifyContent: 'flex-end' }]}>
          <AppText
            variant="caption"
            color={isMine ? 'rgba(255,255,255,0.5)' : THEME.colors.muted}
            style={styles.timeText}
          >
            {timeStr}
          </AppText>
          {isMine && <ReadReceipt read={msg.read} />}
        </View>
      </View>
    </Animated.View>
  );
}

function ReadReceipt({ read }) {
  // Single tick = sent. Double tick = delivered. Double-blue = read.
  return (
    <Ionicons
      name={read ? 'checkmark-done' : 'checkmark'}
      size={12}
      color={read ? THEME.colors.primary : 'rgba(255,255,255,0.5)'}
      style={styles.receipt}
    />
  );
}

/* ─────────────────────────────  Typing indicator  ───────────────────────────── */

function TypingIndicator() {
  const bubbleScale = useSharedValue(0);

  useEffect(() => {
    bubbleScale.value = withSpring(1, { damping: 14, stiffness: 220 });
    return () => cancelAnimation(bubbleScale);
  }, [bubbleScale]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleScale.value,
  }));

  return (
    <Animated.View style={[styles.typingWrap, bubbleStyle]}>
      <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </Animated.View>
  );
}

function TypingDot({ delay }) {
  const ty = useSharedValue(0);
  useEffect(() => {
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0,  { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0,  { duration: 300 })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(ty);
  }, [delay, ty]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

/* ─────────────────────────────  Composer  ───────────────────────────── */

function Composer({ value, onChange, onSend, onAttach }) {
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(0);
  const hasText = value.trim().length > 0;

  const handleSend = () => {
    if (!hasText) return;
    scale.value = withSequence(
      withSpring(0.85, { damping: 13, stiffness: 320 }),
      withSpring(1,    { damping: 14, stiffness: 220 })
    );
    checkOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(150, withTiming(0, { duration: 150 }))
    );
    onSend();
  };

  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: hasText ? 1 : 0.4,
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }));

  return (
    <View style={styles.composer}>
      <Pressable onPress={onAttach} hitSlop={6} style={styles.attachBtn}>
        <Ionicons name="attach" size={20} color="#5A585A" />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Type a message…"
        placeholderTextColor={THEME.colors.muted}
        style={styles.composerInput}
        multiline
      />
      <Pressable onPress={handleSend} disabled={!hasText}>
        <Animated.View style={[styles.sendBtn, sendStyle]}>
          <Ionicons name="send" size={18} color="#fff" />
          <Animated.View style={[styles.checkOverlay, checkStyle]} pointerEvents="none">
            <Ionicons name="checkmark" size={18} color="#fff" />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────  Image lightbox  ───────────────────────────── */

function ImageLightbox({ uri, onClose }) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (uri) {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.7;
      opacity.value = 0;
    }
  }, [uri, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.lightboxRoot} onPress={onClose}>
        <Animated.Image
          source={uri ? { uri } : undefined}
          style={[styles.lightboxImage, animStyle]}
          resizeMode="contain"
        />
      </Pressable>
    </Modal>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  topName: {
    fontSize: 16,
    fontWeight: '600',
  },
  topBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topIcon: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    overflow: 'hidden',
  },
  contextThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: THEME.colors.accentBlue,
    overflow: 'hidden',
  },

  list: {
    padding: THEME.spacing.lg,
    gap: 6,
  },

  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: THEME.colors.dark,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: THEME.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bubbleText: {
    fontSize: 13,
  },
  bubbleImage: {
    width: 180,
    height: 120,
    borderRadius: 12,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: { fontSize: 10 },
  receipt: { fontSize: 10 },

  typingWrap: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.muted,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
  },
  attachBtn: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    fontSize: 14,
    color: THEME.colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '92%',
    height: '78%',
  },
});
