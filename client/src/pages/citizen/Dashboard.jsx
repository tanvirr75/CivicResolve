import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Badge, Card,
  SimpleGrid, Table, Anchor, Skeleton, Select, TextInput, Pagination, ThemeIcon, Tooltip, ScrollArea,
} from '@mantine/core';
import {
  IconFileReport, IconCircleCheck, IconArrowUp, IconExternalLink,
  IconLoader2, IconClipboardList, IconPlus, IconSearch,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../services/socket';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

// ─── Time-of-day greeting key ─────────────────────────────────────────────────
function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Status → Badge color map ─────────────────────────────────────────────────

const STATUS_COLOR = {
  Open: 'yellow',
  Assigned: 'blue',
  'In Progress': 'orange',
  Resolved: 'teal',
};

// ─── Heatmap layer ────────────────────────────────────────────────────────────
function HeatmapLayer({ points }) {
  const map = useMap();
  const heatRef = React.useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    import('leaflet.heat').then(() => {
      if (!L.heatLayer) return;
      if (heatRef.current) map.removeLayer(heatRef.current);
      heatRef.current = L.heatLayer(points, {
        radius: 25, blur: 15, maxZoom: 15,
        gradient: { 0.4: '#00FF41', 0.7: '#ffff00', 1.0: '#ff0000' },
      }).addTo(map);
    });
    return () => { if (heatRef.current) map.removeLayer(heatRef.current); };
  }, [map, points]);

  return null;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconColor = GREEN }) {
  return (
    <Card
      p="lg" radius="md"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${iconColor}` }}
    >
      <Group gap="md" align="center">
        <ThemeIcon size={44} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: iconColor }}>
          <Icon size={22} />
        </ThemeIcon>
        <Box>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{label}</Text>
          <Title order={3} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            {value ?? <Skeleton height={28} width={40} />}
          </Title>
        </Box>
      </Group>
    </Card>
  );
}

// ─── CitizenDashboard ─────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const { user } = useAuth();
  const { t }    = useTranslation();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ open: 0, assigned: 0, inProgress: 0, resolved: 0, total: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const LIMIT = 10;

  // ── Fetch my reports ──────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { submittedBy: 'me', page, limit: LIMIT };
      if (statusFilter)    params.status = statusFilter;
      if (searchQ.trim())  params.q      = searchQ.trim();
      const res = await API.get('/reports', { params });
      const data = res.data.data;
      const list = data.reports ?? data.docs ?? [];
      setReports(list);
      setTotal(data.totalPages ?? Math.ceil((data.totalDocs ?? list.length) / LIMIT));
    } catch (err) {
      console.error('Citizen dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQ]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Fetch accurate stats from the dedicated aggregation endpoint ──────────
  useEffect(() => {
    setStatsLoading(true);
    API.get('/reports/stats')
      .then(res => setStats(res.data.data ?? {}))
      .catch(err => console.error('Stats fetch error:', err))
      .finally(() => setStatsLoading(false));
  }, []); // intentionally only runs once on mount

  // ── Fetch around reports for heatmap ──────────────────────────────────────
  useEffect(() => {
    API.get('/reports', { params: { limit: 200, status: 'Open,Assigned,In Progress' } })
      .then(res => {
         const list = res.data.data.reports ?? res.data.data.docs ?? [];
         const pts = list
           .filter(r => r?.location?.coordinates)
           .map(r => [r.location.coordinates[1], r.location.coordinates[0], 1]);
         setHeatmapPoints(pts);
      })
      .catch(err => console.error('Heatmap fetch error:', err));
  }, []);

  // ── Socket.io: live status patching ──────────────────────────────────────
  useSocket(user?._id, {
    reportStatusUpdated: ({ reportId, status }) => {
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, status } : r));
    },
  });

  // ── Rows ──────────────────────────────────────────────────────────────────
  const rows = loading
    ? Array.from({ length: 5 }, (_, i) => (
      <Table.Tr key={i}>
        {Array.from({ length: 5 }, (_, j) => (
          <Table.Td key={j}><Skeleton height={18} radius="sm" /></Table.Td>
        ))}
      </Table.Tr>
    ))
    : reports.map(r => (
      <Table.Tr
        key={r._id}
        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Table.Td>
          <Anchor
            component={Link}
            to={`/reports/${r._id}`}
            c="white"
            size="sm"
            fw={600}
            underline="never"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {r.title}
            <IconExternalLink size={11} style={{ marginLeft: 4, opacity: 0.4, verticalAlign: 'middle' }} />
          </Anchor>
        </Table.Td>
        <Table.Td>
          <Badge size="xs" variant="dot" color="cyan">{r.category ?? '—'}</Badge>
        </Table.Td>
        <Table.Td>
          <Badge size="sm" color={STATUS_COLOR[r.status] ?? 'gray'} variant="light">
            {r.status}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c={r.priorityScore >= 8 ? 'red' : r.priorityScore >= 4 ? 'yellow' : 'dimmed'} fw={600}>
            {r.priorityScore ?? '—'}/10
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </Text>
        </Table.Td>
      </Table.Tr>
    ));

  return (
    <Box style={{ paddingBottom: 80 }}> {/* bottom padding so FAB doesn't cover content */}
      {/* Page header — personalised greeting */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          {t(getGreetingKey())}, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {t('Track all your civic reports in one place.')}
        </Text>
      </Box>

      {/* Stats row */}
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="md" mb="xl">
        <StatCard icon={IconFileReport}    label={t('Open')}        value={statsLoading ? <Skeleton height={28} width={32} /> : stats.open}        iconColor="#FFD700" />
        <StatCard icon={IconLoader2}       label={t('Assigned')}    value={statsLoading ? <Skeleton height={28} width={32} /> : stats.assigned}    iconColor="#60a5fa" />
        <StatCard icon={IconClipboardList} label={t('In Progress')} value={statsLoading ? <Skeleton height={28} width={32} /> : stats.inProgress}  iconColor="#fb923c" />
        <StatCard icon={IconCircleCheck}   label={t('Resolved')}    value={statsLoading ? <Skeleton height={28} width={32} /> : stats.resolved}    iconColor={GREEN} />
        <StatCard icon={IconArrowUp}       label={t('Total')}       value={statsLoading ? <Skeleton height={28} width={32} /> : stats.total}        iconColor="#a78bfa" />
      </SimpleGrid>

      {/* Heatmap Card */}
      <Card p="lg" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group justify="space-between" mb="md" align="center">
          <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            {t('Live Heatmap (Around you)')}
          </Title>
          <Badge size="xs" color="civic" variant="light">
            {heatmapPoints.length} {t('active issues')}
          </Badge>
        </Group>
        <Box style={{ height: 280, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
          <MapContainer
            center={[23.8103, 90.4125]} // Default center
            zoom={12}
            zoomControl={false}
            style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
          </MapContainer>
        </Box>
      </Card>

      {/* Reports table */}
      <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group justify="space-between" mb="md" align="center">
          <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            {t('My Reports')}
          </Title>
          <Group gap="sm">
            <TextInput
              size="xs" w={180}
              placeholder={t('Search reports…')}
              leftSection={<IconSearch size={12} />}
              value={searchQ}
              onChange={e => { setSearchQ(e.currentTarget.value); setPage(1); }}
              styles={{ input: { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#e5e5e5' } }}
            />
            <Select
              size="xs" w={150}
              placeholder={t('Filter by status')}
              clearable
              radius="md"
              data={['Open', 'Assigned', 'In Progress', 'Resolved']}
              value={statusFilter}
              onChange={v => { setStatusFilter(v); setPage(1); }}
              styles={{ input: { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#e5e5e5' } }}
            />
          </Group>
        </Group>

        <ScrollArea type="scroll" scrollbars="x">
          <Table
            striped={false}
            highlightOnHover={false}
            withTableBorder={false}
            styles={{
              th: { color: '#666', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
              td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 12, paddingBottom: 12 },
              tr: { transition: 'background .15s' },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('Title')}</Table.Th>
                <Table.Th>{t('Category')}</Table.Th>
                <Table.Th>{t('Status')}</Table.Th>
                <Table.Th>{t('Priority')}</Table.Th>
                <Table.Th>{t('Submitted')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows}
              {!loading && reports.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" size="sm" py="xl">
                      {t('No reports found.')}{' '}
                      <Anchor component={Link} to="/citizen/submit" c="civic.4" size="sm">{t('Submit your first report →')}</Anchor>
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {total > 1 && (
          <Group justify="center" mt="lg">
            <Pagination
              total={total}
              value={page}
              onChange={setPage}
              color="civic"
              size="sm"
              radius="md"
            />
          </Group>
        )}
      </Card>

      {/* ── Floating Action Button (Report an Issue) ──────────────────────── */}
      <Tooltip label="Report an Issue" position="left" withArrow>
        <Box
          component={Link}
          to="/citizen/submit"
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            zIndex: 200,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: GREEN,
            boxShadow: `0 0 0 4px rgba(0,255,65,0.15), 0 4px 20px rgba(0,255,65,0.4)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.18s, box-shadow 0.18s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = `0 0 0 6px rgba(0,255,65,0.2), 0 6px 28px rgba(0,255,65,0.55)`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 0 0 4px rgba(0,255,65,0.15), 0 4px 20px rgba(0,255,65,0.4)`;
          }}
        >
          <IconPlus size={24} color="#000" stroke={2.5} />
        </Box>
      </Tooltip>
    </Box>
  );
}
