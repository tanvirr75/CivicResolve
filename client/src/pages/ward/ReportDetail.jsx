import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, Badge, Card, Button, Select,
  Textarea, Skeleton, Divider, Image, Progress, Anchor, Alert,
  ThemeIcon, ScrollArea, Avatar,
} from '@mantine/core';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapTheme } from '../../hooks/useMapTheme';
import MapThemeToggle from '../../components/MapThemeToggle';
import {
  IconMapPin, IconFileText, IconCircleCheck, IconAlertCircle,
  IconArrowLeft, IconDownload, IconSend,
} from '@tabler/icons-react';
import { useParams, Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Open:          'yellow',
  Assigned:      'blue',
  'In Progress': 'orange',
  Resolved:      'teal',
};


const inputSm = {
  input:  { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontFamily: "'Inter', sans-serif" },
  label:  { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

// ─── Priority bar ─────────────────────────────────────────────────────────────
function PriorityBar({ score }) {
  const pct   = ((score ?? 0) / 10) * 100;
  const color = score >= 8 ? 'red' : score >= 4 ? 'yellow' : 'gray';
  return (
    <Box>
      <Group justify="space-between" mb={6}>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>Priority Score</Text>
        <Text size="xs" fw={700} c={color === 'red' ? '#ef4444' : color === 'yellow' ? '#f59e0b' : '#6b7280'}>
          {score ?? '—'} / 10
        </Text>
      </Group>
      <Progress value={pct} color={color} size={6} radius="xl"
        style={{ background: 'rgba(255,255,255,0.07)' }} />
    </Box>
  );
}

// ─── Comment bubble ───────────────────────────────────────────────────────────
function CommentBubble({ comment }) {
  return (
    <Group gap="sm" align="flex-start">
      <Avatar size={32} radius="xl" color="civic">
        {(comment.authorName ?? 'A').charAt(0).toUpperCase()}
      </Avatar>
      <Box style={{ flex: 1 }}>
        <Group gap="xs" mb={4}>
          <Text size="xs" fw={700} c="white">{comment.authorName ?? 'User'}</Text>
          <Text size="xs" c="dimmed">
            {new Date(comment.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </Group>
        <Card p="sm" radius="md"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}>
          <Text size="sm" c="#d1d5db" lh={1.6}>{comment.content}</Text>
        </Card>
      </Box>
    </Group>
  );
}

// ─── ReportDetail ─────────────────────────────────────────────────────────────
export default function ReportDetail() {
  const { id }     = useParams();
  const { user }   = useAuth();
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();

  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);

  // Resolve / feedback actions
  const [statusNote,    setStatusNote]    = useState('');
  const [statusSaving,  setStatusSaving]  = useState(false);
  const [feedbackNote,  setFeedbackNote]  = useState('');
  const [feedbackSaving,setFeedbackSaving]= useState(false);

  // Comments
  const [commentText,  setCommentText]  = useState('');
  const [commenting,   setCommenting]   = useState(false);

  // Work order
  const [workOrderUrl,    setWorkOrderUrl]    = useState(null);
  const [woLoading,       setWoLoading]       = useState(false);
  const [fieldWorkers,    setFieldWorkers]    = useState([]);
  const [selectedWorker,  setSelectedWorker]  = useState(null);

  // ── Fetch active field workers for work order dispatch ────────────────────
  useEffect(() => {
    API.get('/auth/workers')
      .then(res => {
        const list = res.data.data?.workers ?? [];
        setFieldWorkers(list.map(w => ({ value: w._id, label: w.name })));
      })
      .catch(() => {}); // non-fatal — select stays empty
  }, []);

  // ── Fetch report ──────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res    = await API.get(`/reports/${id}`);
      const data   = res.data.data.report;
      setReport(data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Mark as Resolved (only allowed after field worker submits proof photo) ──
  const handleMarkResolved = async () => {
    setStatusSaving(true);
    try {
      const res = await API.put(`/reports/${id}/status`, { status: 'Resolved', note: statusNote });
      setReport(prev => ({
        ...prev,
        status: res.data.data.status,
        statusHistory: res.data.data.statusHistory,
        resolvedAt: res.data.data.resolvedAt,
      }));
      setStatusNote('');
      notifications.show({ title: 'Report resolved ✓', message: 'Report has been marked as Resolved.', color: 'teal', autoClose: 3000 });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not resolve report.', color: 'red' });
    } finally {
      setStatusSaving(false);
    }
  };

  // ── Send feedback to field worker (rejects proof, worker must resubmit) ──
  const handleSendFeedback = async () => {
    if (!feedbackNote.trim()) return;
    setFeedbackSaving(true);
    try {
      const res = await API.put(`/reports/${id}/reject-proof`, { feedback: feedbackNote.trim() });
      setReport(prev => ({ ...prev, proofUrl: null, proofPublicId: null, comments: res.data.data.comments }));
      setFeedbackNote('');
      notifications.show({ title: 'Feedback sent ✓', message: 'Field worker has been notified to resubmit proof.', color: 'orange', autoClose: 4000 });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not send feedback.', color: 'red' });
    } finally {
      setFeedbackSaving(false);
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res      = await API.post(`/reports/${id}/comments`, { content: commentText.trim() });
      const comments = res.data.data.comments;
      setReport(prev => ({ ...prev, comments }));
      setCommentText('');
    } catch (err) {
      notifications.show({ title: 'Failed', message: 'Could not post comment.', color: 'red' });
    } finally {
      setCommenting(false);
    }
  };

  // ── Generate work order ───────────────────────────────────────────────────
  const handleWorkOrder = async () => {
    if (!selectedWorker) {
      notifications.show({ title: 'No field worker selected', message: 'Select a field worker from the dropdown first.', color: 'orange' });
      return;
    }
    setWoLoading(true);
    try {
      const res = await API.post('/work-orders', { reportId: id, assignedTo: selectedWorker, notes: '' });
      const workOrder = res.data.data?.workOrder;
      const url = workOrder?.pdfUrl ?? res.data.data?.pdfUrl;
      if (url) setWorkOrderUrl(url);
      setReport(prev => ({ ...prev, status: 'In Progress' }));
      notifications.show({ title: 'Work order created ✓', message: 'Field worker dispatched. Report is now In Progress.', color: 'civic' });
    } catch (err) {
      notifications.show({ title: 'Work order failed', message: err.response?.data?.message ?? 'Error generating PDF.', color: 'red' });
    } finally {
      setWoLoading(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box>
      <Skeleton height={32} width={200} mb="lg" />
      <Skeleton height={200} radius="md" mb="md" />
      <Skeleton height={120} radius="md" />
    </Box>
  );

  if (notFound || !report) return (
    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
      Report not found.{' '}
      <Anchor component={Link} to="/ward/reports" c="red.4" size="sm" underline="never">← Back to list</Anchor>
    </Alert>
  );

  const lat = report.latitude  ?? report.location?.coordinates?.[1];
  const lng = report.longitude ?? report.location?.coordinates?.[0];

  return (
    <Box maw={960} mx="auto">
      {/* Back link */}
      <Anchor component={Link} to="/ward/reports" size="sm" c="dimmed" underline="never" mb="lg" display="block"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconArrowLeft size={14} /> Back to Reports
      </Anchor>

      {/* Title row */}
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            {report.title}
          </Title>
          <Group gap="xs" mt={6}>
            <Badge color={STATUS_COLOR[report.status] ?? 'gray'} variant="light">{report.status}</Badge>
            {report.category && <Badge color="cyan" variant="dot" size="sm">{report.category}</Badge>}
            {report.isAnonymous && <Badge color="gray" variant="outline" size="xs">Anonymous</Badge>}
          </Group>
        </Box>

        {/* Work order dispatch — ward_official only, admin sees status badge */}
        <Stack gap="xs" align="flex-end" style={{ minWidth: 240 }}>
          {user?.role === 'ward_official' && report.status === 'Open' ? (
            <>
              <Select
                placeholder="Select field worker…"
                data={fieldWorkers}
                value={selectedWorker}
                onChange={setSelectedWorker}
                size="xs"
                radius="md"
                searchable
                clearable
                styles={inputSm}
                style={{ width: '100%' }}
              />
              <Button
                size="sm" radius="md" variant="outline" color="civic"
                leftSection={<IconFileText size={15} />}
                loading={woLoading}
                disabled={!selectedWorker}
                onClick={handleWorkOrder}
                style={{ fontFamily: "'Space Grotesk', sans-serif", width: '100%' }}
              >
                Assign Worker
              </Button>
            </>
          ) : (
            <Badge size="sm" color={STATUS_COLOR[report.status] ?? 'gray'} variant="light" radius="sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {report.status}
            </Badge>
          )}
          {workOrderUrl && (
            <Anchor href={workOrderUrl} target="_blank" size="xs" c="civic.4" underline="always"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconDownload size={12} /> Download PDF
            </Anchor>
          )}
        </Stack>
      </Group>

      <Group align="flex-start" gap="xl" wrap="wrap" grow>
        {/* ── Left column ───────────────────────────────────────────────── */}
        <Stack gap="lg" style={{ flex: 2, minWidth: 320 }}>

          {/* Map pin */}
          {lat && lng && (
            <Card p={0} radius="md" style={{ border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <Box style={{ position: 'relative' }}>
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  zoomControl={false}
                  style={{ height: 220, width: '100%' }}
                >
                  <TileLayer url={tileUrl} attribution={attribution} />
                  <Marker position={[lat, lng]} />
                </MapContainer>
                <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}>
                  <MapThemeToggle theme={theme} onToggle={toggleTheme} />
                </Box>
              </Box>
            </Card>
          )}

          {/* Description */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
              Description
            </Text>
            <Text size="sm" c="#d1d5db" lh={1.7}>{report.description}</Text>
          </Card>

          {/* Evidence images */}
          {report.evidences?.length > 0 && (
            <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                Evidence
              </Text>
              <Group gap="sm">
                {report.evidences.map((ev, i) => (
                  ev.fileType === 'image' ? (
                    <Image
                      key={i}
                      src={ev.fileUrl}
                      radius="md"
                      maw={280}
                      alt={`Evidence ${i + 1}`}
                      style={{ border: `1px solid ${BORDER}` }}
                    />
                  ) : (
                    <Box key={i}>
                      <video src={ev.fileUrl} controls
                        style={{ maxWidth: 280, borderRadius: 8, border: `1px solid ${BORDER}` }} />
                    </Box>
                  )
                ))}
              </Group>
            </Card>
          )}

          {/* Comment thread */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            {(() => {
              const publicComments = (report.comments ?? []).filter(
                c => !c.content?.startsWith('[Ward Official Feedback]')
              );
              return (
                <>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                    Discussion ({publicComments.length})
                  </Text>
                  <ScrollArea mah={320} mb="md" type="scroll" offsetScrollbars>
                    <Stack gap="md">
                      {publicComments.length === 0 && (
                        <Text size="sm" c="dimmed">No comments yet.</Text>
                      )}
                      {publicComments.map((c, i) => <CommentBubble key={c._id ?? i} comment={c} />)}
                    </Stack>
                  </ScrollArea>
                </>
              );
            })()}

            <Divider color={BORDER} mb="md" />

            <Textarea
              placeholder="Add an official note or update..."
              value={commentText}
              onChange={e => setCommentText(e.currentTarget.value)}
              minRows={3}
              styles={inputSm}
              mb="sm"
            />
            <Button
              fullWidth size="sm" radius="md" color="civic"
              loading={commenting}
              rightSection={<IconSend size={14} />}
              disabled={!commentText.trim()}
              onClick={handleComment}
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              Post Comment
            </Button>
          </Card>
        </Stack>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 240 }}>

          {/* Meta info */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
              Report Info
            </Text>
            <Stack gap={10}>
              <MetaRow label="Submitted by"  value={report.submittedBy?.name  ?? 'Anonymous'} />
              <MetaRow label="Field Worker"  value={report.fieldWorker?.name  ?? 'Not assigned yet'} />
              <MetaRow label="Ward"         value={report.wardId ?? '—'} />
              <MetaRow label="Submitted"    value={new Date(report.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} />
              {report.resolvedAt && (
                <MetaRow label="Resolved" value={new Date(report.resolvedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} />
              )}
            </Stack>
          </Card>

          {/* Priority bar */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <PriorityBar score={report.priorityScore} />
            <Group gap={16} mt="md">
              <Box ta="center">
                <Text size="xs" c="dimmed">Severity</Text>
                <Text size="sm" fw={700} c="white">{report.severity ?? '—'}</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Upvotes</Text>
                <Text size="sm" fw={700} c="white">{report.upvoteCount ?? report.upvotes?.length ?? 0}</Text>
              </Box>
            </Group>
          </Card>

          {/* ── Contextual action card — ward_official only ────────────── */}
          {user?.role === 'ward_official' && (
            <>
              {/* Open: instruct to use work order dispatch above */}
              {report.status === 'Open' && (
                <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                    Next Step
                  </Text>
                  <Text size="sm" c="#d1d5db" lh={1.6}>
                    Use the <strong style={{ color: '#fff' }}>Assign Worker</strong> button at the top to assign a field worker. The report status will automatically move to <strong style={{ color: '#f97316' }}>In Progress</strong>.
                  </Text>
                </Card>
              )}

              {/* In Progress, no proof yet */}
              {(report.status === 'In Progress' || report.status === 'Assigned') && !report.proofUrl && (
                <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                    Awaiting Proof of Fix
                  </Text>
                  <Text size="sm" c="#d1d5db" lh={1.6}>
                    The field worker has not yet submitted a proof photo. You will be able to mark this report as <strong style={{ color: '#2dd4bf' }}>Resolved</strong> once they do.
                  </Text>
                </Card>
              )}

              {/* In Progress WITH proof: approve or reject */}
              {(report.status === 'In Progress' || report.status === 'Assigned') && report.proofUrl && (
                <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                    Proof of Fix Received
                  </Text>
                  <Image
                    src={report.proofUrl}
                    radius="md"
                    mb="md"
                    style={{ border: `1px solid ${BORDER}` }}
                    alt="Proof of fix"
                  />

                  {/* ── Approve ── */}
                  <Text size="xs" c="dimmed" fw={600} mb={4}>Issue is fixed?</Text>
                  <Textarea
                    placeholder="Resolution note (optional)"
                    value={statusNote}
                    onChange={e => setStatusNote(e.currentTarget.value)}
                    minRows={2}
                    mb="sm"
                    styles={inputSm}
                  />
                  <Button
                    fullWidth size="sm" radius="md" color="teal"
                    loading={statusSaving}
                    onClick={handleMarkResolved}
                    rightSection={<IconCircleCheck size={14} />}
                    mb="md"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                  >
                    Mark as Resolved
                  </Button>

                  {/* ── Divider ── */}
                  <Divider
                    label={<Text size="xs" c="dimmed">or</Text>}
                    labelPosition="center"
                    color="rgba(255,255,255,0.07)"
                    mb="md"
                  />

                  {/* ── Reject / feedback ── */}
                  <Text size="xs" c="dimmed" fw={600} mb={4}>Issue not fixed? Send feedback.</Text>
                  <Textarea
                    placeholder="Describe what still needs to be done…"
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.currentTarget.value)}
                    minRows={2}
                    mb="sm"
                    styles={inputSm}
                  />
                  <Button
                    fullWidth size="sm" radius="md" color="orange"
                    loading={feedbackSaving}
                    disabled={!feedbackNote.trim()}
                    onClick={handleSendFeedback}
                    style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                  >
                    Send Feedback to Worker
                  </Button>
                </Card>
              )}
            </>
          )}

          {/* Admin: show proof photo if it exists (view only) */}
          {user?.role === 'system_admin' && report.proofUrl && (
            <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                Proof of Fix
              </Text>
              <Image
                src={report.proofUrl}
                radius="md"
                style={{ border: `1px solid ${BORDER}` }}
                alt="Proof of fix"
              />
            </Card>
          )}

          {/* Status history */}
          {report.statusHistory?.length > 0 && (
            <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
                Status History
              </Text>
              <Stack gap="xs">
                {[...report.statusHistory].reverse().map((h, i) => (
                  <Group key={i} gap="xs" align="flex-start">
                    <Box
                      style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                        background: h.status === 'Resolved' ? GREEN : h.status === 'In Progress' ? '#f97316' : '#6b7280',
                        flexShrink: 0,
                      }}
                    />
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" c="white" fw={600}>{h.status}</Text>
                      {h.note && <Text size="xs" c="dimmed" lh={1.4}>{h.note}</Text>}
                      <Text size="xs" c="dimmed" style={{ opacity: 0.5 }}>
                        {h.changedAt ? new Date(h.changedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </Text>
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}
        </Stack>
      </Group>
    </Box>
  );
}

// ─── Meta row helper ──────────────────────────────────────────────────────────
function MetaRow({ label, value }) {
  return (
    <Group justify="space-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
      <Text size="xs" c="dimmed" fw={500}>{label}</Text>
      <Text size="xs" c="white" fw={600} ta="right" maw={160} style={{ wordBreak: 'break-word' }}>{value}</Text>
    </Group>
  );
}
