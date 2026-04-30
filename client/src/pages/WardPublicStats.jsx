import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Title, Text, Group, Stack, SimpleGrid, Card, Badge,
  Progress, Table, Anchor, Skeleton, ThemeIcon, Divider,
} from '@mantine/core';
import {
  IconMapPin, IconCircleCheck, IconFileReport, IconClock,
  IconChartBar, IconExternalLink, IconShieldCheck,
} from '@tabler/icons-react';
import API from '../services/api';

// ─── Design tokens (public page has its own minimal dark theme) ───────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.18)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const CAT_PALETTE = [
  '#00FF41', '#3b82f6', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16',
];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent = GREEN, loading }) {
  return (
    <Card p="lg" radius="md"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${accent}` }}>
      <Group gap="md">
        <ThemeIcon size={44} radius="md"
          style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: accent }}>
          <Icon size={22} />
        </ThemeIcon>
        <Box>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            {label}
          </Text>
          {loading
            ? <Skeleton height={28} width={56} mt={4} />
            : <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.03em' }}>
                {value}
              </Title>
          }
        </Box>
      </Group>
    </Card>
  );
}

// ─── WardPublicStats ──────────────────────────────────────────────────────────
export default function WardPublicStats() {
  const { wardId } = useParams();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!wardId) return;
    setLoading(true);
    API.get(`/reports/ward/${encodeURIComponent(wardId)}/stats`)
      .then(res => setStats(res.data.data))
      .catch(() => setError('Could not load ward statistics.'))
      .finally(() => setLoading(false));
  }, [wardId]);

  const maxCat = stats?.catCounts?.[0]?.count || 1;

  return (
    <Box style={{ background: '#0d0d0d', minHeight: '100vh', padding: '0 0 60px' }}>

      {/* ── Public header ─────────────────────────────────────────────────── */}
      <Box
        style={{
          background: 'rgba(13,13,13,0.95)',
          borderBottom: `1px solid ${BORDER}`,
          padding: '14px 24px',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Group justify="space-between" align="center">
          <Text
            component={Link} to="/"
            fw={700} size="lg"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: GREEN }}>Civic</span>
            <span style={{ color: '#fff' }}>Resolve</span>
          </Text>
          <Group gap="xs">
            <IconShieldCheck size={14} color={GREEN} />
            <Text size="xs" c="dimmed">Public Accountability Dashboard</Text>
          </Group>
        </Group>
      </Box>

      <Box maw={900} mx="auto" px="md" pt="xl">

        {/* ── Page heading ──────────────────────────────────────────────── */}
        <Box mb="xl">
          <Group gap="xs" mb={6}>
            <IconMapPin size={20} color={GREEN} />
            <Title order={2}
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
              Ward {wardId} — Public Statistics
            </Title>
          </Group>
          <Text size="sm" c="dimmed">
            Real-time civic issue resolution data for this ward. Updated continuously.
          </Text>
        </Box>

        {error && (
          <Card p="lg" radius="md" mb="xl" style={{ background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)' }}>
            <Text c="red.4" size="sm">{error}</Text>
          </Card>
        )}

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="xl">
          <StatCard icon={IconFileReport}  label="Total Reports"   value={stats?.total}          accent="#3b82f6" loading={loading} />
          <StatCard icon={IconFileReport}  label="Open Issues"     value={stats?.open}           accent="#f59e0b" loading={loading} />
          <StatCard icon={IconCircleCheck} label="Resolved"        value={stats?.resolved}       accent={GREEN}   loading={loading} />
          <StatCard icon={IconChartBar}    label="Resolution Rate" value={stats ? `${stats.resolutionRate}%` : '—'} accent="#a855f7" loading={loading} />
        </SimpleGrid>

        {/* ── Resolution rate progress bar ─────────────────────────────── */}
        <Card p="lg" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={600} c="white">Overall Resolution Rate</Text>
            {loading
              ? <Skeleton height={18} width={48} />
              : <Text size="sm" fw={700}
                  c={stats.resolutionRate >= 70 ? 'teal' : stats.resolutionRate >= 40 ? 'yellow' : 'red'}>
                  {stats.resolutionRate}%
                </Text>
            }
          </Group>
          {loading
            ? <Skeleton height={10} radius="xl" />
            : <Progress
                value={stats?.resolutionRate ?? 0}
                color={stats?.resolutionRate >= 70 ? 'teal' : stats?.resolutionRate >= 40 ? 'yellow' : 'red'}
                size={10} radius="xl"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
          }
          {!loading && stats?.avgResolutionHours != null && (
            <Group gap="xs" mt="sm">
              <IconClock size={13} color="#666" />
              <Text size="xs" c="dimmed">
                Average resolution time: <strong style={{ color: '#e5e5e5' }}>{stats.avgResolutionHours}h</strong>
              </Text>
            </Group>
          )}
        </Card>

        {/* ── Status breakdown + Category breakdown side-by-side ────────── */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mb="xl">

          {/* Status breakdown */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="sm" fw={600} c="white" mb="md">Status Breakdown</Text>
            {loading
              ? <Stack gap="sm">{[1,2,3,4].map(i => <Skeleton key={i} height={28} radius="sm" />)}</Stack>
              : (
                <Stack gap="sm">
                  {[
                    { label: 'Open',        value: stats?.open,       color: '#f59e0b' },
                    { label: 'Assigned',    value: stats?.assigned,   color: '#3b82f6' },
                    { label: 'In Progress', value: stats?.inProgress, color: '#fb923c' },
                    { label: 'Resolved',    value: stats?.resolved,   color: GREEN     },
                  ].map(({ label, value, color }) => (
                    <Box key={label}>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" c="dimmed">{label}</Text>
                        <Text size="xs" fw={700} style={{ color }}>{value ?? 0}</Text>
                      </Group>
                      <Progress
                        value={stats?.total ? ((value ?? 0) / stats.total) * 100 : 0}
                        color={color} size={6} radius="xl"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      />
                    </Box>
                  ))}
                </Stack>
              )
            }
          </Card>

          {/* Category breakdown */}
          <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Text size="sm" fw={600} c="white" mb="md">Category Breakdown</Text>
            {loading
              ? <Stack gap="sm">{[1,2,3,4].map(i => <Skeleton key={i} height={24} radius="sm" />)}</Stack>
              : stats?.catCounts?.length === 0
              ? <Text size="sm" c="dimmed">No data yet.</Text>
              : (
                <Stack gap="sm">
                  {stats?.catCounts?.map((c, i) => (
                    <Box key={c.label ?? i}>
                      <Group justify="space-between" mb={4}>
                        <Group gap="xs">
                          <Box style={{ width: 8, height: 8, borderRadius: '50%',
                            background: CAT_PALETTE[i % CAT_PALETTE.length], flexShrink: 0 }} />
                          <Text size="xs" c="dimmed">{c.label ?? 'Unknown'}</Text>
                        </Group>
                        <Text size="xs" fw={700} c="white">{c.count}</Text>
                      </Group>
                      <Progress
                        value={(c.count / maxCat) * 100}
                        color={CAT_PALETTE[i % CAT_PALETTE.length]}
                        size={5} radius="xl"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      />
                    </Box>
                  ))}
                </Stack>
              )
            }
          </Card>
        </SimpleGrid>

        {/* ── Recently resolved ─────────────────────────────────────────── */}
        <Card p="lg" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group gap="xs" mb="md">
            <IconCircleCheck size={16} color={GREEN} />
            <Text size="sm" fw={600} c="white">Recently Resolved Issues</Text>
          </Group>
          <Table
            styles={{
              th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 },
              td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 10, paddingBottom: 10 },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Issue</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Resolved On</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading
                ? Array.from({ length: 4 }, (_, i) => (
                  <Table.Tr key={i}>
                    {[1,2,3,4].map(j => <Table.Td key={j}><Skeleton height={14} /></Table.Td>)}
                  </Table.Tr>
                ))
                : stats?.recentResolved?.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="dimmed" ta="center" py="md">No resolved issues yet.</Text>
                    </Table.Td>
                  </Table.Tr>
                )
                : stats?.recentResolved?.map(r => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/reports/${r._id}`}
                        size="sm" c="white" fw={500} underline="never">
                        {r.title?.length > 44 ? r.title.slice(0, 42) + '…' : r.title}
                        <IconExternalLink size={10} style={{ marginLeft: 4, opacity: 0.35 }} />
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color="cyan" variant="dot">{r.category ?? '—'}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={600}
                        c={r.priorityScore >= 8 ? 'red' : r.priorityScore >= 4 ? 'yellow' : 'dimmed'}>
                        {r.priorityScore != null ? `${r.priorityScore}/10` : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {r.resolvedAt
                          ? new Date(r.resolvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              }
            </Table.Tbody>
          </Table>
        </Card>

        {/* ── Footer CTA ────────────────────────────────────────────────── */}
        <Divider color={BORDER} mb="xl" />
        <Group justify="center" gap="xl">
          <Anchor component={Link} to="/register" c="civic.4" size="sm" underline="never">
            Submit a report →
          </Anchor>
          <Anchor component={Link} to="/map" c="dimmed" size="sm" underline="never">
            View live map
          </Anchor>
          <Anchor component={Link} to="/login" c="dimmed" size="sm" underline="never">
            Sign in
          </Anchor>
        </Group>
      </Box>
    </Box>
  );
}
