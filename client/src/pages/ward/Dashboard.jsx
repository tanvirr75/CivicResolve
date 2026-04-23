import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, SimpleGrid, Card, ThemeIcon,
  Badge, Table, Anchor, Skeleton, RingProgress, Center,
} from '@mantine/core';
import {
  IconFileReport, IconClockHour4, IconCircleCheck,
  IconChartDonut, IconExternalLink,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Open: 'yellow',
  Assigned: 'blue',
  'In Progress': 'orange',
  Resolved: 'teal',
};

// Category → ring colour
const CAT_PALETTE = [
  '#00FF41', '#3b82f6', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
];

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent = GREEN }) {
  return (
    <Card p="lg" radius="md"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${accent}` }}>
      <Group gap="md" align="flex-start">
        <ThemeIcon size={44} radius="md"
          style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: accent }}>
          <Icon size={22} />
        </ThemeIcon>
        <Box>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{label}</Text>
          {value !== undefined
            ? <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.03em' }}>{value}</Title>
            : <Skeleton height={32} width={60} mt={4} />
          }
          {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
        </Box>
      </Group>
    </Card>
  );
}

// ─── WardDashboard ────────────────────────────────────────────────────────────
export default function WardDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ open: undefined, assignedToday: undefined, avgResolutionHrs: undefined });
  const [catData, setCatData] = useState([]);   // [{ label, count, color }]

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch top 5 high-priority reports for this ward
      const params = { limit: 5, sort: '-priorityScore' };
      if (user?.wardId) params.wardId = user.wardId;
      const res = await API.get('/reports', { params });
      const list = res.data.data.reports ?? res.data.data.docs ?? [];
      setReports(list);

      // Derive KPIs
      const open = list.filter(r => r.status === 'Open').length;
      const today = new Date().toDateString();
      const assignedToday = list.filter(r =>
        r.status === 'Assigned' && new Date(r.updatedAt).toDateString() === today
      ).length;
      const resolved = list.filter(r => r.resolutionTimeHours);
      const avgResolutionHrs = resolved.length
        ? (resolved.reduce((s, r) => s + (r.resolutionTimeHours ?? 0), 0) / resolved.length).toFixed(1)
        : null;

      setKpi({ open, assignedToday, avgResolutionHrs });

      // Build category donut data from the list
      const catMap = {};
      list.forEach(r => { if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + 1; });
      const total = list.length || 1;
      setCatData(
        Object.entries(catMap).map(([label, count], i) => ({
          label,
          count,
          color: CAT_PALETTE[i % CAT_PALETTE.length],
          pct: Math.round((count / total) * 100),
        }))
      );
    } catch (err) {
      console.error('Ward dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Priority colour
  const prioColor = (score) =>
    score >= 4 ? '#ef4444' : score >= 2 ? '#f59e0b' : '#6b7280';

  return (
    <Box>
      {/* Header */}
      <Box mb="xl">
        <Title order={2}
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          Ward Operations
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {user?.wardId ? `Ward ID: ${user.wardId}` : 'No ward assigned'} · Live overview
        </Text>
      </Box>

      {/* KPI strip */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        <KpiCard icon={IconFileReport} label="Open in Ward" value={kpi.open} accent="#f59e0b" />
        <KpiCard icon={IconClockHour4} label="Assigned Today" value={kpi.assignedToday} accent="#3b82f6" />
        <KpiCard
          icon={IconCircleCheck}
          label="Avg Resolution"
          value={kpi.avgResolutionHrs !== undefined
            ? (kpi.avgResolutionHrs ? `${kpi.avgResolutionHrs}h` : '—')
            : undefined}
          accent={GREEN}
          sub="From this page's data sample"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">

        {/* ── Donut chart ─────────────────────────────────────────────────── */}
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group gap="xs" mb="lg" align="center">
            <IconChartDonut size={18} color={GREEN} />
            <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              Reports by Category
            </Title>
          </Group>

          {loading
            ? <Skeleton height={180} radius="xl" />
            : catData.length === 0
              ? <Text size="sm" c="dimmed" ta="center" mt="xl">No data yet.</Text>
              : (
                <Group align="center" gap="xl">
                  {/* RingProgress as donut proxy */}
                  <RingProgress
                    size={160}
                    thickness={20}
                    roundCaps
                    sections={catData.map(c => ({ value: c.pct, color: c.color, tooltip: `${c.label}: ${c.count}` }))}
                    label={
                      <Center>
                        <Text size="xs" c="dimmed" ta="center" fw={600}>{reports.length}<br />total</Text>
                      </Center>
                    }
                  />
                  {/* Legend */}
                  <Stack gap={8}>
                    {catData.map(c => (
                      <Group key={c.label} gap="xs" align="center">
                        <Box style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                        <Text size="xs" c="dimmed">{c.label}</Text>
                        <Text size="xs" fw={700} c="white">{c.count}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Group>
              )
          }
        </Card>

        {/* ── Top 5 priority reports ─────────────────────────────────────── */}
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group justify="space-between" mb="lg" align="center">
            <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
              High Priority Reports
            </Title>
            <Anchor component={Link} to="/ward/reports" size="xs" c="civic.4" underline="never">
              View all →
            </Anchor>
          </Group>

          <Table
            styles={{
              th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, pb: 8 },
              td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 10, paddingBottom: 10 },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Priority</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading
                ? Array.from({ length: 5 }, (_, i) => (
                  <Table.Tr key={i}>
                    {[1, 2, 3].map(j => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                  </Table.Tr>
                ))
                : reports.map(r => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/ward/reports/${r._id}`}
                        c="white" size="xs" fw={600} underline="never"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {r.title?.length > 38 ? r.title.slice(0, 36) + '…' : r.title}
                        <IconExternalLink size={10} style={{ marginLeft: 4, opacity: 0.4 }} />
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={STATUS_COLOR[r.status] ?? 'gray'} variant="light">
                        {r.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={700} style={{ color: prioColor(r.priorityScore) }}>
                        {r.priorityScore ?? '—'}/5
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              }
              {!loading && reports.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text size="xs" c="dimmed" ta="center" py="sm">No reports found for this ward.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
