import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Title, Text, Group, Card, Table, Badge, Select, Button,
  Anchor, TextInput, Skeleton, Pagination,
} from '@mantine/core';
import { IconDownload, IconSearch, IconFilter, IconCalendar } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';

const STATUS_COLOR = {
  Open: 'yellow',
  Assigned: 'blue',
  'In Progress': 'orange',
  Resolved: 'teal',
};

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.82rem' },
  label: { color: '#888', fontSize: '0.78rem', fontWeight: 500 },
};

const LIMIT = 15;

// ─── AllReports ───────────────────────────────────────────────────────────────
export default function AllReports() {
  const { token } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [statusF, setStatusF] = useState(null);
  const [categoryF, setCategoryF] = useState(null);
  const [wardF, setWardF] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildParams = useCallback(() => {
    const p = { page, limit: LIMIT };
    if (statusF) p.status = statusF;
    if (categoryF) p.category = categoryF;
    if (wardF) p.wardId = wardF.trim();
    if (fromDate) p.from = new Date(fromDate).toISOString();
    if (toDate) p.to = new Date(toDate).toISOString();
    return p;
  }, [page, statusF, categoryF, wardF, fromDate, toDate]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/reports', { params: buildParams() });
      const data = res.data.data;
      setReports(data.reports ?? data.docs ?? []);
      setTotal(data.totalPages ?? 1);
    } catch (err) {
      console.error('AllReports error:', err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = buildParams();
      delete params.page;
      delete params.limit;

      // Build query string manually for direct download
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      ).toString();

      const res = await API.get(`/export/reports?${qs}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `civicresolve-reports-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      notifications.show({ title: 'Export ready ✓', message: 'CSV downloaded.', color: 'civic', autoClose: 3000 });
    } catch {
      notifications.show({ title: 'Export failed', message: 'Could not generate CSV.', color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            All Reports
          </Title>
          <Text size="sm" c="dimmed" mt={4}>Platform-wide report registry with full filter access.</Text>
        </Box>
        <Button
          size="sm" radius="md" variant="outline" color="civic"
          leftSection={<IconDownload size={15} />}
          loading={exporting}
          onClick={handleExport}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Export CSV
        </Button>
      </Group>

      {/* Filter bar */}
      <Card p="md" radius="md" mb="lg" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group gap="md" wrap="wrap">
          <Select size="xs" w={140} placeholder="All statuses" clearable radius="md"
            data={['Open', 'Assigned', 'In Progress', 'Resolved']}
            value={statusF} onChange={v => { setStatusF(v); setPage(1); }} styles={inputSm} />
          <Select size="xs" w={140} placeholder="All categories" clearable radius="md"
            data={['Road', 'Waste', 'Drainage', 'Lighting', 'Safety', 'Parks', 'Other']}
            value={categoryF} onChange={v => { setCategoryF(v); setPage(1); }} styles={inputSm} />
          <TextInput
            size="xs" w={130} placeholder="Ward ID" radius="md"
            leftSection={<IconFilter size={12} />}
            value={wardF} onChange={e => { setWardF(e.target.value); setPage(1); }}
            styles={inputSm} />
          <TextInput size="xs" w={140} type="date" placeholder="From"
            leftSection={<IconCalendar size={12} />}
            value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
            styles={inputSm} />
          <TextInput size="xs" w={140} type="date" placeholder="To"
            leftSection={<IconCalendar size={12} />}
            value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
            styles={inputSm} />
          <Button size="xs" variant="subtle" color="red" radius="md"
            onClick={() => { setStatusF(null); setCategoryF(null); setWardF(''); setFromDate(''); setToDate(''); setPage(1); }}>
            Clear
          </Button>
        </Group>
      </Card>

      {/* Table */}
      <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
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
              <Table.Th>Status</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Ward</Table.Th>
              <Table.Th>Submitted By</Table.Th>
              <Table.Th>Date</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading
              ? Array.from({ length: LIMIT }, (_, i) => (
                <Table.Tr key={i}>
                  {[1, 2, 3, 4, 5, 6, 7].map(j => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                </Table.Tr>
              ))
              : reports.length === 0
                ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text size="sm" c="dimmed" ta="center" py="xl">No reports match the current filters.</Text>
                    </Table.Td>
                  </Table.Tr>
                )
                : reports.map(r => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/ward/reports/${r._id}`}
                        size="xs" c="white" fw={600} underline="never"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {r.title?.slice(0, 38) ?? '—'}
                      </Anchor>
                    </Table.Td>
                    <Table.Td><Badge size="xs" color="cyan" variant="dot">{r.category ?? '—'}</Badge></Table.Td>
                    <Table.Td><Badge size="sm" color={STATUS_COLOR[r.status] ?? 'gray'} variant="light">{r.status}</Badge></Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={700} c={r.priorityScore >= 4 ? '#ef4444' : r.priorityScore >= 2 ? '#f59e0b' : '#6b7280'}>
                        {r.priorityScore ?? '—'}/5
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{r.wardId ?? '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{r.submittedBy?.name ?? 'Anonymous'}</Text></Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(r.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
            }
          </Table.Tbody>
        </Table>

        {total > 1 && (
          <Group justify="center" mt="lg">
            <Pagination total={total} value={page} onChange={setPage} color="civic" size="sm" radius="md" />
          </Group>
        )}
      </Card>
    </Box>
  );
}
