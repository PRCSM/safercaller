import { useEffect, useMemo, useState } from 'react';
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

type Conversation = {
  id: string;
  participants?: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastSenderId?: string;
  lastAt?: Timestamp;
  flagged?: boolean;
};

type Message = {
  id: string;
  senderId?: string;
  receiverId?: string;
  text?: string | null;
  mediaUrl?: string | null;
  deleted?: boolean;
  flagged?: boolean;
  createdAt?: Timestamp;
};

const initialsFor = (name?: string) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const fmtTime = (ts?: Timestamp) =>
  ts?.toDate ? ts.toDate().toLocaleString() : '';

const participantLabel = (c: Conversation): string => {
  if (c.participantNames) return Object.values(c.participantNames).join(' · ');
  return (c.participants ?? []).join(' · ');
};

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Conversation list — onSnapshot real-time.
  useEffect(() => {
    if (IS_MOCK || !db) {
      setConversations(MOCK_CONVERSATIONS);
      setLoadingConvos(false);
      return;
    }
    setLoadingConvos(true);
    const unsub = onSnapshot(
      query(collection(db, 'chats'), orderBy('lastAt', 'desc')),
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingConvos(false);
      },
      (err) => {
        toast.error('Could not load conversations: ' + err.message);
        setLoadingConvos(false);
      },
    );
    return unsub;
  }, []);

  // Messages — onSnapshot for active conversation.
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    if (IS_MOCK || !db) {
      setMessages(MOCK_MESSAGES);
      return;
    }
    setLoadingMsgs(true);
    const unsub = onSnapshot(
      query(collection(db, 'chats', activeId, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingMsgs(false);
      },
      (err) => {
        toast.error('Could not load messages: ' + err.message);
        setLoadingMsgs(false);
      },
    );
    return unsub;
  }, [activeId]);

  const filteredConvos = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((c) =>
      participantLabel(c).toLowerCase().includes(needle) ||
      (c.lastMessage ?? '').toLowerCase().includes(needle),
    );
  }, [conversations, search]);

  const active = activeId ? conversations.find((c) => c.id === activeId) : null;

  const onDeleteMessage = async (msgId: string) => {
    if (!activeId || IS_MOCK || !db) return;
    try {
      await updateDoc(doc(db, 'chats', activeId, 'messages', msgId), {
        deleted: true, text: null, mediaUrl: null,
      });
      toast.success('Message removed');
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    }
  };

  const onDeleteConversation = async () => {
    if (!activeId || IS_MOCK || !db) {
      setActiveId(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'chats', activeId));
      toast.success('Conversation deleted');
      setActiveId(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    }
  };

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>Chat Moderation</h2>

      <div style={styles.shell}>
        {/* Left panel */}
        <aside style={styles.leftPanel}>
          <div style={styles.leftHeader}>
            <div style={styles.leftTitle}>Conversations</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={styles.leftSearch}
            />
          </div>
          {loadingConvos ? (
            <TableSkeleton rows={6} cols={1} />
          ) : (
            <div style={styles.convoList}>
              {filteredConvos.map((c) => {
                const isActive = c.id === activeId;
                const label = participantLabel(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      ...styles.convoRow,
                      background: isActive ? 'rgba(0,102,255,0.08)' : 'transparent',
                    }}
                  >
                    <div style={styles.convoAvatars}>
                      <div style={styles.avatar1}>{initialsFor((c.participants ?? [])[0])}</div>
                      <div style={styles.avatar2}>{initialsFor((c.participants ?? [])[1])}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.convoNames}>
                        {label}
                        {c.flagged && <span style={styles.flagDot} title="Flagged" />}
                      </div>
                      <div style={styles.convoPreview}>{c.lastMessage ?? '—'}</div>
                    </div>
                    <div style={styles.convoTime}>{fmtTime(c.lastAt).split(',')[0]}</div>
                  </button>
                );
              })}
              {filteredConvos.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: THEME.colors.muted, fontSize: 13 }}>
                  No conversations.
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right panel */}
        <section style={styles.rightPanel}>
          {!active ? (
            <div style={styles.rightEmpty}>
              Select a conversation to view its messages.
            </div>
          ) : (
            <>
              <div style={styles.rightHeader}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{participantLabel(active)}</div>
                  <div style={{ fontSize: 12, color: THEME.colors.muted }}>
                    Chat ID: <code>{active.id}</code>
                  </div>
                </div>
                <button onClick={() => setConfirmDelete(active.id)} style={styles.deleteConvoBtn}>
                  Delete Conversation
                </button>
              </div>

              <div style={styles.messages}>
                {loadingMsgs ? (
                  <TableSkeleton rows={6} cols={1} />
                ) : messages.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: THEME.colors.muted }}>
                    No messages yet.
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const sender = (active.participants ?? [])[0];
                    const isLeft = m.senderId === sender;
                    return (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        side={isLeft ? 'left' : 'right'}
                        onDelete={() => onDeleteMessage(m.id)}
                      />
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete conversation?"
        message="This removes the chat doc but messages in the subcollection remain (Firestore does not cascade). Re-runnable if a Cloud Function cleans those up."
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConversation}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function MessageBubble({
  message, side, onDelete,
}: { message: Message; side: 'left' | 'right'; onDelete: () => void }) {
  const [hover, setHover] = useState(false);
  const bg = message.deleted
    ? THEME.colors.subtle
    : side === 'left' ? THEME.colors.surface : THEME.colors.dark;
  const fg = message.deleted
    ? THEME.colors.muted
    : side === 'left' ? THEME.colors.text : THEME.colors.white;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', justifyContent: side === 'left' ? 'flex-start' : 'flex-end', gap: 8 }}
    >
      {side === 'right' && hover && !message.deleted && (
        <button onClick={onDelete} style={msgStyles.deleteBtn}>🗑</button>
      )}
      <div style={{
        ...msgStyles.bubble,
        background: bg,
        color: fg,
        border: message.flagged ? `2px solid ${THEME.colors.warning}` : 'none',
        fontStyle: message.deleted ? 'italic' : 'normal',
      }}>
        {message.flagged && <span style={{ marginRight: 6 }}>🚩</span>}
        {message.deleted
          ? 'Message deleted'
          : message.mediaUrl
            ? <img src={message.mediaUrl} alt="" style={{ maxWidth: 240, borderRadius: 8 }} />
            : (message.text ?? '')}
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{fmtTime(message.createdAt)}</div>
      </div>
      {side === 'left' && hover && !message.deleted && (
        <button onClick={onDelete} style={msgStyles.deleteBtn}>🗑</button>
      )}
    </div>
  );
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'c1', participants: ['Paikhomba', 'Meena'], lastMessage: 'Sure, see you at 6', lastSenderId: 'Meena', flagged: false },
  { id: 'c2', participants: ['Rahul', 'Susmita'], lastMessage: 'Send the docs', lastSenderId: 'Rahul', flagged: true },
];
const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'Paikhomba', text: 'Hey, are we still on for 6?' },
  { id: 'm2', senderId: 'Meena', text: 'Sure, see you at 6' },
];

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  shell: {
    display: 'flex',
    background: THEME.colors.white,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: 18,
    minHeight: 640,
    overflow: 'hidden',
  },
  leftPanel: {
    width: 360,
    borderRight: `1px solid ${THEME.colors.border}`,
    display: 'flex', flexDirection: 'column',
  },
  leftHeader: { padding: 16, borderBottom: `1px solid ${THEME.colors.subtle}` },
  leftTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  leftSearch: {
    width: '100%', height: 36, borderRadius: 18,
    border: `1px solid ${THEME.colors.border}`,
    padding: '0 12px', fontSize: 13,
  },
  convoList: { flex: 1, overflowY: 'auto' },
  convoRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', width: '100%', textAlign: 'left',
    borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  convoAvatars: { position: 'relative', width: 44, height: 36 },
  avatar1: {
    position: 'absolute', left: 0, top: 0,
    width: 28, height: 28, borderRadius: 14,
    background: '#9DC4F5', color: THEME.colors.white,
    fontSize: 10, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatar2: {
    position: 'absolute', right: 0, bottom: 0,
    width: 28, height: 28, borderRadius: 14,
    background: '#FFCAFC', color: THEME.colors.text,
    fontSize: 10, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `2px solid ${THEME.colors.white}`,
  },
  convoNames: {
    fontSize: 13, fontWeight: 600,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  convoPreview: {
    fontSize: 12, color: THEME.colors.muted,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    marginTop: 2,
  },
  convoTime: { fontSize: 10, color: THEME.colors.muted },
  flagDot: {
    width: 8, height: 8, borderRadius: 4,
    background: THEME.colors.coral, display: 'inline-block',
  },
  rightPanel: { flex: 1, display: 'flex', flexDirection: 'column' },
  rightEmpty: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: THEME.colors.muted, fontSize: 14,
  },
  rightHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  deleteConvoBtn: {
    background: 'transparent', color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`,
    fontSize: 12, fontWeight: 500, height: 32, padding: '0 12px', borderRadius: 35,
  },
  messages: {
    flex: 1, overflowY: 'auto',
    padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
    background: THEME.colors.background,
  },
};

const msgStyles: Record<string, React.CSSProperties> = {
  bubble: {
    maxWidth: '70%', padding: '10px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.4,
  },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`,
    fontSize: 12, alignSelf: 'center',
  },
};
