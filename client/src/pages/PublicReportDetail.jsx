import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Title, Text, Group, Stack, Badge, Card, Button, Textarea,
  Image, Modal, Avatar, Anchor, Alert, Progress, Skeleton,
  ActionIcon, Divider, ScrollArea, ThemeIcon, Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconThumbUp, IconMessageCircle, IconShare, IconArrowLeft,
  IconBrandFacebook, IconBrandTwitter, IconBrandWhatsapp,
  IconAlertCircle, IconCircleCheck, IconSend,
} from '@tabler/icons-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMapTheme } from '../hooks/useMapTheme';
import MapThemeToggle from '../components/MapThemeToggle';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.22)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Open: 'yellow',
  Assigned: 'blue',
  'In Progress': 'orange',
  Resolved: 'teal',
};

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontFamily: "'Inter', sans-serif" },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

// ─── Upvote localStorage key ──────────────────────────────────────────────────
const upvoteKey = (id) => `cr_upvoted_${id}`;

// ─── Map: non-interactive ─────────────────────────────────────────────────────
function StaticMap({ lat, lng }) {
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();
  function Disabler() {
    const map = useMap();
    useEffect(() => {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    }, [map]);
    return null;
  }
  return (
    <Box style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <Marker position={[lat, lng]} />
        <Disabler />
      </MapContainer>
      <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}>
        <MapThemeToggle theme={theme} onToggle={toggleTheme} />
      </Box>
    </Box>
  );
}

