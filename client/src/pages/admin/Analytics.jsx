import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Title, Text, Group, Stack, SimpleGrid, Card, Badge,
  Switch, ThemeIcon, Table, Skeleton, Progress,
} from '@mantine/core';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconFlame, IconChartPie, IconMap } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import API from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const CAT_PALETTE = [
  '#00FF41', '#3b82f6', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
];

// ─── Heatmap layer ────────────────────────────────────────────────────────────
function HeatLayer({ points }) {
  const map    = useMap();
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
  const total  = data.reduce((s, d) => s + d.count, 0) || 1;
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
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [heatmap,    setHeatmap]    = useState(true);
  const [catData,    setCatData]    = useState([]);
  const [wardData,   setWardData]   = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res    = await API.get('/reports', { params: { limit: 300 } });
      const list   = res.data.data.reports ?? res.data.data.docs ?? [];
      setReports(list);

      // Heat points [lat, lng, intensity]
      setHeatPoints(
        list
          .filter(r => r?.location?.coordinates || (r.latitude && r.longitude))
          .map(r => {
            const lat = r.latitude  ?? r.location?.coordinates?.[1];
            const lng = r.longitude ?? r.location?.coordinates?.[0];
            return [lat, lng, 1];
          })
          .filter(p => p[0] && p[1])
      );

      // Category breakdown
      const catMap = {};
      list.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + 1; });
      setCatData(
        Object.entries(catMap)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Ward performance
      const wardMap = {};
      list.forEach(r => {
        const wid = r.wardId ?? 'Unknown';
        if (!wardMap[wid]) wardMap[wid] = { total: 0, resolved: 0, resHours: [] };
        wardMap[wid].total++;
        if (r.status === 'Resolved') {
          wardMap[wid].resolved++;
          if (r.resolutionTimeHours) wardMap[wid].resHours.push(r.resolutionTimeHours);
        }
      });
      setWardData(
        Object.entries(wardMap).map(([ward, d]) => ({
          ward,
          total:    d.total,
          resolved: d.resolved,
          pct:      Math.round((d.resolved / d.total) * 100),
          avgHrs:   d.resHours.length
            ? (d.resHours.reduce((s, h) => s + h, 0) / d.resHours.length).toFixed(1)
            : '—',
        })).sort((a, b) => b.total - a.total)
      );
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <Box>
      <Box mb="xl">
        <Title order={2}
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          Analytics
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Platform-wide spatial and categorical insights — {reports.length} reports loaded.
        </Text>
      </Box>

      {/* ── Full-screen heatmap ─────────────────────────────────────────────── */}
      <Card p={0} radius="md" mb="xl"
        style={{ border: `1px solid ${GREEN_BDR}`, overflow: 'hidden', position: 'relative' }}>

        {/* Heatmap toggle */}
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

        <Box style={{ height: 420 }}>
          {loading
            ? <Skeleton height={420} radius={0} />
            : (
              <MapContainer
                center={[23.8103, 90.4125]}
                zoom={12}
                zoomControl
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {heatmap && heatPoints.length > 0 && <HeatLayer points={heatPoints} />}
              </MapContainer>
            )
          }
        </Box>
      </Card>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" mb="xl">

        {/* Category pie */}
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group gap="xs" mb="lg">
            <IconChartPie size={18} color={GREEN} />
            <Title order={5}
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              Category Breakdown
            </Title>
          </Group>
          {loading
            ? <Skeleton height={180} radius="xl" />
            : <PieChart data={catData} />
          }
        </Card>

        {/* Category bar */}
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Title order={5} mb="lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            Volume by Category
          </Title>
          {loading
            ? <Skeleton height={180} />
            : (
              <Stack gap="sm">
                {catData.map((c, i) => {
                  const max = catData[0]?.count || 1;
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
                      No ward data — reports will appear here as they are submitted with ward assignments.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )
              : wardData.map(w => (
                  <Table.Tr key={w.ward}>
                    <Table.Td>
                      <Text size="sm" fw={600} c="white">{w.ward}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{w.total}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color="teal" variant="light">{w.resolved}</Badge>
                    </Table.Td>
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
