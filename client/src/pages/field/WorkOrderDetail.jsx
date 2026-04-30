import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, Badge, Card, Button,
  Skeleton, Alert, Anchor, Image, ThemeIcon, FileButton, Stepper,
} from '@mantine/core';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconArrowLeft, IconDownload, IconUpload, IconCircleCheck,
  IconAlertCircle, IconX, IconChevronRight,
} from '@tabler/icons-react';
import { useMapTheme } from '../../hooks/useMapTheme';
import MapThemeToggle from '../../components/MapThemeToggle';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.25)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5' },
};

// ─── WorkOrderDetail ──────────────────────────────────────────────────────────
export default function WorkOrderDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();

  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);

  // Proof upload state
  const [proofFile,  setProofFile]  = useState(null);
  const [proofPrev,  setProofPrev]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploaded,   setUploaded]   = useState(false);  // true after successful upload
  const [proofUrl,   setProofUrl]   = useState(null);

  // Resolve state
  const [resolving,  setResolving]  = useState(false);

  // Progress advance state
  const [advancing,  setAdvancing]  = useState(false);

  // Status order for stepper
  const STATUS_STEPS  = ['Pending', 'En Route', 'In Progress', 'Completed'];
  const stepIndex = (s) => STATUS_STEPS.indexOf(s ?? 'Pending');

  // ── Fetch work order ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await API.get(`/work-orders/${id}`);
        const wo  = res.data.data?.workOrder ?? res.data.data;
        setOrder(wo);
        if (wo?.status === 'Completed') setUploaded(true);
        if (wo?.proofUrl) setProofUrl(wo.proofUrl);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── File select handler ───────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    setProofFile(f);
    const reader = new FileReader();
    reader.onload = e => setProofPrev(e.target.result);
    reader.readAsDataURL(f);
  };

  // ── Upload proof → PUT /api/work-orders/:id/complete ─────────────────────
  const handleUpload = async () => {
    if (!proofFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', proofFile);

      const res = await API.put(`/work-orders/${id}/complete`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = res.data.data?.proofUrl;
      setProofUrl(url);
      setUploaded(true);
      setOrder(prev => ({ ...prev, status: 'Completed' }));
      notifications.show({
        title:   'Proof uploaded ✓',
        message: 'Work order marked as completed. Report auto-resolved.',
        color:   'civic',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        title:   'Upload failed',
        message: err.response?.data?.message ?? 'Could not upload proof.',
        color:   'red',
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Advance work order status ─────────────────────────────────────────────
  const handleAdvanceStatus = async () => {
    const current = order?.status ?? 'Pending';
    const next    = STATUS_STEPS[stepIndex(current) + 1];
    if (!next || next === 'Completed') return; // Completed is locked behind proof upload
    setAdvancing(true);
    try {
      const res = await API.put(`/work-orders/${id}/status`, { status: next });
      const updatedStatus = res.data.data?.status ?? next;
      setOrder(prev => ({ ...prev, status: updatedStatus }));
      notifications.show({
        title:   `Status: ${updatedStatus}`,
        message: 'Work order progress updated.',
        color:   'civic',
        autoClose: 3000,
      });
    } catch (err) {
      notifications.show({
        title:   'Update failed',
        message: err.response?.data?.message ?? 'Could not update status.',
        color:   'red',
      });
    } finally {
      setAdvancing(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box>
      <Skeleton height={32} width={220} mb="lg" />
      <Skeleton height={220} radius="md" mb="md" />
      <Skeleton height={140} radius="md" />
    </Box>
  );

  if (notFound || !order) return (
    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
      Work order not found.{' '}
      <Anchor component={Link} to="/field/dashboard" c="red.4" size="sm" underline="never">← Back</Anchor>
    </Alert>
  );

  const report = order.report ?? {};
  const lat    = report.latitude  ?? report.location?.coordinates?.[1];
  const lng    = report.longitude ?? report.location?.coordinates?.[0];

  return (
    <Box maw={860} mx="auto">
      {/* Back */}
      <Anchor component={Link} to="/field/dashboard" size="sm" c="dimmed" underline="never"
        mb="lg" display="flex" style={{ alignItems: 'center', gap: 6 }}>
        <IconArrowLeft size={14} /> Back to Dashboard
      </Anchor>

      {/* Title row */}
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            {report.title ?? 'Work Order'}
          </Title>
          <Group gap="xs" mt={6}>
            <Badge color={order.status === 'Completed' ? 'teal' : 'yellow'} variant="light">
              {order.status}
            </Badge>
            {report.category && (
              <Badge color="cyan" variant="dot" size="sm">{report.category}</Badge>
            )}
          </Group>
        </Box>

        {/* PDF download */}
        {order.pdfUrl && (
          <Button
            component="a"
            href={order.pdfUrl}
            target="_blank"
            size="sm"
            radius="md"
            variant="outline"
            color="civic"
            leftSection={<IconDownload size={15} />}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Download Work Order PDF
          </Button>
        )}
      </Group>

      <Group align="flex-start" gap="xl" wrap="wrap" grow>
        {/* ── Left: map + description ───────────────────────────────────── */}
        <Stack gap="lg" style={{ flex: 2, minWidth: 300 }}>
          {lat && lng && (
            <Card p={0} radius="md" style={{ border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <Box style={{ position: 'relative' }}>
                <MapContainer
                  center={[lat, lng]} zoom={15} zoomControl={false}
                  style={{ height: 220, width: '100%' }}
                >
                  <TileLayer url={tileUrl} attribution={attribution} />
                  <Marker position={[lat, lng]} />
                </MapContainer>
                <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}>
                  <MapThemeToggle theme={theme} onToggle={toggleTheme} />
                </Box>
              </Box>
              <Box p="sm">
                <Group gap={6}>
                  <Text size="xs" c="dimmed">Coordinates:</Text>
                  <Text size="xs" c="white" fw={600} style={{ fontFamily: 'monospace' }}>
                    {lat?.toFixed(5)}, {lng?.toFixed(5)}
                  </Text>
                </Group>
              </Box>
            </Card>
          )}

          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
              Issue Description
            </Text>
            <Text size="sm" c="#d1d5db" lh={1.7}>
              {report.description ?? 'No description provided.'}
            </Text>
          </Card>

          {/* Original evidence */}
          {report.evidences?.length > 0 && (
            <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                Original Evidence
              </Text>
              <Group gap="sm">
                {report.evidences.map((ev, i) => (
                  <Image key={i} src={ev.fileUrl} radius="md" maw={240} alt={`Evidence ${i + 1}`}
                    style={{ border: `1px solid ${BORDER}` }} />
                ))}
              </Group>
            </Card>
          )}

          {/* Notes from ward official */}
          {order.notes && (
            <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm" style={{ letterSpacing: '0.06em' }}>
                Notes from Ward Official
              </Text>
              <Text size="sm" c="#d1d5db" lh={1.6}>{order.notes}</Text>
            </Card>
          )}
        </Stack>

        {/* ── Right: progress stepper + proof upload + resolve ────────────────── */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 260 }}>

          {/* Progress Stepper */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
              Progress
            </Text>
            <Stepper
              active={stepIndex(order.status)}
              color="civic"
              size="sm"
              orientation="vertical"
              styles={{
                stepIcon:        { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#aaa' },
                stepLabel:       { color: '#ccc', fontSize: '0.82rem', fontWeight: 600 },
                stepDescription: { color: '#555', fontSize: '0.75rem' },
                separator:       { background: BORDER },
              }}
            >
              <Stepper.Step label="Pending"     description="Work order received" />
              <Stepper.Step label="En Route"    description="Heading to the site" />
              <Stepper.Step label="In Progress" description="Working on the fix" />
              <Stepper.Step label="Completed"   description="Issue resolved" />
            </Stepper>

            {/* Advance Status Button — hidden when Completed */}
            {order.status !== 'Completed' && (
              <Button
                fullWidth mt="md" size="sm" radius="md" variant="outline" color="civic"
                loading={advancing}
                disabled={stepIndex(order.status) >= STATUS_STEPS.indexOf('In Progress')}
                rightSection={!advancing && <IconChevronRight size={14} />}
                onClick={handleAdvanceStatus}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
              >
                {advancing ? 'Updating…' : `Advance to "${STATUS_STEPS[stepIndex(order.status) + 1] ?? 'Complete'}"`}
              </Button>
            )}
          </Card>

          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
              Upload Proof of Fix
            </Text>

            <Stack gap="md">
              {/* ── Existing proof (completed order) ── */}
              {uploaded && proofUrl && (
                <Alert
                  icon={<IconCircleCheck size={15} />}
                  color="civic" variant="light" radius="md"
                  style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}
                >
                  <Text size="xs" c="civic.3" mb={8}>
                    Proof uploaded — work order <strong>Completed</strong>.
                  </Text>
                  <Image src={proofUrl} radius="md" maw={220} mb={6}
                    style={{ border: `1px solid ${GREEN_BDR}` }} />
                  <Anchor href={proofUrl} target="_blank" size="xs" c="civic.4"
                    display="block" underline="always">
                    Open full image →
                  </Anchor>
                </Alert>
              )}

              {uploaded && !proofUrl && (
                <Alert
                  icon={<IconCircleCheck size={15} />}
                  color="civic" variant="light" radius="md"
                  style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}
                >
                  <Text size="xs" c="civic.3">
                    Work order is <strong>Completed</strong>. Proof was submitted.
                  </Text>
                </Alert>
              )}

              {/* ── Drop zone — always visible for (re-)upload ── */}
              <Card
                p="lg" radius="md"
                style={{
                  background: proofFile ? GREEN_DIM : 'rgba(255,255,255,0.02)',
                  border: `2px dashed ${proofFile ? GREEN_BDR : BORDER}`,
                  textAlign: 'center',
                  transition: 'border-color .2s',
                }}
              >
                {proofPrev ? (
                  <Box style={{ position: 'relative', display: 'inline-block' }}>
                    <Image src={proofPrev} radius="md" maw={200} mx="auto" />
                    <Button
                      size="xs" color="red" variant="filled" radius="xl" mt="xs"
                      leftSection={<IconX size={11} />}
                      onClick={() => { setProofFile(null); setProofPrev(null); }}
                    >
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Stack align="center" gap="sm">
                    <ThemeIcon size={48} radius="xl"
                      style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
                      <IconUpload size={22} />
                    </ThemeIcon>
                    <Text size="xs" c="dimmed">
                      {uploaded ? 'Replace proof photo' : 'Photo showing the resolved issue'}
                    </Text>
                    <FileButton onChange={handleFile} accept="image/*">
                      {(props) => (
                        <Button {...props} size="xs" variant="outline" color="civic" radius="md">
                          {uploaded ? 'Choose replacement' : 'Choose photo'}
                        </Button>
                      )}
                    </FileButton>
                  </Stack>
                )}
              </Card>

              {proofFile && (
                <Text size="xs" c="dimmed" ta="center">
                  {proofFile.name} · {(proofFile.size / 1024).toFixed(0)} KB
                </Text>
              )}

              <Button
                fullWidth size="sm" radius="md" color="civic"
                loading={uploading}
                disabled={!proofFile}
                onClick={handleUpload}
                rightSection={!uploading && <IconUpload size={14} />}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  boxShadow: proofFile ? `0 0 18px rgba(0,255,65,0.2)` : 'none',
                }}
              >
                {uploading ? 'Uploading…' : uploaded ? 'Replace & Re-submit Proof' : 'Submit Proof & Mark Resolved'}
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                {uploaded
                  ? 'You can replace the proof photo if needed.'
                  : 'Submitting proof will automatically resolve the report.'}
              </Text>
            </Stack>
          </Card>

          {/* Work order meta */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
              Order Details
            </Text>
            <Stack gap={10}>
              {[
                { label: 'Order ID',    value: order._id?.slice(-8) },
                { label: 'Assigned by', value: order.assignedBy?.name ?? '—' },
                { label: 'Created',     value: new Date(order.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) },
                { label: 'Status',      value: order.status },
              ].map(r => (
                <Group key={r.label} justify="space-between"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                  <Text size="xs" c="dimmed">{r.label}</Text>
                  <Text size="xs" c="white" fw={600}>{r.value}</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Group>
    </Box>
  );
}
