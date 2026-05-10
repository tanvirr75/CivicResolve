import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Text, Group, Stack, Badge, Card, Select, Switch, Button,
  ScrollArea, Skeleton, ThemeIcon, ActionIcon, Divider, Tooltip,
} from '@mantine/core';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconMapPin, IconFlame, IconFilter, IconArrowUp, IconChevronLeft, IconChevronRight,
  IconStatusChange, IconCurrentLocation, IconMessage,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { useMapTheme } from '../../hooks/useMapTheme';
import MapThemeToggle from '../../components/MapThemeToggle';
import ReportDetailsDrawer from '../../components/ReportDetailsDrawer';

// ── Leaflet default icons ─────────────────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const BORDER    = 'rgba(255,255,255,0.08)';

// ─── Category → circle color map ─────────────────────────────────────────────
const CAT_COLOR = {
  Road:       '#f59e0b',
  Waste:      '#ef4444',
  Drainage:   '#3b82f6',
  Lighting:   '#fbbf24',
  Safety:     '#ec4899',
  Parks:      GREEN,
  Other:      '#8b5cf6',
};

function markerColor(cat) {
  return CAT_COLOR[cat] ?? '#6366f1';
}

// ─── Heatmap layer ────────────────────────────────────────────────────────────
function HeatmapLayer({ points }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    import('leaflet.heat').then(() => {
      if (!L.heatLayer) return;
      if (heatRef.current) map.removeLayer(heatRef.current);
      heatRef.current = L.heatLayer(points, {
        radius: 28, blur: 18, maxZoom: 15,
        gradient: { 0.4: '#00FF41', 0.7: '#ffff00', 1.0: '#ff0000' },
      }).addTo(map);
    });
    return () => { if (heatRef.current) map.removeLayer(heatRef.current); };
  }, [map, points]);

  return null;
}

// ─── MapController: exposes flyTo via ref ────────────────────────────────────
function MapController({ flyToRef }) {
  const map = useMap();
  useEffect(() => { flyToRef.current = (lat, lng, zoom = 16) => map.flyTo([lat, lng], zoom, { duration: 1 }); }, [map, flyToRef]);
  return null;
}

