import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Group, Stack, Badge, Card, Table, Anchor,
  Skeleton, Select, Button, Modal, Pagination, TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconExternalLink, IconUsers, IconCalendar } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { notifications } from '@mantine/notifications';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN = '#00FF41';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Open: 'yellow',
  Assigned: 'blue',
  'In Progress': 'orange',
  Resolved: 'teal',
};

const PRIO_COLOR = (s) =>
  s >= 4 ? '#ef4444' : s >= 2 ? '#f59e0b' : '#6b7280';

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.82rem' },
  label: { color: '#888', fontSize: '0.78rem', fontWeight: 500, marginBottom: 4 },
};

const LIMIT = 10;

// ─── ReportsList ──────────────────────────────────────────────────────────────
export default function ReportsList() {
  const { user } = useAuth();

  // ── Data state ────────────────────────────────────────────────────────────
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [statusF, setStatusF] = useState(null);
  const [categoryF, setCategoryF] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);

  // ── Assign modal ──────────────────────────────────────────────────────────
  const [assignModal, { open: openAssign, close: closeAssign }] = useDisclosure(false);
  const [targetReport, setTargetReport] = useState(null);   // report being assigned
  const [workers, setWorkers] = useState([]);
  const [selWorker, setSelWorker] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: '-priorityScore' };
      if (user?.wardId) params.wardId = user.wardId;
      if (statusF) params.status = statusF;
      if (categoryF) params.category = categoryF;
      if (dateRange[0]) params.from = dateRange[0].toISOString();
      if (dateRange[1]) params.to = dateRange[1].toISOString();

      const res = await API.get('/reports', { params });
      const data = res.data.data;
      setReports(data.reports ?? data.docs ?? []);
      setTotal(data.totalPages ?? 1);
    } catch (err) {
      console.error('Reports list error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusF, categoryF, dateRange, user]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Fetch field workers for assign modal ──────────────────────────────────
  const loadWorkers = useCallback(async () => {
    try {
      const res = await API.get('/auth/workers');
      const list = res.data.data?.workers ?? res.data.data ?? [];
      setWorkers(list.map(w => ({ value: w._id, label: `${w.name} (${w.employeeId ?? 'FW'})` })));
    } catch {
      setWorkers([]);
    }
  }, []);

  const openAssignModal = (report) => {
    setTargetReport(report);
    setSelWorker(null);
    loadWorkers();
    openAssign();
  };

  // ── Confirm assignment ────────────────────────────────────────────────────
  const confirmAssign = async () => {
    if (!selWorker || !targetReport) return;
    setAssigning(true);
    try {
      await API.put(`/reports/${targetReport._id}/status`, { status: 'Assigned', assignedTo: selWorker });
      notifications.show({ title: 'Worker assigned ✓', message: `Report assigned to field worker.`, color: 'civic', autoClose: 3000 });
      setReports(prev =>
        prev.map(r => r._id === targetReport._id ? { ...r, status: 'Assigned' } : r)
      );
      closeAssign();
    } catch (err) {
      notifications.show({ title: 'Assign failed', message: err.response?.data?.message ?? 'Could not assign.', color: 'red' });
    } finally {
      setAssigning(false);
    }
  };

  // ── Socket.io live badge patch ────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;
    const socket = io({ transports: ['websocket'] });
    socket.emit('joinRoom', user._id);
    socket.on('reportStatusUpdated', ({ reportId, status }) => {
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, status } : r));
    });
    return () => socket.disconnect();
  }, [user]);

  // ── Table rows ────────────────────────────────────────────────────────────
  const rows = loading
    ? Array.from({ length: LIMIT }, (_, i) => (
      <Table.Tr key={i}>
        {Array.from({ length: 6 }, (_, j) => (
          <Table.Td key={j}><Skeleton height={16} radius="sm" /></Table.Td>
        ))}
      </Table.Tr>
    ))
    : reports.map(r => (
      <Table.Tr key={r._id}>
        <Table.Td>
          <Anchor component={Link} to={`/ward/reports/${r._id}`}
            size="sm" c="white" fw={600} underline="never"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {r.title?.length > 36 ? r.title.slice(0, 34) + '…' : r.title}
            <IconExternalLink size={10} style={{ marginLeft: 4, opacity: 0.4 }} />
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
          <Text size="sm" fw={700} style={{ color: PRIO_COLOR(r.priorityScore) }}>
            {r.priorityScore ?? '—'}/5
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {r.submittedBy?.name ?? 'Anonymous'}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap={6}>
            <Text size="xs" c="dimmed">{r.assignedTo?.name ?? '—'}</Text>
            {r.status !== 'Resolved' && (
              <Button
                size="xs" radius="md" variant="light" color="civic"
                leftSection={<IconUsers size={12} />}
                onClick={() => openAssignModal(r)}
              >
                Assign
              </Button>
            )}
          </Group>
        </Table.Td>
      </Table.Tr>
    ));

  return (
    <Box>
      {/* Header */}
      <Box mb="xl">
        <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
          Ward Reports
        </Title>
        <Text size="sm" c="dimmed" mt={4}>All incidents escalated to your ward.</Text>
      </Box>

      {/* Filter bar */}
      <Card p="md" radius="md" mb="lg" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group gap="md" wrap="wrap">
          <Select size="xs" w={140} placeholder="All statuses" clearable radius="md"
            data={['Open', 'Assigned', 'In Progress', 'Resolved']}
            value={statusF} onChange={v => { setStatusF(v); setPage(1); }}
            styles={inputSm} />
          <Select size="xs" w={140} placeholder="All categories" clearable radius="md"
            data={['Road', 'Waste', 'Drainage', 'Lighting', 'Safety', 'Parks', 'Other']}
            value={categoryF} onChange={v => { setCategoryF(v); setPage(1); }}
            styles={inputSm} />
          <TextInput
            size="xs" w={140} type="date"
            placeholder="From"
            leftSection={<IconCalendar size={12} />}
            value={dateRange[0] ? dateRange[0].toISOString().split('T')[0] : ''}
            onChange={e => {
              const d = e.target.value ? new Date(e.target.value) : null;
              setDateRange([d, dateRange[1]]);
              setPage(1);
            }}
            styles={inputSm}
          />
          <TextInput
            size="xs" w={140} type="date"
            placeholder="To"
            leftSection={<IconCalendar size={12} />}
            value={dateRange[1] ? dateRange[1].toISOString().split('T')[0] : ''}
            onChange={e => {
              const d = e.target.value ? new Date(e.target.value) : null;
              setDateRange([dateRange[0], d]);
              setPage(1);
            }}
            styles={inputSm}
          />
          <Button size="xs" variant="subtle" color="red" radius="md"
            onClick={() => { setStatusF(null); setCategoryF(null); setDateRange([null, null]); setPage(1); }}>
            Clear filters
          </Button>
        </Group>
      </Card>

      {/* Table */}
      <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Table
          styles={{
            th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
            td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 11, paddingBottom: 11 },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Submitted By</Table.Th>
              <Table.Th>Assigned To</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows}
            {!loading && reports.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text size="sm" c="dimmed" ta="center" py="xl">No reports match the current filters.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {total > 1 && (
          <Group justify="center" mt="lg">
            <Pagination total={total} value={page} onChange={setPage} color="civic" size="sm" radius="md" />
          </Group>
        )}
      </Card>

      {/* ── Assign modal ───────────────────────────────────────────────────── */}
      <Modal
        opened={assignModal}
        onClose={closeAssign}
        title={
          <Text fw={700} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
            Assign Field Worker
          </Text>
        }
        centered
        styles={{
          content: { background: '#1a1a1a', border: `1px solid ${BORDER}` },
          header: { background: '#1a1a1a', borderBottom: `1px solid ${BORDER}` },
          close: { color: '#666' },
        }}
      >
        <Stack gap="md" py="xs">
          {targetReport && (
            <Text size="sm" c="dimmed" lineClamp={2}>
              Assigning to: <span style={{ color: '#fff', fontWeight: 600 }}>{targetReport.title}</span>
            </Text>
          )}
          <Select
            label="Select field worker"
            placeholder="Choose a worker..."
            data={workers}
            value={selWorker}
            onChange={setSelWorker}
            searchable
            nothingFoundMessage="No workers found"
            styles={inputSm}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" size="sm" radius="md" onClick={closeAssign}>Cancel</Button>
            <Button color="civic" size="sm" radius="md" loading={assigning}
              disabled={!selWorker} onClick={confirmAssign}
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Confirm Assignment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
