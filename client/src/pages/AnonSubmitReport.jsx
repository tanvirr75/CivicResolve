import React, { useState, useCallback } from 'react';
import {
  Box, Title, Text, Button, Textarea, TextInput, Stack, Group,
  Stepper, Select, Modal, Card, Badge, ThemeIcon,
  FileButton, Image, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconMapPin, IconUpload, IconCircleCheck, IconShieldOff,
  IconArrowRight, IconArrowLeft, IconEye, IconFileReport,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import { useMapTheme } from '../hooks/useMapTheme';
import MapThemeToggle from '../components/MapThemeToggle';

// Leaflet icon fix
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const inputStyles = {
  input:  { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5' },
  label:  { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

const CATEGORIES = ['Road', 'Waste', 'Drainage', 'Lighting', 'Water', 'Other'];

function PinDropper({ onPin, pinPos }) {
  useMapEvents({ click(e) { onPin({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return pinPos ? <Marker position={[pinPos.lat, pinPos.lng]} /> : null;
}

export default function AnonSubmitReport() {
  const navigate = useNavigate();
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();

  const [active,      setActive]      = useState(0);
  const [pin,         setPin]         = useState(null);
  const [streetAddr,  setStreetAddr]  = useState('');
  const [geoLoading,  setGeoLoading]  = useState(false);
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error,       setError]       = useState(null);

  const [successModal, { open: openSuccess }] = useDisclosure(false);
  const [createdReport, setCreatedReport]     = useState(null);

  const canStep2 = !!pin;
  const canStep3 = title.trim().length >= 5 && description.trim().length >= 10 && !!category;

  // Reverse-geocode on pin
  const handlePin = useCallback(async (pos) => {
    setPin(pos);
    setStreetAddr('');
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=18&addressdetails=0`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        setStreetAddr(data.display_name ?? '');
      }
    } catch { /* silent */ }
    finally { setGeoLoading(false); }
  }, []);

  const handleFileChange = (f) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else    setPreview(null);
  };

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('description', description.trim());
      fd.append('latitude',    pin.lat);
      fd.append('longitude',   pin.lng);
      fd.append('category',    category);
      if (streetAddr)  fd.append('streetAddress', streetAddr);
      if (file)        fd.append('image', file);

      const res    = await API.post('/reports/anon', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const report = res.data.data?.report;
      setCreatedReport(report);
      openSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  }, [title, description, pin, category, streetAddr, file, openSuccess]);

  return (
    <Box style={{ background: '#0d0d0d', minHeight: '100vh', paddingBottom: 60 }}>

      {/* Header */}
      <Box style={{
        background: 'rgba(13,13,13,0.95)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '14px 24px',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Group justify="space-between" align="center">
          <Text component={Link} to="/" fw={700} size="lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif", textDecoration: 'none', letterSpacing: '-0.02em' }}>
            <span style={{ color: GREEN }}>Civic</span>
            <span style={{ color: '#fff' }}>Resolve</span>
          </Text>
          <Group gap="xs">
            <IconShieldOff size={14} color={GREEN} />
            <Text size="xs" c="dimmed">Anonymous Submission — No account required</Text>
          </Group>
        </Group>
      </Box>

      <Box maw={760} mx="auto" px="md" pt="xl">

        {/* Page heading */}
        <Box mb="xl">
          <Group gap="xs" mb={6}>
            <IconFileReport size={20} color={GREEN} />
            <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
              Submit an Anonymous Report
            </Title>
          </Group>
          <Text size="sm" c="dimmed">
            Your identity will not be recorded. You can track your report using the QR code shown after submission.
          </Text>
        </Box>

        {/* Anon notice */}
        <Alert
          icon={<IconShieldOff size={15} />}
          color="civic" variant="light" radius="md" mb="xl"
          style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}
        >
          <Text size="sm" c="civic.3">
            This form does not require login. No personal data is stored.{' '}
            <Text component="span" c="civic.4" fw={600}>
              You won't be able to track this report from a dashboard
            </Text>
            {' '}— save the QR code after submission instead.
          </Text>
        </Alert>

        {/* Stepper */}
        <Stepper
          active={active}
          color="civic"
          size="sm"
          mb="xl"
          styles={{
            stepLabel:       { color: '#e5e5e5', fontSize: '0.8rem' },
            stepDescription: { color: '#666',    fontSize: '0.72rem' },
            separator:       { background: BORDER },
          }}
        >
          <Stepper.Step label="Location"   description="Pin the issue" />
          <Stepper.Step label="Details"    description="Describe the issue" />
          <Stepper.Step label="Evidence"   description="Optional photo" />
          <Stepper.Step label="Submit"     description="Review & send" />
        </Stepper>

        {error && (
          <Alert color="red" radius="md" mb="xl"
            style={{ border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.06)' }}>
            <Text size="sm" c="red.4">{error}</Text>
          </Alert>
        )}

        {/* ── Step 0: Location ─────────────────────────────────────────────── */}
        {active === 0 && (
          <Card p="xl" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Group gap="xs" mb="md">
              <IconMapPin size={16} color={GREEN} />
              <Text size="sm" fw={600} c="white">Click the map to pin the issue location</Text>
            </Group>
            <Box style={{ height: 380, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <MapContainer
                center={[23.8103, 90.4125]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url={tileUrl} attribution={attribution} />
                <PinDropper onPin={handlePin} pinPos={pin} />
              </MapContainer>
              <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}>
                <MapThemeToggle theme={theme} onToggle={toggleTheme} />
              </Box>
            </Box>
            {pin && (
              <Alert icon={<IconCircleCheck size={14} />} color="civic" variant="light" radius="md" mt="md"
                style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}>
                <Text size="xs" c="civic.3">
                  {geoLoading ? 'Locating address…' : streetAddr || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
                </Text>
              </Alert>
            )}
            <Group justify="flex-end" mt="lg">
              <Button color="civic" radius="md" disabled={!canStep2}
                rightSection={<IconArrowRight size={14} />}
                onClick={() => setActive(1)}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                Continue
              </Button>
            </Group>
          </Card>
        )}

        {/* ── Step 1: Details ──────────────────────────────────────────────── */}
        {active === 1 && (
          <Card p="xl" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Stack gap="md">
              <TextInput
                label="Report Title"
                placeholder="e.g. Broken manhole cover on Main Street"
                value={title}
                onChange={e => setTitle(e.currentTarget.value)}
                maxLength={150}
                styles={inputStyles}
                required
              />
              <Textarea
                label="Description"
                placeholder="Describe the issue clearly — location, severity, how long it's been present…"
                value={description}
                onChange={e => setDescription(e.currentTarget.value)}
                minRows={4}
                maxLength={2000}
                styles={inputStyles}
                required
              />
              <Select
                label="Category"
                placeholder="Select the most relevant category"
                data={CATEGORIES}
                value={category}
                onChange={v => setCategory(v ?? '')}
                styles={inputStyles}
                required
              />
            </Stack>
            <Group justify="space-between" mt="xl">
              <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={14} />}
                onClick={() => setActive(0)}>Back</Button>
              <Button color="civic" radius="md" disabled={!canStep3}
                rightSection={<IconArrowRight size={14} />}
                onClick={() => setActive(2)}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                Continue
              </Button>
            </Group>
          </Card>
        )}

        {/* ── Step 2: Evidence ─────────────────────────────────────────────── */}
        {active === 2 && (
          <Card p="xl" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="sm" fw={600} c="white" mb="xs">Photo Evidence (optional)</Text>
            <Text size="xs" c="dimmed" mb="md">A photo helps the ward official assess and verify the issue faster.</Text>

            <FileButton onChange={handleFileChange} accept="image/jpeg,image/png,image/webp">
              {(props) => (
                <Button {...props} variant="outline" color="civic" radius="md" size="sm"
                  leftSection={<IconUpload size={14} />}
                  style={{ borderColor: GREEN_BDR }}>
                  {file ? 'Change photo' : 'Upload photo'}
                </Button>
              )}
            </FileButton>

            {preview && (
              <Box mt="md" style={{ maxWidth: 320 }}>
                <Image src={preview} radius="md" style={{ border: `1px solid ${BORDER}` }} />
                <Button size="xs" variant="subtle" color="red" mt="xs"
                  onClick={() => { setFile(null); setPreview(null); }}>
                  Remove
                </Button>
              </Box>
            )}

            <Group justify="space-between" mt="xl">
              <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={14} />}
                onClick={() => setActive(1)}>Back</Button>
              <Button color="civic" radius="md"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => setActive(3)}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                Review
              </Button>
            </Group>
          </Card>
        )}

        {/* ── Step 3: Review & Submit ───────────────────────────────────────── */}
        {active === 3 && (
          <Card p="xl" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="sm" fw={600} c="white" mb="lg">Review your report</Text>
            <Stack gap="sm" mb="xl">
              <Group gap="md">
                <ThemeIcon size={32} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
                  <IconMapPin size={16} />
                </ThemeIcon>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Location</Text>
                  <Text size="sm" c="white">{streetAddr || `${pin?.lat?.toFixed(5)}, ${pin?.lng?.toFixed(5)}`}</Text>
                </Box>
              </Group>
              <Group gap="md">
                <ThemeIcon size={32} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
                  <IconFileReport size={16} />
                </ThemeIcon>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Title</Text>
                  <Text size="sm" c="white">{title}</Text>
                </Box>
              </Group>
              <Group gap="md" wrap="nowrap" align="flex-start">
                <Box style={{ width: 32, flexShrink: 0 }} />
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Description</Text>
                  <Text size="sm" c="white" lh={1.5}>{description}</Text>
                </Box>
              </Group>
              <Group gap="sm">
                <Badge color="cyan" variant="dot">{category}</Badge>
                <Badge color="teal" variant="light" leftSection={<IconShieldOff size={10} />}>Anonymous</Badge>
                {file && <Badge color="blue" variant="light">Photo attached</Badge>}
              </Group>
            </Stack>

            <Alert icon={<IconShieldOff size={14} />} color="civic" variant="light" radius="md" mb="xl"
              style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}>
              <Text size="xs" c="civic.3">
                This will be submitted anonymously. Save the QR code you receive — it's your only way to track this report.
              </Text>
            </Alert>

            <Group justify="space-between">
              <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={14} />}
                onClick={() => setActive(2)}>Back</Button>
              <Button color="civic" radius="md" loading={submitLoading}
                rightSection={!submitLoading && <IconCircleCheck size={16} />}
                onClick={handleSubmit}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, boxShadow: `0 0 20px rgba(0,255,65,0.25)` }}>
                Submit Anonymously
              </Button>
            </Group>
          </Card>
        )}

        {/* Footer */}
        <Group justify="center" gap="xl" mt="xl">
          <Text size="xs" c="dimmed">
            Want to track all your reports?{' '}
            <Text component={Link} to="/register" size="xs" c="civic.4" style={{ textDecoration: 'none' }}>
              Create a free account →
            </Text>
          </Text>
        </Group>
      </Box>

      {/* ── Success modal ─────────────────────────────────────────────────────── */}
      <Modal
        opened={successModal}
        onClose={() => navigate('/')}
        title={
          <Group gap="xs">
            <IconCircleCheck size={20} color={GREEN} />
            <Text fw={700} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              Report Submitted
            </Text>
          </Group>
        }
        centered
        styles={{
          content: { background: '#1a1a1a', border: `1px solid ${GREEN_BDR}` },
          header:  { background: '#1a1a1a', borderBottom: `1px solid ${BORDER}` },
          close:   { color: '#666' },
        }}
      >
        <Stack gap="md" py="sm">
          <Alert icon={<IconCircleCheck size={15} />} color="civic" variant="light" radius="md"
            style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}>
            <Text size="sm" c="civic.3">
              Your report has been submitted and routed to the local ward. No personal data was recorded.
            </Text>
          </Alert>

          {createdReport?.qrCode && (
            <Box style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed" mb={8} tt="uppercase" fw={600} style={{ letterSpacing: '0.06em' }}>
                Scan to track this report
              </Text>
              <Box style={{ display: 'inline-block', background: '#fff', borderRadius: 8, padding: 8, boxShadow: `0 0 0 1px ${GREEN_BDR}` }}>
                <img src={createdReport.qrCode} alt="Report QR Code" style={{ width: 180, height: 180, display: 'block' }} />
              </Box>
              <Text size="xs" c="dimmed" mt={6}>Save this QR code — it links to your public report page</Text>
            </Box>
          )}

          <Group justify="center" gap="sm" wrap="wrap">
            {createdReport?.id && (
              <Button component={Link} to={`/reports/${createdReport.id}`}
                size="sm" color="civic" radius="md"
                rightSection={<IconEye size={14} />}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                View Report
              </Button>
            )}
            <Button variant="subtle" color="gray" size="sm" radius="md"
              onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </Group>

          <Text size="xs" c="dimmed" ta="center">
            Want to track all your reports from a dashboard?{' '}
            <Text component={Link} to="/register" size="xs" c="civic.4" style={{ textDecoration: 'none' }}>
              Create a free account
            </Text>
          </Text>
        </Stack>
      </Modal>
    </Box>
  );
}