// ─── MapView ─────────────────────────────────────────────────────────────────
export default function MapView() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();

  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [heatmap,    setHeatmap]    = useState(false);
  const [catFilter,  setCatFilter]  = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [sidebarOpen,setSidebarOpen]= useState(true);

  // Map flyTo ref
  const flyToRef = useRef(null);

  const flyTo = useCallback((lat, lng) => {
    if (flyToRef.current) flyToRef.current(lat, lng);
  }, []);
  const [upvotedIds,    setUpvotedIds]    = useState(new Set());
  const [drawerReportId, setDrawerReportId] = useState(null);
  const [drawerOpened,   setDrawerOpened]   = useState(false);
  const [citizenWardId,  setCitizenWardId]  = useState(null); // resolved from GPS for citizens

  const openDrawer = useCallback((id) => {
    setDrawerReportId(id);
    setDrawerOpened(true);
  }, []);

  // ── Resolve ward for citizens via GPS ─────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'citizen') return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await API.get('/reports/ward/resolve', {
          params: { lat: coords.latitude, lng: coords.longitude },
        });
        if (res.data.data?.wardId) setCitizenWardId(res.data.data.wardId);
      } catch { /* non-blocking — citizen sees all if resolution fails */ }
    });
  }, [user]);

  // ── Fetch reports ─────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter ?? 'Open,Assigned,In Progress';
      const params = { status: statusParam, limit: 200 };

      // Citizens: filter by their GPS-resolved ward (if available)
      // ward_official / field_worker: backend auto-scopes via JWT role
      // system_admin: no filter
      if (user?.role === 'citizen' && citizenWardId) {
        params.wardId = citizenWardId;
      }

      const res = await API.get('/reports', { params });
      const list = res.data.data.reports ?? res.data.data.docs ?? [];
      setReports(list);
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, user, citizenWardId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Upvote ────────────────────────────────────────────────────────────────
  const handleUpvote = useCallback(async (reportId) => {
    if (!isAuthenticated()) {
      notifications.show({ title: 'Login required', message: 'Please login or register to upvote issues.', color: 'orange', autoClose: 3000 });
      return;
    }
    
    if (upvotedIds.has(reportId)) return;
    try {
      await API.put(`/reports/${reportId}/upvote`);
      setUpvotedIds(prev => new Set([...prev, reportId]));
      setReports(prev =>
        prev.map(r => r._id === reportId ? { ...r, upvoteCount: (r.upvoteCount ?? 0) + 1 } : r)
      );
      notifications.show({ title: 'Upvoted ✓', message: 'Your vote helps prioritize this issue.', color: 'civic', autoClose: 2500 });
    } catch {
      notifications.show({ title: 'Already voted', message: 'You have already upvoted this report.', color: 'orange', autoClose: 2000 });
    }
  }, [upvotedIds]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const visibleReports = reports.filter(r => {
    if (catFilter && r.category !== catFilter) return false;
    return true; // status filter is applied server-side via fetchReports
  });

  const heatPoints = reports
    .filter(r => r?.location?.coordinates)
    .map(r => [r.location.coordinates[1], r.location.coordinates[0], 1]);

  const categories = [...new Set(reports.map(r => r.category).filter(Boolean))].sort();

  return (
    <Box style={{ position: 'relative', height: 'calc(100vh - 58px - 32px)', borderRadius: 10, overflow: 'hidden' }}>

      {/* ── Full-bleed dark map ───────────────────────────────────────────── */}
      <MapContainer
        center={[23.8103, 90.4125]}
        zoom={13}
        zoomControl
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        {/* Wire MapController so flyTo works from outside MapContainer */}
        <MapController flyToRef={flyToRef} />

        {heatmap && <HeatmapLayer points={heatPoints} />}

        {!heatmap && visibleReports.map(r => {
          if (!r?.location?.coordinates) return null;
          const [lng, lat] = r.location.coordinates;
          const color = markerColor(r.category);
          return (
            <CircleMarker
              key={r._id}
              center={[lat, lng]}
              radius={10}
              pathOptions={{
                color:       color,
                fillColor:   color,
                fillOpacity: 0.75,
                weight:      2,
                opacity:     0.9,
              }}
            >
              <Popup>
                <Box style={{ minWidth: 200, fontFamily: "'Inter', sans-serif" }}>
                  <Badge size="xs" style={{ background: color + '22', color, border: `1px solid ${color}66` }} mb={6}>
                    {r.category ?? 'Other'}
                  </Badge>
                  <Text fw={700} size="sm" c="#111" mb={4} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {r.title}
                  </Text>
                  <Text size="xs" c="dimmed" mb={8}>{r.status}</Text>
                  <Group gap={6} grow>
                    <Tooltip
                      label="Login or register to upvote"
                      disabled={isAuthenticated()}
                      withArrow position="bottom" color="dark"
                    >
                      <Button
                        size="xs" radius="sm"
                        leftSection={<IconArrowUp size={12} />}
                        disabled={upvotedIds.has(r._id)}
                        style={{
                          background: isAuthenticated() ? GREEN : 'rgba(255,255,255,0.08)',
                          color: isAuthenticated() ? '#000' : '#888',
                          fontWeight: 700, fontSize: '0.78rem',
                          cursor: isAuthenticated() ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => handleUpvote(r._id)}
                      >
                        {upvotedIds.has(r._id) ? 'Voted' : `Upvote (${r.upvoteCount ?? 0})`}
                      </Button>
                    </Tooltip>
                    <Button
                      size="xs" radius="sm" variant="light" color="blue"
                      leftSection={<IconMessage size={12} />}
                      onClick={() => openDrawer(r._id)}
                    >
                      Comment
                    </Button>
                  </Group>
                </Box>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* ── Map controls (top-right) ──────────────────────────────────────── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          background: 'rgba(13,13,13,0.82)',
          backdropFilter: 'blur(14px)',
          borderRadius: 10,
          border: `1px solid ${BORDER}`,
          padding: '10px 14px',
        }}
      >
        <Group gap="sm" align="center">
          <IconFlame size={16} color={heatmap ? GREEN : '#555'} />
          <Text size="xs" c={heatmap ? 'civic.4' : 'dimmed'} fw={500}>Heatmap</Text>
          <Switch size="xs" color="civic" checked={heatmap} onChange={e => setHeatmap(e.currentTarget.checked)} />

          <Box style={{ width: 1, height: 18, background: BORDER }} />
          <MapThemeToggle theme={theme} onToggle={toggleTheme} />

          {/* Divider + Locate Me */}
          <Box style={{ width: 1, height: 18, background: BORDER }} />
          <ActionIcon
            size="sm" variant="subtle" radius="md"
            style={{ color: GREEN }}
            title="Centre map on my location"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                ({ coords }) => flyTo(coords.latitude, coords.longitude),
                () => notifications.show({ title: 'Location denied', message: 'Enable location access in your browser.', color: 'orange' })
              );
            }}
          >
            <IconCurrentLocation size={15} />
          </ActionIcon>
        </Group>
      </motion.div>

      {/* ── Sidebar toggle button ─────────────────────────────────────────── */}
      <ActionIcon
        style={{
          position: 'absolute',
          top: '50%',
          left: sidebarOpen ? 356 : 16,
          transform: 'translateY(-50%)',
          zIndex: 12,
          background: 'rgba(13,13,13,0.85)',
          border: `1px solid ${BORDER}`,
          transition: 'left 0.3s ease',
        }}
        size="sm"
        radius="xl"
        onClick={() => setSidebarOpen(p => !p)}
      >
        {sidebarOpen ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
      </ActionIcon>

      {/* ── Floating sidebar ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: sidebarOpen ? 0 : -360 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 16, left: 16, bottom: 16,
          width: 340, zIndex: 10,
          background: 'rgba(13,13,13,0.85)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 10,
          border: `1px solid ${GREEN_BDR}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <Stack p="md" gap="md" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconMapPin size={16} color={GREEN} />
              <Text size="sm" fw={700} c="white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Live Reports
              </Text>
            </Group>
            <Badge size="xs" color="civic" variant="dot">{visibleReports.length} shown</Badge>
          </Group>

          {/* Category filter */}
          <Select
            size="xs"
            placeholder="All categories"
            clearable
            radius="md"
            leftSection={<IconFilter size={12} />}
            data={categories}
            value={catFilter}
            onChange={setCatFilter}
            styles={{
              input:   { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.8rem' },
              option:  { fontSize: '0.8rem' },
            }}
          />

          {/* Status filter */}
          <Select
            size="xs"
            placeholder="All statuses"
            clearable
            radius="md"
            leftSection={<IconStatusChange size={12} />}
            data={[
              { value: 'Open',        label: '🟡 Open' },
              { value: 'Assigned',    label: '🔵 Assigned' },
              { value: 'In Progress', label: '🟠 In Progress' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            styles={{
              input:   { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.8rem' },
              option:  { fontSize: '0.8rem' },
            }}
          />

          {/* Category legend */}
          <Group gap={6} wrap="wrap">
            {Object.entries(CAT_COLOR).map(([cat, color]) => (
              <Badge
                key={cat}
                size="xs"
                radius="sm"
                style={{ background: color + '22', color, border: `1px solid ${color}55`, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                onClick={() => setCatFilter(prev => prev === cat ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </Group>

          {/* Report list */}
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            Incidents
          </Text>

          <ScrollArea style={{ flex: 1 }} type="scroll" offsetScrollbars>
            <Stack gap="sm" pb="xl">
              {loading
                ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={64} radius="md" />)
                : visibleReports.map(r => {
                    if (!r?.location?.coordinates) return null;
                    const color = markerColor(r.category);
                    return (
                      <motion.div key={r._id} whileHover={{ scale: 1.015 }} transition={{ duration: 0.15 }}>
                        <Card
                          p="sm" radius="md"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid rgba(255,255,255,0.07)`,
                            borderLeft: `3px solid ${color}`,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const [lng, lat] = r.location.coordinates;
                            flyTo(lat, lng);
                          }}
                        >
                          <Group justify="space-between" mb={4}>
                            <Badge size="xs" style={{ background: color + '22', color, border: `1px solid ${color}55` }}>
                              {r.category ?? 'Other'}
                            </Badge>
                            <Text size="xs" c="dimmed">{r.upvotes ?? 0} ↑</Text>
                          </Group>
                          <Text size="xs" fw={600} c="white" lineClamp={1} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {r.title}
                          </Text>
                          <Group justify="space-between" mt={6} align="center" wrap="nowrap">
                            <Badge size="xs" variant="dot" style={{ flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}
                              color={r.status === 'Open' ? 'yellow' : r.status === 'Assigned' ? 'blue' : 'orange'}>
                              {r.status}
                            </Badge>
                            <Group gap={4} style={{ flexShrink: 0 }}>
                              <Tooltip
                                label="Login or register to upvote"
                                disabled={isAuthenticated()}
                                withArrow position="top" color="dark"
                              >
                                <Button
                                  size="xs"
                                  variant={isAuthenticated() ? 'subtle' : 'default'}
                                  color={isAuthenticated() ? 'civic' : 'gray'}
                                  leftSection={<IconArrowUp size={11} />}
                                  disabled={upvotedIds.has(r._id)}
                                  onClick={e => { e.stopPropagation(); handleUpvote(r._id); }}
                                  style={{ fontSize: '0.72rem', height: 22, padding: '0 8px', opacity: isAuthenticated() ? 1 : 0.5 }}
                                >
                                  {!isAuthenticated() ? '🔒' : upvotedIds.has(r._id) ? 'Voted' : 'Upvote'}
                                </Button>
                              </Tooltip>
                              <Button
                                size="xs" variant="subtle" color="blue"
                                leftSection={<IconMessage size={11} />}
                                onClick={e => { e.stopPropagation(); openDrawer(r._id); }}
                                style={{ fontSize: '0.72rem', height: 22, padding: '0 8px' }}
                              >
                                Comment
                              </Button>
                            </Group>
                          </Group>
                        </Card>
                      </motion.div>
                    );
                  })
              }
              {!loading && visibleReports.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" mt="xl">No reports match this filter.</Text>
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </motion.div>

      {/* ── Report comment/detail drawer ──────────────────────────────────── */}
      <ReportDetailsDrawer
        reportId={drawerReportId}
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
      />
    </Box>
  );
}
