import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Title, Text, Group, Stack, Card, Badge, Button,
  Skeleton, ActionIcon, Tooltip, Divider, ThemeIcon, Center,
} from '@mantine/core';
import {
  IconBell, IconCheck, IconChecks, IconArrowRight,
  IconRefresh, IconCircleDot,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { notifications as toast } from '@mantine/notifications';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../services/socket';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';
const UNREAD_BG = 'rgba(0,255,65,0.05)';
const UNREAD_BD = 'rgba(0,255,65,0.15)';

// ─── Notification type → icon color ──────────────────────────────────────────
const TYPE_CONFIG = {
  status_update: { color: '#3b82f6', label: 'Status' },
  comment:       { color: '#14b8a6', label: 'Comment' },
  upvote:        { color: GREEN,     label: 'Upvote' },
  assignment:    { color: '#f59e0b', label: 'Assigned' },
  default:       { color: '#8b5cf6', label: 'Update' },
};

// ─── Relative time (dayjs-free, keeps bundle lean) ───────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

// ─── NotificationRow ──────────────────────────────────────────────────────────
function NotificationRow({ notif, onMarkRead }) {
  const navigate  = useNavigate();
  const cfg       = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.default;
  const isUnread  = !notif.isRead;

  const handleClick = async () => {
    if (isUnread) await onMarkRead(notif._id);
    // Navigate to associated report if available
    const reportId = notif.report?._id ?? notif.report;
    if (reportId) navigate(`/reports/${reportId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.18 }}
      layout
    >
      <Box
        onClick={handleClick}
        style={{
          display:       'flex',
          alignItems:    'flex-start',
          gap:           12,
          padding:       '14px 16px',
          background:    isUnread ? UNREAD_BG : 'transparent',
          borderLeft:    isUnread ? `3px solid ${cfg.color}` : '3px solid transparent',
          borderBottom:  `1px solid ${BORDER}`,
          cursor:        'pointer',
          transition:    'background .15s',
          borderRadius:  0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = isUnread ? UNREAD_BG : 'transparent'; }}
      >
        {/* Type icon */}
        <ThemeIcon size={36} radius="xl"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`,
            color: cfg.color, flexShrink: 0, marginTop: 2 }}>
          <IconBell size={16} />
        </ThemeIcon>

        {/* Content */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            fw={isUnread ? 600 : 400}
            c={isUnread ? 'white' : '#a1a1aa'}
            lh={1.5}
            style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            {notif.message}
          </Text>
          <Group gap={8} mt={4}>
            <Badge size="xs" variant="dot"
              style={{ color: cfg.color, '--badge-dot-color': cfg.color }}>
              {cfg.label}
            </Badge>
            <Text size="xs" c="dimmed">{timeAgo(notif.createdAt)}</Text>
          </Group>
        </Box>

        {/* Unread indicator dot + navigate chevron */}
        <Group gap={8} align="center" style={{ flexShrink: 0 }}>
          {isUnread && (
            <Box style={{
              width: 8, height: 8, borderRadius: '50%',
              background: GREEN,
              boxShadow: `0 0 6px ${GREEN}`,
              flexShrink: 0,
            }} />
          )}
          {(notif.report?._id ?? notif.report) && (
            <IconArrowRight size={14} color="#555" />
          )}
        </Group>
      </Box>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <Center py={80}>
      <Stack align="center" gap="md">
        <ThemeIcon size={72} radius="xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#555' }}>
          <IconBell size={34} />
        </ThemeIcon>
        <Title order={4} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#555' }}>
          No notifications yet
        </Title>
        <Text size="sm" c="dimmed" ta="center" maw={280}>
          You'll see status updates, comments, and upvote alerts here.
        </Text>
      </Stack>
    </Center>
  );
}

// ─── NotificationsPage ────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [markingAll,  setMarkingAll]  = useState(false);

  // ── Fetch notifications (paginated) ────────────────────────────────────────
  const fetch = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res  = await API.get('/notifications', { params: { page: p, limit: PAGE_SIZE } });
      const data = res.data.data;
      const list = data.notifications ?? [];
      setItems(prev => append ? [...prev, ...list] : list);
      setHasMore(data.hasMore ?? false);
      setPage(p);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load + mark all as read when page opens
  useEffect(() => {
    fetch(1);
    // Clear badge in AppShell — fire a custom event the bell listens to
    window.dispatchEvent(new CustomEvent('notifications:viewed'));
  }, [fetch]);

  // ── Real-time: new notification pushed from server ─────────────────────────
  useSocket(user?._id, {
    newNotification: (notif) => {
      setItems(prev => [notif, ...prev]);
    },
    // Also handle the statusUpdated event from the existing server code
    statusUpdated: (notif) => {
      setItems(prev => [notif, ...prev]);
    },
  });

  // ── Mark single as read ────────────────────────────────────────────────────
  const handleMarkRead = useCallback(async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      window.dispatchEvent(new CustomEvent('notifications:decrement'));
    } catch { /* silent */ }
  }, []);

  // ── Mark all as read ───────────────────────────────────────────────────────
  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await API.put('/notifications/read-all');
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      window.dispatchEvent(new CustomEvent('notifications:viewed'));
      toast.show({ title: 'All caught up ✓', message: 'All notifications marked as read.', color: 'civic', autoClose: 3000 });
    } catch {
      toast.show({ title: 'Failed', message: 'Could not mark all as read.', color: 'red' });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter(n => !n.isRead).length;

  return (
    <Box maw={680} mx="auto">

      {/* Header */}
      <Group justify="space-between" align="flex-end" mb="xl">
        <Box>
          <Title order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            Notifications
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {loading ? 'Loading…' : `${unreadCount} unread`}
          </Text>
        </Box>

        <Group gap="sm">
          <Tooltip label="Refresh" position="top" withArrow>
            <ActionIcon size="sm" variant="subtle" color="civic" radius="md"
              onClick={() => fetch(1)}
              disabled={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Button
            size="sm" radius="md" variant="light" color="civic"
            loading={markingAll}
            disabled={unreadCount === 0 || loading}
            leftSection={<IconChecks size={15} />}
            onClick={handleMarkAll}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Mark all as read
          </Button>
        </Group>
      </Group>

      {/* Notification list */}
      <Card p={0} radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <Stack gap={0}>
            {Array.from({ length: 6 }, (_, i) => (
              <Box key={i} p="md" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Group gap="md">
                  <Skeleton height={36} width={36} radius="xl" />
                  <Box style={{ flex: 1 }}>
                    <Skeleton height={14} mb={6} />
                    <Skeleton height={10} width={120} />
                  </Box>
                </Group>
              </Box>
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence initial={false}>
            {items.map(n => (
              <NotificationRow
                key={n._id}
                notif={n}
                onMarkRead={handleMarkRead}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <Box p="md" style={{ borderTop: `1px solid ${BORDER}` }}>
            <Button
              fullWidth size="sm" radius="md" variant="subtle" color="civic"
              loading={loadingMore}
              onClick={() => fetch(page + 1, true)}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Load more
            </Button>
          </Box>
        )}
      </Card>
    </Box>
  );
}
