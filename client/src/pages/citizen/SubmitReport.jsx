import React, { useState, useCallback } from 'react';
import {
  Box, Title, Text, Button, Textarea, TextInput, Stack, Group,
  Stepper, Switch, Modal, Anchor, Card, Badge, ThemeIcon,
  FileButton, Image, Alert, ActionIcon, Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconMapPin, IconUpload, IconCircleCheck,
  IconAlertCircle, IconX, IconArrowRight, IconArrowLeft,
  IconEye, IconCopy, IconAlertTriangle,
} from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import API from '../../services/api';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
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

const inputStyles = {
  input:  { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontFamily: "'Inter', sans-serif" },
  label:  { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

// ─── Severity config (FR-08) ──────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  1: { label: 'Very Low', color: 'gray'   },
  2: { label: 'Low',      color: 'green'  },
  3: { label: 'Minor',    color: 'teal'   },
  4: { label: 'Moderate', color: 'blue'   },
  5: { label: 'Noticeable', color: 'yellow' },
  6: { label: 'Significant', color: 'orange' },
  7: { label: 'High',     color: 'pink'   },
  8: { label: 'Severe',   color: 'red'    },
  9: { label: 'Critical', color: 'darkred'},
  10:{ label: 'Emergency',color: 'purple' },
};

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = ['Location', 'Details', 'Evidence', 'Review & Submit'];

// ─── Pin dropper ──────────────────────────────────────────────────────────────
function PinDropper({ onPin, pinPos }) {
  useMapEvents({ click(e) { onPin({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return pinPos ? <Marker position={[pinPos.lat, pinPos.lng]} /> : null;
}

// ─── Status color for duplicate card ─────────────────────────────────────────
const STATUS_COLOR = { Open: 'yellow', Assigned: 'blue', 'In Progress': 'orange', Resolved: 'teal' };

// ─── SubmitReport ─────────────────────────────────────────────────────────────
export default function SubmitReport() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const startAnon      = searchParams.get('anonymous') === 'true';

  // ── Stepper ───────────────────────────────────────────────────────────────
  const [active, setActive] = useState(0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [pin,         setPin]         = useState(null);
  const [streetAddress, setStreetAddress] = useState('');   // reverse-geocoded
  const [geoLoading,  setGeoLoading]  = useState(false);   // Nominatim in-flight
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [anonymous,   setAnonymous]   = useState(startAnon);
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);   // FR-09 flag
  const [severity,    setSeverity]    = useState(null);    // FR-08 score 1-5

  // ── Loading / error ───────────────────────────────────────────────────────
  const [aiCatLoading,  setAiCatLoading]  = useState(false);
  const [aiSevLoading,  setAiSevLoading]  = useState(false);  // FR-08 spinner
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error,         setError]         = useState(null);

  // ── Duplicate modal state (FR-09) ──────────────────────────────────────────
  const [dupModal,  { open: openDup,  close: closeDup }]  = useDisclosure(false);
  const [dupReport, setDupReport] = useState(null);   // nearest duplicate
  const [dupDist,   setDupDist]   = useState(null);   // metres

  // ── Success modal ─────────────────────────────────────────────────────────
  const [successModal, { open: openSuccess }] = useDisclosure(false);
  const [createdReport, setCreatedReport]     = useState(null);

  // ── Guards ────────────────────────────────────────────────────────────────
  const canGoStep2 = !!pin;
  const canGoStep3 = title.trim().length >= 5 && description.trim().length >= 10;

  // ── Draft state (FR-19) ───────────────────────────────────────────────────
  const [draftId,   setDraftId]   = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();

  // Pre-fill from location.state.draft when navigating from DraftsPage
  React.useEffect(() => {
    const draft = location.state?.draft;
    if (!draft) return;
    if (draft.title)            setTitle(draft.title);
    if (draft.description)      setDescription(draft.description);
    if (draft.category)         setCategory(draft.category);
    if (draft.anonymous != null) setAnonymous(draft.anonymous);
    if (draft.pin)              setPin(draft.pin);
    if (draft.severity)         setSeverity(draft.severity);
    if (draft.draftId)          setDraftId(draft.draftId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track browser online/offline state
  React.useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Save draft to localStorage ────────────────────────────────────────────
  const DRAFT_KEY = 'civicresolve_drafts';
  const saveDraft = useCallback(() => {
    const existing = (() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '[]'); } catch { return []; } })();
    const id       = draftId ?? (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `draft_${Date.now()}`);
    const draft    = { draftId: id, title, description, category, anonymous, pin, severity, isDuplicate, isSynced: false, createdAt: new Date().toISOString() };
    const updated  = existing.some(d => d.draftId === id)
      ? existing.map(d => d.draftId === id ? draft : d)
      : [draft, ...existing];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    setDraftId(id);
    notifications.show({ title: 'Draft saved ✓', message: 'Find it in My Drafts.', color: 'civic', autoClose: 3000 });
  }, [draftId, title, description, category, anonymous, pin, severity, isDuplicate]);

  // ─────────────────────────────────────────────────────────────────────────
  // FR-09: Duplicate detection — fires after pin is set
  // ─────────────────────────────────────────────────────────────────────────
  const handlePin = useCallback(async (pos) => {
    setPin(pos);
    setDupReport(null);
    setIsDuplicate(false);
    setStreetAddress('');

    // ── Reverse-geocode via Nominatim (no API key needed) ──
    setGeoLoading(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=18&addressdetails=0`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        setStreetAddress(geoData.display_name ?? '');
      }
    } catch {
      // Silent — address display is non-critical
    } finally {
      setGeoLoading(false);
    }

    // ── FR-09: Duplicate detection ───────────────────────────────
    try {
      const res  = await API.get('/reports/nearby', {
        params: { lat: pos.lat, lng: pos.lng, radius: 30 },
      });
      const list = res.data.data?.reports ?? [];

      if (list.length > 0) {
        // Pick the nearest report (first in list — backend sorts by $near distance)
        const nearest = list[0];

        // Rough distance (Haversine approximation good enough for UI label)
        const R   = 6371000;
        const dLat = ((nearest.latitude ?? nearest.location?.coordinates?.[1]) - pos.lat) * (Math.PI / 180);
        const dLng = ((nearest.longitude ?? nearest.location?.coordinates?.[0]) - pos.lng) * (Math.PI / 180);
        const a   = Math.sin(dLat / 2) ** 2 +
          Math.cos(pos.lat * (Math.PI / 180)) * Math.cos(((nearest.latitude ?? pos.lat)) * (Math.PI / 180)) *
          Math.sin(dLng / 2) ** 2;
        const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

        setDupReport(nearest);
        setDupDist(dist);
        openDup();
      }
    } catch {
      // Silently skip — never block the user
    }
  }, [openDup]);

  // ─────────────────────────────────────────────────────────────────────────
  // AI auto-categorize on description blur
  // ─────────────────────────────────────────────────────────────────────────
  const handleDescriptionBlur = useCallback(async () => {
    if (description.trim().length < 15 || category) return;
    setAiCatLoading(true);
    try {
      const res = await API.post('/ai/categorize', { description });
      const cat = res.data?.data?.category ?? res.data?.category;
      if (cat) {
        setCategory(cat);
        notifications.show({ title: 'AI Categorized ✓', message: `Category set to "${cat}"`, color: 'civic', autoClose: 3000 });
      }
    } catch { /* silent */ }
    finally { setAiCatLoading(false); }
  }, [description, category]);

  // ─────────────────────────────────────────────────────────────────────────
  // FR-08: File pick + severity estimation
  // Uses Promise-based FileReader to avoid the async state-read race condition.
  // Sends the base64 data URL directly to /ai/severity (no pre-upload needed).
  // ─────────────────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setSeverity(null);

    // Wait for FileReader and capture data URL synchronously in the closure
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = e => { setPreview(e.target.result); resolve(e.target.result); };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    });

    // Only attempt AI severity for images
    if (!f.type.startsWith('image/') || !dataUrl) return;

    setAiSevLoading(true);
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10000);

    try {
      const sevRes = await API.post(
        '/ai/severity',
        { imageUrl: dataUrl, description: description || '' },
        { signal: controller.signal }
      );

      const score = sevRes.data?.data?.severity ?? sevRes.data?.severity;
      if (score && score >= 1 && score <= 10) {
        setSeverity(Number(score));
        const cfg = SEVERITY_CONFIG[Number(score)];
        notifications.show({
          title:    `Severity: ${cfg.label}`,
          message:  'AI estimated severity from your uploaded image.',
          color:    cfg.color,
          autoClose: 4000,
        });
      }
    } catch {
      // Timed out or AI unavailable — severity stays null, report still submittable
    } finally {
      clearTimeout(timeout);
      setAiSevLoading(false);
    }
  }, [description]);

  // Final submit — with offline guard (FR-19)
  const handleSubmit = useCallback(async () => {
    // Offline guard: save as draft instead of hitting the API
    if (!navigator.onLine) {
      saveDraft();
      notifications.show({
        title:    "You're offline",
        message:  "Report saved as draft and will sync when you're back online.",
        color:   'orange',
        autoClose: 5000,
      });
      return;
    }
    setError(null);
    setSubmitLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('description', description.trim());
      fd.append('latitude',    pin.lat);
      fd.append('longitude',   pin.lng);
      fd.append('isAnonymous', anonymous ? 'true' : 'false');
      if (category)       fd.append('category',      category);
      if (streetAddress)  fd.append('streetAddress', streetAddress);
      if (file)           fd.append('image',         file);
      if (isDuplicate)    fd.append('isDuplicate', 'true');
      if (severity)       fd.append('severity',    severity);

      const res    = await API.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const report = res.data.data?.report ?? res.data.data;
      setCreatedReport(report);
      openSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitLoading(false);
    }

  }, [title, description, pin, anonymous, category, file, isDuplicate, severity, openSuccess]);

  // ─── Step panels ────────────────────────────────────────────────────────────
  const stepContent = [

    // ── Step 0: Location ─────────────────────────────────────────────────────
    <Stack key="loc" gap="md">
      <Text size="sm" c="dimmed">
        Click anywhere on the map to drop a pin at the issue location.
      </Text>

      {!pin && (
        <Alert icon={<IconMapPin size={15} />} color="yellow" variant="light" radius="md"
          style={{ border: '1px solid rgba(255,210,0,0.2)' }}>
          No location selected — click the map to place your pin.
        </Alert>
      )}

      {pin && (
        <Alert icon={<IconCircleCheck size={15} />} color="civic" variant="light" radius="md"
          style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}>
          <Text size="xs" c="civic.3">
            Pin placed at <strong>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</strong>
            {isDuplicate && (
              <Badge size="xs" color="orange" variant="light" ml="sm">Possible duplicate</Badge>
            )}
          </Text>
          {/* Street address line */}
          {geoLoading && (
            <Text size="xs" c="dimmed" mt={4} style={{ fontStyle: 'italic' }}>📍 Looking up address…</Text>
          )}
          {!geoLoading && streetAddress && (
            <Text size="xs" c="dimmed" mt={4} lineClamp={2}>📍 {streetAddress}</Text>
          )}
        </Alert>
      )}

      <Box style={{ height: 380, borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        <MapContainer center={[23.8103, 90.4125]} zoom={13}
          style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <PinDropper onPin={handlePin} pinPos={pin} />
        </MapContainer>
      </Box>

      {/* Helper text — FR-09 */}
      <Text size="xs" c="dimmed" ta="center" style={{ fontStyle: 'italic' }}>
        We'll check for nearby duplicate reports automatically.
      </Text>

      <Switch
        label="Submit anonymously"
        checked={anonymous}
        onChange={e => setAnonymous(e.currentTarget.checked)}
        color="civic"
        styles={{ label: { color: '#aaa', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem' } }}
      />
    </Stack>,

    // ── Step 1: Details ───────────────────────────────────────────────────────
    <Stack key="det" gap="md">
      <TextInput
        label="Report title"
        placeholder="e.g. Large pothole on Main Street near Bus Stop 12"
        value={title}
        onChange={e => setTitle(e.currentTarget.value)}
        styles={inputStyles}
        description="Keep it short and specific — min. 5 characters"
      />
      <Textarea
        label="Description"
        placeholder="Describe the issue in detail — the AI will auto-categorize it..."
        value={description}
        onChange={e => setDescription(e.currentTarget.value)}
        onBlur={handleDescriptionBlur}
        minRows={5}
        styles={inputStyles}
        description="Min. 10 characters · Description is analyzed by AI on blur"
        rightSection={aiCatLoading && <Text size="xs" c="civic.4" pr="xs">AI thinking…</Text>}
      />
      <TextInput
        label="Category"
        placeholder="Auto-filled by AI — or type manually"
        value={category}
        onChange={e => setCategory(e.currentTarget.value)}
        styles={inputStyles}
        description="AI categorizes: Road, Waste, Drainage, Lighting, Safety, Parks…"
        rightSection={category && <Badge size="xs" color="civic" variant="dot">{category}</Badge>}
      />
    </Stack>,

    // ── Step 2: Evidence + AI Severity (FR-08) ────────────────────────────────
    <Stack key="ev" gap="md">
      <Text size="sm" c="dimmed">
        Upload a photo or short video as evidence. (Optional but recommended)
      </Text>

      <Card p="xl" radius="md"
        style={{
          background: CARD_BG,
          border: `2px dashed ${file ? GREEN_BDR : BORDER}`,
          textAlign: 'center',
          transition: 'border-color 0.2s',
        }}
      >
        {/* AI severity spinner overlay */}
        {aiSevLoading && (
          <Box mb="md">
            <Group justify="center" gap="sm">
              <Loader size="sm" color="civic" />
              <Text size="xs" c="civic.4">AI estimating severity…</Text>
            </Group>
          </Box>
        )}

        {preview ? (
          <Stack align="center" gap="md">
            <Box style={{ position: 'relative', display: 'inline-block' }}>
              <Image src={preview} radius="md" maw={320} mx="auto" />
              <ActionIcon
                size="sm" color="red" variant="filled" radius="xl"
                style={{ position: 'absolute', top: -8, right: -8 }}
                onClick={() => { setFile(null); setPreview(null); setSeverity(null); }}
              >
                <IconX size={12} />
              </ActionIcon>
            </Box>

            {/* Severity badge — shown after AI returns */}
            {severity && !aiSevLoading && (() => {
              const cfg = SEVERITY_CONFIG[severity];
              return (
                <Stack gap={4} align="center">
                  <Group gap="xs" justify="center">
                    <Badge size="md" color={cfg.color} variant="filled" radius="sm">
                      Severity: {cfg.label}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                    AI estimated severity based on the uploaded image
                  </Text>
                </Stack>
              );
            })()}

            {/* Still loading but we have a preview */}
            {aiSevLoading === false && !severity && file?.type?.startsWith('image/') && (
              <Text size="xs" c="dimmed">Severity analysis unavailable.</Text>
            )}
          </Stack>
        ) : (
          <Stack align="center" gap="sm">
            <ThemeIcon size={56} radius="xl"
              style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
              <IconUpload size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              Image or video evidence (JPG, PNG, MP4 · max 10MB)
            </Text>
            <FileButton onChange={handleFile} accept="image/*,video/*">
              {(props) => (
                <Button {...props} size="xs" variant="outline" color="civic" radius="md">
                  Choose file
                </Button>
              )}
            </FileButton>
          </Stack>
        )}
      </Card>

      {file && (
        <Text size="xs" c="dimmed" ta="center">
          Selected: <strong style={{ color: '#e5e5e5' }}>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)
        </Text>
      )}
    </Stack>,

    // ── Step 3: Review & Submit ───────────────────────────────────────────────
    <Stack key="rev" gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={15} />} color="red" variant="light" radius="md"
          withCloseButton onClose={() => setError(null)}
          style={{ border: '1px solid rgba(255,80,80,0.2)' }}>
          {error}
        </Alert>
      )}

      <Card p="md" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Stack gap="xs">
          <ReviewRow label="Location"
            value={streetAddress
              ? <Text size="sm" c="white" fw={500} lineClamp={2}>📍 {streetAddress}</Text>
              : pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : '—'
            }
          />
          <ReviewRow label="Title"       value={title || '—'} />
          <ReviewRow label="Category"    value={category || 'Pending AI'} />
          <ReviewRow label="Anonymous"   value={anonymous ? 'Yes' : 'No'} />
          <ReviewRow label="Evidence"    value={file ? file.name : 'None attached'} />

          {/* Severity row — FR-08 */}
          <ReviewRow
            label="Severity (AI)"
            value={
              severity
                ? <Badge size="sm" color={SEVERITY_CONFIG[severity].color} variant="filled" radius="sm">
                    {SEVERITY_CONFIG[severity].label} ({severity}/10)
                  </Badge>
                : 'Not estimated'
            }
          />

          {/* Duplicate flag row — FR-09 */}
          {isDuplicate && (
            <ReviewRow
              label="Note"
              value={
                <Badge size="sm" color="orange" variant="light" leftSection={<IconAlertTriangle size={11} />}>
                  Possible duplicate
                </Badge>
              }
            />
          )}
        </Stack>
      </Card>

      <Button
        fullWidth size="md" color="civic" radius="md"
        loading={submitLoading}
        rightSection={!submitLoading && <IconCircleCheck size={16} />}
        onClick={handleSubmit}
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, boxShadow: `0 0 20px rgba(0,255,65,0.25)` }}
      >
        Submit Report
      </Button>
    </Stack>,
  ];

  return (
    <Box maw={720} mx="auto">
      <Title order={2} mb={4}
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
        Submit a Report
      </Title>
      <Text size="sm" c="dimmed" mb="xl">
        Complete all four steps to submit your civic issue report.
      </Text>

      {/* Offline banner */}
      {isOffline && (
        <Alert icon={<IconAlertCircle size={15} />} color="orange" variant="light" radius="md" mb="md"
          style={{ border: '1px solid rgba(251,146,60,0.3)' }}>
          <Text size="xs" fw={600} c="orange.3">
            You're offline — your report will be saved as a draft and submitted when you're back online.
          </Text>
        </Alert>
      )}

      {/* Stepper — visually prominent progress indicator */}
      <Stepper
        active={active}
        color="civic"
        mb="xl"
        size="sm"
        styles={{
          root:      { background: 'transparent' },
          stepIcon: {
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER}`,
            color: '#555',
            fontFamily: "'Space Grotesk', sans-serif",
          },
          stepCompletedIcon: { color: GREEN },
          stepLabel:  { color: '#aaa', fontSize: '0.8rem', fontFamily: "'Space Grotesk', sans-serif" },
          stepDescription: { color: '#555', fontSize: '0.72rem' },
          separator: {
            background: `linear-gradient(to right, ${GREEN}44, ${BORDER})`,
            height: 1,
          },
          // Active step override via data-active
          step: {
            '&[data-progress] .mantine-Stepper-stepIcon': {
              border: `1.5px solid ${GREEN}`,
              boxShadow: `0 0 12px rgba(0,255,65,0.35)`,
              color: GREEN,
            },
          },
        }}
      >
        {STEPS.map((label, i) => (
          <Stepper.Step
            key={label}
            label={label}
            description={`Step ${i + 1} of ${STEPS.length}`}
          />
        ))}
      </Stepper>


      {/* Step content */}
      <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} mb="lg">
        {stepContent[active]}
      </Card>

      {/* Nav buttons */}
      <Group justify="space-between" mt="md">
        <Group gap="sm">
          <Button variant="subtle" color="civic" radius="md" size="sm"
            leftSection={<IconArrowLeft size={15} />}
            disabled={active === 0}
            onClick={() => setActive(a => a - 1)}>
            Back
          </Button>
          {/* Save Draft button — available on every step */}
          <Button variant="subtle" color="gray" radius="md" size="sm"
            onClick={saveDraft}>
            Save Draft
          </Button>
        </Group>
        {active < STEPS.length - 1 && (
          <Button color="civic" radius="md" size="sm"
            rightSection={<IconArrowRight size={15} />}
            disabled={(active === 0 && !canGoStep2) || (active === 1 && !canGoStep3)}
            onClick={() => setActive(a => a + 1)}>
            Continue
          </Button>
        )}
      </Group>

      {/* ── FR-09: Duplicate Detection Modal ──────────────────────────────── */}
      <Modal
        opened={dupModal}
        onClose={() => {}}           // cannot be dismissed by clicking outside
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        title={
          <Group gap="xs">
            <IconCopy size={18} color="#f59e0b" />
            <Text fw={700} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              Similar Report Found Nearby
            </Text>
          </Group>
        }
        centered
        styles={{
          content: { background: '#1a1a1a', border: '1px solid rgba(245,158,11,0.3)' },
          header:  { background: '#1a1a1a', borderBottom: `1px solid ${BORDER}` },
        }}
      >
        {dupReport && (
          <Stack gap="md" py="sm">
            <Text size="sm" c="dimmed">
              We found a report just <strong style={{ color: '#f59e0b' }}>{dupDist}m away</strong>.
              Consider upvoting it instead of creating a duplicate.
            </Text>

            {/* Nearest duplicate mini-card */}
            <Card p="md" radius="md"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Group justify="space-between" mb={6}>
                {dupReport.category && (
                  <Badge size="xs" color="cyan" variant="dot">{dupReport.category}</Badge>
                )}
                <Group gap={6}>
                  <Badge size="xs" color={STATUS_COLOR[dupReport.status] ?? 'gray'} variant="light">
                    {dupReport.status}
                  </Badge>
                  <Badge size="xs" color="orange" variant="light">
                    {dupDist}m away
                  </Badge>
                </Group>
              </Group>
              <Text size="sm" fw={600} c="white" lineClamp={2}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {dupReport.title}
              </Text>
            </Card>

            <Group justify="flex-end" gap="sm" mt="xs">
              {/* Submit Anyway */}
              <Button
                variant="outline" color="civic" size="sm" radius="md"
                onClick={() => { setIsDuplicate(true); closeDup(); }}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Submit Anyway
              </Button>

              {/* View & Upvote */}
              <Button
                component={Link}
                to={`/reports/${dupReport._id}`}
                size="sm" radius="md"
                color="civic"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  background: GREEN,
                  color: '#000',
                  boxShadow: `0 0 16px rgba(0,255,65,0.3)`,
                }}
                onClick={closeDup}
              >
                View & Upvote
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ── Success modal ──────────────────────────────────────────────────── */}
      <Modal
        opened={successModal}
        onClose={() => navigate('/citizen/dashboard')}
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
              Your report has been submitted and is being processed by the AI pipeline.
            </Text>
          </Alert>
          {createdReport?._id && (
            <Text size="sm" c="dimmed">
              Report ID:{' '}
              <Text component="span" c="white" fw={600} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {createdReport._id}
              </Text>
            </Text>
          )}
          <Group>
            {createdReport?._id && (
              <Button component={Link} to={`/reports/${createdReport._id}`}
                size="sm" color="civic" radius="md"
                rightSection={<IconEye size={14} />}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                View Report
              </Button>
            )}
            <Button variant="subtle" color="civic" size="sm" radius="md"
              onClick={() => navigate('/citizen/dashboard')}>
              Go to Dashboard
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

// ─── Review row helper ────────────────────────────────────────────────────────
function ReviewRow({ label, value }) {
  return (
    <Group justify="space-between" py={4} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text size="sm" c="white" fw={500}>{value}</Text>
        : value
      }
    </Group>
  );
}
