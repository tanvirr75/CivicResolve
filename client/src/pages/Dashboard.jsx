import React, { useState, useEffect } from 'react';
import { Group, Title, Text, Card, Badge, Stack, ScrollArea, Switch, Button, Box } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconFlame, IconArrowRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import API from '../services/api';
import ReportDetailsDrawer from '../components/ReportDetailsDrawer';

// ── Leaflet default icon fix ────────────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ── Heatmap layer ────────────────────────────────────────────────────────────
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    import('leaflet.heat').then(() => {
      if (L.heatLayer) {
        const heat = L.heatLayer(points, {
          radius: 25, blur: 15, maxZoom: 15,
          gradient: { 0.4: '#00FF41', 0.7: '#ffff00', 1.0: '#ff0000' },
        }).addTo(map);
        return () => map.removeLayer(heat);
      }
    });
  }, [map, points]);
  return null;
};

// ── Camera fly-to ────────────────────────────────────────────────────────────
const FlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16, { duration: 1.4 }); }, [center, map]);
  return null;
};

// ── Status colour helper ─────────────────────────────────────────────────────
const statusColor = (s) =>
  s === 'Resolved' ? 'teal' : s === 'In Progress' ? 'blue' : 'orange';

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [reports,    setReports]    = useState([]);
  const [heatmap,    setHeatmap]    = useState(true);
  const [mapCenter,  setMapCenter]  = useState([23.8103, 90.4125]);
  const [drawerId,   setDrawerId]   = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch reports
  useEffect(() => {
    if (!window.L) window.L = L;
    API.get('/reports')
      .then(res => setReports(res.data.data.reports ?? []))
      .catch(err => console.error('Dashboard fetch error:', err));
  }, []);

  const heatPoints = reports
    .filter(r => r?.location?.coordinates)
    .map(r => [r.location.coordinates[1], r.location.coordinates[0], 1]);

  const openDrawer = (id) => { setDrawerId(id); setDrawerOpen(true); };

  return (
    // Full-screen command centre — outer Box sits inside AppShell.Main padding
    <Box
      style={{
        position: 'relative',
        height: 'calc(100vh - 58px - 32px)', // viewport minus header and md padding
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#0d0d0d',
      }}
    >
      {/* ── Full-bleed map ───────────────────────────────────────────────── */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        zoomControl={false}
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FlyTo center={mapCenter} />
        {heatmap && <HeatmapLayer points={heatPoints} />}
        {!heatmap && reports.map(report => {
          if (!report?.location?.coordinates) return null;
          const [lng, lat] = report.location.coordinates;
          return (
            <Marker key={report._id} position={[lat, lng]}>
              <Popup>
                <Stack gap={6} miw={200}>
                  <Badge size="sm" color={statusColor(report.status)} variant="dot">{report.status}</Badge>
                  <Text fw={700} size="sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{report.title}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>{report.description}</Text>
                  {report.images?.[0] && (
                    <img src={report.images[0].fileUrl ?? report.images[0].secure_url} alt="evidence"
                      style={{ width: '100%', borderRadius: 6, marginTop: 4 }} />
                  )}
                  <Button size="xs" color="civic" radius="md" onClick={() => openDrawer(report._id)}>
                    Open Thread
                  </Button>
                </Stack>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Floating glass panel ─────────────────────────────────────────── */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: 16, left: 16, bottom: 16,
          width: 340, zIndex: 10,
          background: 'rgba(13,13,13,0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 10,
          border: '1px solid rgba(0,255,65,0.12)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <Stack p="md" gap="md" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Panel header */}
          <Group justify="space-between" align="center">
            <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
              Live Reports
            </Title>
            <Badge size="sm" color="civic" variant="dot">{reports.length} active</Badge>
          </Group>

          {/* Heatmap toggle */}
          <Card
            p="xs"
            radius="md"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconFlame size={16} color={heatmap ? '#00FF41' : '#666'} />
                <Text size="xs" fw={500} c={heatmap ? 'civic.4' : 'dimmed'}>Heatmap Overlay</Text>
              </Group>
              <Switch
                size="xs"
                color="civic"
                checked={heatmap}
                onChange={e => setHeatmap(e.currentTarget.checked)}
              />
            </Group>
          </Card>

          {/* Report list */}
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            Recent incidents
          </Text>

          <ScrollArea style={{ flex: 1 }} type="scroll" offsetScrollbars>
            <Stack gap="sm" pb="xl">
              {reports.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" mt="xl">No active incidents.</Text>
              )}
              {reports.map(report => {
                if (!report?.location?.coordinates) return null;
                const [lng, lat] = report.location.coordinates;
                return (
                  <motion.div
                    key={report._id}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      p="sm"
                      radius="md"
                      onClick={() => setMapCenter([lat, lng])}
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderLeft: `3px solid ${report.status === 'Resolved' ? '#12b886' : '#00FF41'}`,
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <Group justify="space-between" mb={4}>
                        <Badge size="xs" color={statusColor(report.status)} variant="light">{report.status}</Badge>
                        <Text size="xs" c="dimmed">{new Date(report.createdAt).toLocaleDateString()}</Text>
                      </Group>
                      <Text size="sm" fw={600} lineClamp={1} c="white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {report.title}
                      </Text>
                      <Badge size="xs" color="cyan" variant="dot" mt={4} mb={6}>{report.category}</Badge>
                      <Button
                        size="xs" variant="subtle" color="civic" radius="md" fullWidth
                        rightSection={<IconArrowRight size={12} />}
                        onClick={e => { e.stopPropagation(); openDrawer(report._id); }}
                      >
                        View Details
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </Stack>
          </ScrollArea>
        </Stack>
      </motion.div>

      {/* ── Report Details Drawer ─────────────────────────────────────────── */}
      <ReportDetailsDrawer
        reportId={drawerId}
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  );
}
