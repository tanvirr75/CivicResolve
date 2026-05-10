import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, Badge, Card, SimpleGrid,
  Skeleton, ThemeIcon, Anchor,
} from '@mantine/core';
import {
  IconBriefcase, IconClockHour4, IconCircleCheck, IconMapPin, IconInbox,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Pending:      'yellow',
  'En Route':   'blue',
  'In Progress':'orange',
  Completed:    'teal',
  Cancelled:    'red',
};

const CATEGORY_COLOR = {
  Road: '#f59e0b',
  Waste: '#ef4444',
  Drainage: '#3b82f6',
  Lighting: '#fbbf24',
  Safety: '#ec4899',
  Parks: '#00FF41',
  Other: '#8b5cf6',
};

// ─── Work order card ──────────────────────────────────────────────────────────
function WorkOrderCard({ order }) {
  const report = order.report ?? {};
  const catColor = CATEGORY_COLOR[report.category] ?? '#6366f1';
  const status = order.status ?? 'Pending';

  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
      <Card
        component={Link}
        to={`/field/orders/${order._id}`}
        p="lg"
        radius="md"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderLeft: `4px solid ${catColor}`,
          textDecoration: 'none',
          display: 'block',
          transition: 'border-color .2s, box-shadow .2s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px ${catColor}22`; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <Group justify="space-between" mb="sm">
          <Badge
            size="xs"
            style={{ background: catColor + '22', color: catColor, border: `1px solid ${catColor}55` }}
          >
            {report.category ?? 'Other'}
          </Badge>
          <Badge size="sm" color={STATUS_COLOR[status] ?? 'gray'} variant="light">{status}</Badge>
        </Group>

        <Title order={5} c="white" mb={6}
          style={{ fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
          {report.title ?? 'Work Order'}
        </Title>

        {report.description && (
          <Text size="xs" c="dimmed" lineClamp={2} mb="sm" lh={1.55}>
            {report.description}
          </Text>
        )}

        <Group gap="sm" mt="xs" wrap="wrap">
          {(report.latitude || report.location) && (
            <Group gap={4}>
              <IconMapPin size={12} color="#666" />
              <Text size="xs" c="dimmed">
                {report.latitude?.toFixed(4) ?? report.location?.coordinates?.[1]?.toFixed(4)},
                {' '}{report.longitude?.toFixed(4) ?? report.location?.coordinates?.[0]?.toFixed(4)}
              </Text>
            </Group>
          )}
          {order.createdAt && (
            <Group gap={4}>
              <IconClockHour4 size={12} color="#666" />
              <Text size="xs" c="dimmed">
                {new Date(order.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
              </Text>
            </Group>
          )}
        </Group>
      </Card>
    </motion.div>
  );
}

// ─── FieldDashboard ───────────────────────────────────────────────────────────
export default function FieldDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch work orders assigned to the current worker
      const res = await API.get('/work-orders', { params: { assignedTo: 'me', limit: 50 } });
      const list = res.data.data?.workOrders ?? res.data.data?.docs ?? res.data.data ?? [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Field dashboard error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const active    = orders.filter(o => o.status !== 'Completed');
  const completed = orders.filter(o => o.status === 'Completed');

  return (
    <Box>
      {/* Header */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          My Work Orders
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Welcome back, {user?.name ?? 'Field Worker'} — here are your assigned jobs.
        </Text>
      </Box>

      {/* Summary strip */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        {[
          { icon: IconBriefcase, label: 'Total Assigned', value: orders.length, accent: '#3b82f6' },
          { icon: IconClockHour4, label: 'Active', value: active.length, accent: '#f59e0b' },
          { icon: IconCircleCheck, label: 'Completed', value: completed.length, accent: GREEN },
        ].map(s => (
          <Card key={s.label} p="lg" radius="md"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${s.accent}` }}>
            <Group gap="md">
              <ThemeIcon size={40} radius="md"
                style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: s.accent }}>
                <s.icon size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{s.label}</Text>
                {loading
                  ? <Skeleton height={28} width={40} mt={4} />
                  : <Title order={3} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</Title>
                }
              </Box>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Active orders (Pending / En Route / In Progress) */}
      <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
        Active Jobs
      </Text>
      {loading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={160} radius="md" />)}
        </SimpleGrid>
      ) : active.length === 0 ? (
        <Card p="xl" radius="md" mb="xl"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Stack align="center" gap="xs">
            <IconInbox size={32} color="#444" />
            <Text c="dimmed" size="sm">No active work orders — you're all caught up.</Text>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
          {active.map(o => <WorkOrderCard key={o._id} order={o} />)}
        </SimpleGrid>
      )}

      {/* Completed orders */}
      {completed.length > 0 && (
        <>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="md" style={{ letterSpacing: '0.06em' }}>
            Completed Jobs
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {completed.map(o => <WorkOrderCard key={o._id} order={o} />)}
          </SimpleGrid>
        </>
      )}
    </Box>
  );
}