// ─── Comment bubble ───────────────────────────────────────────────────────────
function CommentBubble({ comment }) {
  const initial = (comment.authorName ?? 'A').charAt(0).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Group gap="sm" align="flex-start">
        <Avatar size={34} radius="xl" color="civic">{initial}</Avatar>
        <Box style={{ flex: 1 }}>
          <Group gap="xs" mb={4}>
            <Text size="xs" fw={700} c="white">{comment.authorName ?? 'User'}</Text>
            <Text size="xs" c="dimmed">
              {comment.createdAt
                ? new Date(comment.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                : ''}
            </Text>
          </Group>
          <Card p="sm" radius="md"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}>
            <Text size="sm" c="#d1d5db" lh={1.65}>{comment.content}</Text>
          </Card>
        </Box>
      </Group>
    </motion.div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ platform, icon: Icon, color, url, reportId, title, count }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      await API.post(`/reports/${reportId}/share`, { platform });
    } catch {
      // Fire-and-forget — open window regardless
    } finally {
      setLoading(false);
    }
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
  };

  return (
    <Tooltip label={`Share on ${platform}`} position="top" withArrow>
      <Stack gap={4} align="center">
        <ActionIcon
          size={46}
          radius="xl"
          loading={loading}
          onClick={handleShare}
          style={{
            background: `${color}18`,
            border: `1px solid ${color}44`,
            color,
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = `0 0 14px ${color}44`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Icon size={22} />
        </ActionIcon>
        {count > 0 && <Text size="xs" c="dimmed">{count}</Text>}
      </Stack>
    </Tooltip>
  );
}

// ─── PublicReportDetail ───────────────────────────────────────────────────────
const COMMENTS_PER_PAGE = 10;

export default function PublicReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Upvote
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCnt, setUpvoteCnt] = useState(0);
  const [upvoting, setUpvoting] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentTxt, setCommentTxt] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [shownCmts, setShownCmts] = useState(COMMENTS_PER_PAGE);

  // Image modal
  const [modalSrc, setModalSrc] = useState(null);
  const [imgModal, { open: openImg, close: closeImg }] = useDisclosure(false);

  // ── Fetch report ──────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reports/${id}`);
      const data = res.data.data.report;
      setReport(data);
      setUpvoteCnt(data.upvoteCount ?? data.upvotes?.length ?? 0);
      setComments(data.comments ?? []);
      // Check localStorage for prior upvote
      setUpvoted(localStorage.getItem(upvoteKey(id)) === '1');
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Upvote ────────────────────────────────────────────────────────────────
  const handleUpvote = async () => {
    if (!isAuthenticated()) return;
    if (upvoted || upvoting) return;
    setUpvoting(true);
    try {
      const res = await API.put(`/reports/${id}/upvote`);
      const cnt = res.data.data?.upvoteCount ?? upvoteCnt + 1;
      setUpvoteCnt(cnt);
      setUpvoted(true);
      localStorage.setItem(upvoteKey(id), '1');
      notifications.show({
        title: 'Upvoted ✓',
        message: 'Your vote helps prioritize this issue.',
        color: 'civic',
        autoClose: 3000,
      });
    } catch {
      notifications.show({ title: 'Already voted', message: 'You can only upvote once per report.', color: 'orange', autoClose: 2500 });
    } finally {
      setUpvoting(false);
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const handleComment = async () => {
    if (!commentTxt.trim()) return;
    setCommenting(true);
    // Optimistic prepend
    const optimistic = {
      _id: `opt_${Date.now()}`,
      authorName: 'You',
      content: commentTxt.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    setCommentTxt('');
    try {
      const res = await API.post(`/reports/${id}/comments`, { content: optimistic.content });
      const real = res.data.data.comments;
      if (real) setComments(real);
    } catch {
      // Remove optimistic on failure
      setComments(prev => prev.filter(c => c._id !== optimistic._id));
      notifications.show({ title: 'Failed', message: 'Could not post comment.', color: 'red' });
    } finally {
      setCommenting(false);
    }
  };

  // ── Share URLs ────────────────────────────────────────────────────────────
  // Use the backend /api/share/:id proxy so crawlers see the OG meta tags.
  // Real users are JS-redirected back to the React SPA.
  const apiBase   = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? '';
  const shareUrl  = encodeURIComponent(`${apiBase}/api/share/${id}`);
  const titleEnc  = encodeURIComponent(`[${report?.status ?? ''}] ${report?.title ?? 'Civic Issue Report'} | CivicResolve`);
  const sharePanels = [
    {
      platform: 'Facebook',
      icon: IconBrandFacebook,
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      count: report?.shareCounts?.facebook ?? 0,
    },
    {
      platform: 'Twitter',
      icon: IconBrandTwitter,
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${titleEnc}`,
      count: report?.shareCounts?.twitter ?? 0,
    },
    {
      platform: 'WhatsApp',
      icon: IconBrandWhatsapp,
      color: '#25D366',
      url: `https://wa.me/?text=${titleEnc}%20${shareUrl}`,
      count: report?.shareCounts?.whatsapp ?? 0,
    },
  ];

  // ── Image lightbox ────────────────────────────────────────────────────────
  const openLightbox = (src) => { setModalSrc(src); openImg(); };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (notFound) return (
    <Box style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Stack align="center" gap="md">
        <Text size="3rem" c="#333">404</Text>
        <Text c="dimmed">Report not found or has been removed.</Text>
        <Button size="sm" color="civic" radius="md" onClick={() => navigate(-1)}
          leftSection={<IconArrowLeft size={14} />}>
          Go back
        </Button>
      </Stack>
    </Box>
  );

  const lat = report?.latitude ?? report?.location?.coordinates?.[1];
  const lng = report?.longitude ?? report?.location?.coordinates?.[0];

  return (
    <Box
      style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 16px' }}
    >
      <Box maw={1100} mx="auto">

        {/* Back button */}
        <Button
          variant="subtle" color="civic" size="sm" radius="md" mb="xl"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate(-1)}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Back
        </Button>

        {/* Loading skeleton */}
        {loading ? (
          <Stack gap="md">
            <Skeleton height={40} width={340} />
            <Skeleton height={20} width={200} />
            <Skeleton height={300} radius="md" />
          </Stack>
        ) : (
          <Group align="flex-start" gap="xl" wrap="wrap" grow>

            {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
            <Stack gap="lg" style={{ flex: 2, minWidth: 320 }}>

              {/* Title + badges */}
              <Box>
                <Group gap="xs" mb="sm">
                  {report.category && (
                    <Badge color="cyan" variant="dot" size="sm">{report.category}</Badge>
                  )}
                  <Badge
                    color={STATUS_COLOR[report.status] ?? 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {report.status}
                  </Badge>
                  {report.isAnonymous && (
                    <Badge color="gray" variant="outline" size="xs">Anonymous</Badge>
                  )}
                </Group>
                <Title
                  order={1}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                    lineHeight: 1.25,
                  }}
                >
                  {report.title}
                </Title>
              </Box>

              {/* Description */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                  Description
                </Text>
                <Text size="sm" c="#d1d5db" lh={1.75}>{report.description}</Text>
              </Card>

              {/* Evidence gallery */}
              {report.evidences?.length > 0 && (
                <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                    Evidence ({report.evidences.length})
                  </Text>
                  <Group gap="sm" wrap="wrap">
                    {report.evidences.map((ev, i) => (
                      ev.fileType === 'image' ? (
                        <Box
                          key={i}
                          style={{
                            cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                            border: `1px solid ${BORDER}`, transition: 'transform .15s'
                          }}
                          onClick={() => openLightbox(ev.fileUrl)}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Image src={ev.fileUrl} width={180} height={130}
                            fit="cover" radius="md" alt={`Evidence ${i + 1}`} />
                        </Box>
                      ) : (
                        <video key={i} src={ev.fileUrl} controls
                          style={{ maxWidth: 280, borderRadius: 8, border: `1px solid ${BORDER}` }} />
                      )
                    ))}
                  </Group>
                </Card>
              )}

              {/* Proof of fix */}
              {report.proofUrl && (
                <Card p="lg" radius="md"
                  style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}` }}>
                  <Group gap="xs" mb="md">
                    <IconCircleCheck size={18} color={GREEN} />
                    <Text size="xs" c="civic.3" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
                      Proof of Fix
                    </Text>
                  </Group>
                  <Box style={{
                    cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                    border: `1px solid ${GREEN_BDR}`, display: 'inline-block'
                  }}
                    onClick={() => openLightbox(report.proofUrl)}>
                    <Image src={report.proofUrl} maw={320} radius="md" alt="Proof of fix" />
                  </Box>
                  <Text size="xs" c="dimmed" mt="sm">
                    Resolved on{' '}
                    {report.resolvedAt
                      ? new Date(report.resolvedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })
                      : '—'}
                  </Text>
                </Card>
              )}

              {/* ── Upvote section ────────────────────────────────────────── */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Group align="center" gap="lg">
                  {isAuthenticated() ? (
                    <motion.div whileTap={{ scale: 0.92 }}>
                      <Button
                        size="lg"
                        radius="xl"
                        loading={upvoting}
                        disabled={upvoted}
                        onClick={handleUpvote}
                        leftSection={<IconThumbUp size={20} />}
                        style={{
                          background: upvoted ? GREEN_DIM : GREEN,
                          color: upvoted ? GREEN : '#000',
                          border: upvoted ? `1px solid ${GREEN_BDR}` : 'none',
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700,
                          boxShadow: upvoted ? 'none' : `0 0 24px rgba(0,255,65,0.30)`,
                          transition: 'all .2s',
                        }}
                      >
                        {upvoted ? 'Upvoted' : 'Upvote'}
                      </Button>
                    </motion.div>
                  ) : (
                    <Stack gap={6}>
                      <Group gap="xs">
                        <IconThumbUp size={16} color="#555" />
                        <Text size="sm" c="dimmed">Want to upvote this issue?</Text>
                      </Group>
                      <Group gap="xs">
                        <Button
                          component={Link}
                          to="/login"
                          size="xs"
                          radius="md"
                          color="civic"
                          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                        >
                          Login to upvote
                        </Button>
                        <Text size="xs" c="dimmed">or</Text>
                        <Button
                          component={Link}
                          to="/register"
                          size="xs"
                          radius="md"
                          variant="subtle"
                          color="civic"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          Register
                        </Button>
                      </Group>
                    </Stack>
                  )}
                  <Box>
                    <Title order={3}
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: upvoted ? GREEN : '#fff', letterSpacing: '-0.02em' }}>
                      {upvoteCnt}
                    </Title>
                    <Text size="xs" c="dimmed">community votes</Text>
                  </Box>
                </Group>
              </Card>

              {/* ── Comment thread ────────────────────────────────────────── */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Group gap="xs" mb="lg">
                  <IconMessageCircle size={18} color={GREEN} />
                  <Title order={5}
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                    Discussion ({comments.length})
                  </Title>
                </Group>

                <Stack gap="md" mb="lg">
                  <AnimatePresence>
                    {comments.slice(0, shownCmts).map((c, i) => (
                      <CommentBubble key={c._id ?? i} comment={c} />
                    ))}
                  </AnimatePresence>
                  {comments.length === 0 && (
                    <Text size="sm" c="dimmed">No comments yet. Be the first!</Text>
                  )}
                </Stack>

                {comments.length > shownCmts && (
                  <Button
                    size="xs" variant="subtle" color="civic" radius="md" mb="md"
                    onClick={() => setShownCmts(n => n + COMMENTS_PER_PAGE)}
                  >
                    Load {Math.min(COMMENTS_PER_PAGE, comments.length - shownCmts)} more comments
                  </Button>
                )}

                <Divider color={BORDER} mb="md" />

                <Textarea
                  placeholder="Add a comment or community update…"
                  value={commentTxt}
                  onChange={e => setCommentTxt(e.currentTarget.value)}
                  minRows={3}
                  styles={inputSm}
                  mb="sm"
                />
                <Button
                  size="sm" color="civic" radius="md"
                  loading={commenting}
                  disabled={!commentTxt.trim()}
                  rightSection={<IconSend size={14} />}
                  onClick={handleComment}
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                >
                  Post comment
                </Button>
              </Card>

              {/* ── Social share ──────────────────────────────────────────── */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Group gap="xs" mb="lg">
                  <IconShare size={18} color={GREEN} />
                  <Title order={5}
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                    Share this report
                  </Title>
                </Group>
                <Group gap="xl">
                  {sharePanels.map(s => (
                    <ShareButton key={s.platform} {...s} reportId={id} title={report?.title} />
                  ))}
                </Group>
              </Card>
            </Stack>

            {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
            <Stack gap="lg" style={{ flex: 1, minWidth: 260 }}>

              {/* Mini map */}
              {lat && lng && (
                <Card p={0} radius="md"
                  style={{ border: `1px solid ${BORDER}`, overflow: 'hidden', height: 220 }}>
                  <StaticMap lat={lat} lng={lng} />
                </Card>
              )}

              {/* Meta info */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                  Report Details
                </Text>
                <Stack gap={10}>
                  {[
                    { label: 'Submitted by', value: report.isAnonymous ? 'Anonymous Citizen' : (report.submittedBy?.name ?? '—') },
                    { label: 'Ward', value: report.wardId ?? '—' },
                    { label: 'Date', value: report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—' },
                    { label: 'Severity', value: report.severity ?? '—' },
                  ].map(r => (
                    <Group key={r.label} justify="space-between"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                      <Text size="xs" c="dimmed">{r.label}</Text>
                      <Text size="xs" c="white" fw={600} maw={160} ta="right">{r.value}</Text>
                    </Group>
                  ))}
                </Stack>
              </Card>

              {/* Priority score */}
              <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <Group justify="space-between" mb={8}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
                    Priority Score
                  </Text>
                  <Text size="sm" fw={700}
                    c={
                      (report.priorityScore ?? 0) >= 8 ? '#ef4444'
                        : (report.priorityScore ?? 0) >= 4 ? '#f59e0b'
                          : '#6b7280'
                    }>
                    {report.priorityScore ?? 0} / 10
                  </Text>
                </Group>
                <Progress
                  value={((report.priorityScore ?? 0) / 10) * 100}
                  color={
                    (report.priorityScore ?? 0) >= 8 ? 'red'
                      : (report.priorityScore ?? 0) >= 4 ? 'yellow'
                        : 'gray'
                  }
                  size={8}
                  radius="xl"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                />
                <Group gap={20} mt="md">
                  <Box ta="center">
                    <Text size="xs" c="dimmed">Upvotes</Text>
                    <Text size="sm" fw={700} c="white">{upvoteCnt}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xs" c="dimmed">Comments</Text>
                    <Text size="sm" fw={700} c="white">{comments.length}</Text>
                  </Box>
                </Group>
              </Card>

              {/* Status history */}
              {report.statusHistory?.length > 0 && (
                <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                    Timeline
                  </Text>
                  <Stack gap="xs">
                    {[...report.statusHistory].reverse().map((h, i) => (
                      <Group key={i} gap="xs" align="flex-start">
                        <Box style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                          background: h.status === 'Resolved' ? GREEN : h.status === 'In Progress' ? '#f97316' : '#6b7280',
                          flexShrink: 0
                        }} />
                        <Box style={{ flex: 1 }}>
                          <Text size="xs" c="white" fw={600}>{h.status}</Text>
                          {h.note && <Text size="xs" c="dimmed">{h.note}</Text>}
                        </Box>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}
            </Stack>
          </Group>
        )}
      </Box>

      {/* ── Image lightbox modal ─────────────────────────────────────────────── */}
      <Modal
        opened={imgModal}
        onClose={closeImg}
        size="xl"
        centered
        withCloseButton
        padding={0}
        styles={{
          content: { background: '#111', border: `1px solid ${BORDER}`, overflow: 'hidden', borderRadius: 10 },
          header: { background: 'transparent', position: 'absolute', top: 8, right: 8, zIndex: 10 },
          close: { color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: '50%' },
        }}
      >
        {modalSrc && (
          <Image
            src={modalSrc}
            fit="contain"
            mah="85vh"
            alt="Enlarged evidence"
          />
        )}
      </Modal>
    </Box>
  );
}
