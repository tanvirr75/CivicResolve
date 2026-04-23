import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, SimpleGrid, Card, ThemeIcon,
  Badge, Table, Anchor, Skeleton, Progress,
} from '@mantine/core';
import {
  IconFileReport, IconCircleCheck, IconUsers, IconChartBar, IconExternalLink,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const CAT_PALETTE = ['#00FF41', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = GREEN }) {
  return (
    <Card p="lg" radius="md"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${accent}` }}>
      <Group gap="md">
        <ThemeIcon size={44} radius="md"
          style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: accent }}>
          <Icon size={22} />
        </ThemeIcon>
        <Box>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{label}</Text>
          {value !== undefined
            ? <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.03em' }}>{value}</Title>
            : <Skeleton height={32} width={64} mt={4} />}
        </Box>
      </Group>
    </Card>
  );
}

// ─── Mini bar chart using CSS (no recharts dep) ───────────────────────────────
function MiniBarChart({ data, label }) {
  if (!data?.length) return <Skeleton height={120} radius="md" />;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <Box>
      <Text size="xs" c="dimmed" fw={600} mb="sm">{label}</Text>
      <Group gap={4} align="flex-end" h={120}>
        {data.map((d, i) => (
          <Stack key={d.label ?? i} gap={4} align="center" style={{ flex: 1 }}>
            <Box
              style={{
                width: '100%',
                height: Math.max(4, (d.count / max) * 100),
                background: CAT_PALETTE[i % CAT_PALETTE.length],
                borderRadius: '4px 4px 0 0',
                minWidth: 12,
                transition: 'height .4s ease',
              }}
            />
            <Text size={9} c="dimmed" ta="center" style={{ wordBreak: 'break-all', maxWidth: 36 }}>
              {d.label}
            </Text>
          </Stack>
        ))}
      </Group>
    </Box>
  );
}

// ─── Sparkline (30-day submissions) using SVG ─────────────────────────────────
function SparkLine({ data }) {
  if (!data?.length) return <Skeleton height={80} radius="md" />;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 400, H = 80;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.count / max) * (H - 8) - 4,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fill = [...pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
  `${W},${H}`, `0,${H}`].join(' ');

  return (
    <Box>
      <Text size="xs" c="dimmed" fw={600} mb="sm">Reports submitted (last 30 days)</Text>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fill} fill="url(#sparkGrad)" />
        <polyline points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">{data[0]?.date}</Text>
        <Text size="xs" c="dimmed">{data[data.length - 1]?.date}</Text>
      </Group>
    </Box>
  );
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({});
  const [catData, setCatData] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a large batch to derive all analytics client-side
      const [allRes, resolvedRes] = await Promise.all([
        API.get('/reports', { params: { limit: 200 } }),
        API.get('/reports', { params: { status: 'Resolved', limit: 200 } }),
      ]);

      const all = allRes.data.data.reports ?? [];
      const resolved = resolvedRes.data.data.reports ?? [];

      // KPIs
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const resolvedThisMonth = resolved.filter(r => {
        const d = new Date(r.resolvedAt ?? r.updatedAt);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length;
      const avgPriority = all.length
        ? (all.reduce((s, r) => s + (r.priorityScore ?? 0), 0) / all.length).toFixed(1)
        : 0;

      setKpi({
        total: allRes.data.data.totalDocs ?? all.length,
        resolved: resolvedThisMonth,
        avgPrio: avgPriority,
      });

      // Category breakdown
      const catMap = {};
      all.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + 1; });
      setCatData(Object.entries(catMap).map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count));

      // Daily counts (last 30 days)
      const days = 30;
      const buckets = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets[d.toISOString().split('T')[0]] = 0;
      }
      all.forEach(r => {
        const day = new Date(r.createdAt).toISOString().split('T')[0];
        if (buckets[day] !== undefined) buckets[day]++;
      });
      setDailyData(Object.entries(buckets).map(([date, count]) => ({
        date: date.slice(5), count,
      })));

      setReports(resolved.slice(0, 8));
    } catch (err) {
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <Box>
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          System Admin Dashboard
        </Title>
        <Text size="sm" c="dimmed" mt={4}>Platform-wide analytics and health overview.</Text>
      </Box>

      {/* KPI strip */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <KpiCard icon={IconFileReport} label="Total Reports" value={kpi.total} accent="#3b82f6" />
        <KpiCard icon={IconCircleCheck} label="Resolved This Month" value={kpi.resolved} accent={GREEN} />
        <KpiCard icon={IconUsers} label="Field Workers" value="—" accent="#f59e0b" />
        <KpiCard icon={IconChartBar} label="Avg Priority Score" value={kpi.avgPrio} accent="#ef4444" />
      </SimpleGrid>

      {/* Charts row */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" mb="xl">
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          {loading ? <Skeleton height={120} radius="md" /> : <SparkLine data={dailyData} />}
        </Card>
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          {loading ? <Skeleton height={120} radius="md" /> : <MiniBarChart data={catData} label="Reports by Category" />}
        </Card>
      </SimpleGrid>

      {/* Recently resolved */}
      <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group justify="space-between" mb="md">
          <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            Recently Resolved
          </Title>
          <Anchor component={Link} to="/admin/reports" size="xs" c="civic.4" underline="never">
            View all →
          </Anchor>
        </Group>
        <Table
          styles={{
            th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
            td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 10, paddingBottom: 10 },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Resolved</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                <Table.Tr key={i}>
                  {[1, 2, 3, 4].map(j => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                </Table.Tr>
              ))
              : reports.map(r => (
                <Table.Tr key={r._id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/ward/reports/${r._id}`}
                      size="xs" c="white" fw={600} underline="never"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {r.title?.slice(0, 42)}
                      <IconExternalLink size={10} style={{ marginLeft: 4, opacity: 0.4 }} />
                    </Anchor>
                  </Table.Td>
                  <Table.Td><Badge size="xs" color="cyan" variant="dot">{r.category}</Badge></Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={700}
                      c={r.priorityScore >= 4 ? 'red' : r.priorityScore >= 2 ? 'yellow' : 'dimmed'}>
                      {r.priorityScore}/5
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'}
                    </Text>
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
