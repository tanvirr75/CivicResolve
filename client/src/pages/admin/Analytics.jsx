import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Title, Text, Group, Stack, SimpleGrid, Card, Badge,
  Switch, ThemeIcon, Table, Skeleton, Progress, TextInput, Button,
} from '@mantine/core';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconFlame, IconChartPie, IconMap, IconCalendar, IconX } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import API from '../../services/api';
import { useMapTheme } from '../../hooks/useMapTheme';
import MapThemeToggle from '../../components/MapThemeToggle';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.82rem' },
  label: { color: '#888', fontSize: '0.78rem', fontWeight: 500, marginBottom: 4 },
};

const CAT_PALETTE = [
  '#00FF41', '#3b82f6', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
];

// ─── Heatmap layer ────────────────────────────────────────────────────────────
function HeatLayer({ points }) {
  const map     = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    import('leaflet.heat').then(() => {
      if (!L.heatLayer) return;
      if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }
      heatRef.current = L.heatLayer(points, {
        radius: 30, blur: 20, maxZoom: 14,
        gradient: { 0.3: '#00FF41', 0.6: '#ffff00', 1.0: '#ff0000' },
      }).addTo(map);
    });
    return () => { if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; } };
  }, [map, points]);

  return null;
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────
function DonutSlice({ cx, cy, r, startAngle, endAngle, color }) {
  const toRad = a => (a - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  return <path d={d} fill={color} stroke="#0d0d0d" strokeWidth="2" />;
}

function PieChart({ data }) {
  if (!data?.length) return <Skeleton height={180} radius="xl" />;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const CX = 90, CY = 90, R = 75;
  let angle = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.count / total) * 360;
    const start = angle;
    angle += sweep;
    return { ...d, start, end: angle, color: CAT_PALETTE[i % CAT_PALETTE.length] };
  });

  return (
    <Group gap="xl" align="center" wrap="wrap">
      <svg width={180} height={180} viewBox="0 0 180 180">
        {slices.map((s, i) => (
          <DonutSlice key={i} cx={CX} cy={CY} r={R}
            startAngle={s.start} endAngle={s.end} color={s.color} />
        ))}
        <circle cx={CX} cy={CY} r={44} fill="#0d0d0d" />
        <text x={CX} y={CY - 6} fill="#aaa" textAnchor="middle" fontSize="10">Total</text>
        <text x={CX} y={CY + 12} fill="#fff" textAnchor="middle" fontSize="16" fontWeight="bold">{total}</text>
      </svg>
      <Stack gap={8}>
        {slices.map((s, i) => (
          <Group key={i} gap="xs" align="center">
            <Box style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <Text size="xs" c="dimmed" style={{ minWidth: 70 }}>{s.label}</Text>
            <Text size="xs" fw={700} c="white">{s.count}</Text>
            <Text size="xs" c="dimmed">({Math.round((s.count / total) * 100)}%)</Text>
          </Group>
        ))}
      </Stack>
    </Group>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const [analytics, setAnalytics] = useState({ catCounts: [], wardStats: [], heatPoints: [], total: 0 });
  const [loading,   setLoading]   = useState(true);
  const [heatmap,   setHeatmap]   = useState(true);
  const { theme, toggleTheme, tileUrl, attribution } = useMapTheme();

  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');

  const fetchAnalytics = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await API.get('/reports/analytics', { params });
      setAnalytics(res.data.data ?? { catCounts: [], wardStats: [], heatPoints: [], total: 0 });
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(fromDate, toDate); }, [fetchAnalytics, fromDate, toDate]);

  const isFiltered = fromDate || toDate;

  // Ward stats with derived pct + avgHrs
  const wardData = useMemo(() =>
    analytics.wardStats.map(w => ({
      ...w,
      pct:    Math.round((w.resolved / w.total) * 100),
      avgHrs: w.resHoursArr?.length
        ? (w.resHoursArr.reduce((s, h) => s + h, 0) / w.resHoursArr.length).toFixed(1)
        : '—',
    })),
    [analytics.wardStats]
  );

  return (
    <Box>
      <Box mb="xl">
        <Title order={2}
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          Analytics
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Platform-wide spatial and categorical insights —{' '}
          {loading ? '…' : `${analytics.total} report${analytics.total !== 1 ? 's' : ''}`} shown.
        </Text>
      </Box>

      {/* ── Date range filter bar ─────────────────────────────────────────────── */}
      <Card p="md" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group gap="md" wrap="wrap" align="flex-end">
          <ThemeIcon size={32} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
            <IconCalendar size={16} />
          </ThemeIcon>
          <TextInput
            size="xs"
            type="date"
            label="From"
            w={160}
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            styles={inputSm}
          />
          <TextInput
            size="xs"
            type="date"
            label="To"
            w={160}
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            styles={inputSm}
          />
          {isFiltered && (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              radius="md"
              leftSection={<IconX size={12} />}
              onClick={() => { setFromDate(''); setToDate(''); }}
            >
              Clear
            </Button>
          )}
          {isFiltered && !loading && (
            <Badge size="sm" color="civic" variant="light">
              {analytics.total} report{analytics.total !== 1 ? 's' : ''} in range
            </Badge>
          )}
        </Group>
      </Card>

      {/* ── Full-screen heatmap ─────────────────────────────────────────────── */}
      <Card p={0} radius="md" mb="xl"
        style={{ border: `1px solid ${GREEN_BDR}`, overflow: 'hidden', position: 'relative' }}>

        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            background: 'rgba(13,13,13,0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            padding: '8px 12px',
          }}
        >
          <Group gap="sm">
            <IconFlame size={15} color={heatmap ? GREEN : '#555'} />
            <Text size="xs" c={heatmap ? 'civic.4' : 'dimmed'} fw={500}>Heatmap</Text>
            <Switch size="xs" color="civic" checked={heatmap}
              onChange={e => setHeatmap(e.currentTarget.checked)} />
          </Group>
        </motion.div>

        <Box style={{ height: 420, position: 'relative' }}>
          {loading
            ? <Skeleton height={420} radius={0} />
            : (
              <MapContainer
                center={[23.8103, 90.4125]}
                zoom={12}
                zoomControl
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url={tileUrl} attribution={attribution} />
                {heatmap && analytics.heatPoints.length > 0 && <HeatLayer points={analytics.heatPoints} />}
              </MapContainer>
            )
          }
          <Box style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}>
            <MapThemeToggle theme={theme} onToggle={toggleTheme} />
          </Box>
        </Box>
      </Card>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" mb="xl">

        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group gap="xs" mb="lg">
            <IconChartPie size={18} color={GREEN} />
            <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              Category Breakdown
            </Title>
          </Group>
          {loading ? <Skeleton height={180} radius="xl" /> : <PieChart data={analytics.catCounts} />}
        </Card>

        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Title order={5} mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            Volume by Category
          </Title>
          {loading
            ? <Skeleton height={180} />
            : (
              <Stack gap="sm">
                {analytics.catCounts.map((c, i) => {
                  const max = analytics.catCounts[0]?.count || 1;
                  return (
                    <Box key={c.label}>
                      <Group justify="space-between" mb={4}>
                        <Group gap="xs">
                          <Box style={{ width: 8, height: 8, borderRadius: '50%',
                            background: CAT_PALETTE[i % CAT_PALETTE.length] }} />
                          <Text size="xs" c="dimmed">{c.label}</Text>
                        </Group>
                        <Text size="xs" fw={700} c="white">{c.count}</Text>
                      </Group>
                      <Progress
                        value={(c.count / max) * 100}
                        color="civic"
                        size={5}
                        radius="xl"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )
          }
        </Card>
      </SimpleGrid>

      {/* ── Ward performance table ────────────────────────────────────────── */}
      <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group gap="xs" mb="lg">
          <IconMap size={18} color={GREEN} />
          <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            Ward Performance
          </Title>
        </Group>
        <Table
          styles={{
            th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
            td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 11, paddingBottom: 11 },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ward</Table.Th>
              <Table.Th>Total Reports</Table.Th>
              <Table.Th>Resolved</Table.Th>
              <Table.Th>Resolution Rate</Table.Th>
              <Table.Th>Avg Resolution Time</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <Table.Tr key={i}>
                    {[1,2,3,4,5].map(j => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                  </Table.Tr>
                ))
              : wardData.length === 0
              ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      {isFiltered
                        ? 'No ward data in the selected date range.'
                        : 'No ward data — reports will appear here as they are submitted.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )
              : wardData.map(w => (
                  <Table.Tr key={w.ward}>
                    <Table.Td><Text size="sm" fw={600} c="white">{w.ward}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{w.total}</Text></Table.Td>
                    <Table.Td><Badge size="sm" color="teal" variant="light">{w.resolved}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap="sm" align="center">
                        <Progress
                          value={w.pct}
                          color={w.pct >= 80 ? 'teal' : w.pct >= 50 ? 'yellow' : 'red'}
                          size={6} radius="xl" w={80}
                          style={{ background: 'rgba(255,255,255,0.07)' }}
                        />
                        <Text size="xs" fw={600}
                          c={w.pct >= 80 ? 'teal' : w.pct >= 50 ? 'yellow' : 'red'}>
                          {w.pct}%
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{w.avgHrs !== '—' ? `${w.avgHrs}h` : '—'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))
            }
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
