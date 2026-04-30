import { useState, useMemo, useEffect } from 'react';
import {
  Box, Title, Text, Group, Card, Table, Badge, Select, Modal,
  TextInput, Skeleton, ActionIcon, Tooltip, CopyButton, Stack,
  ScrollArea, Tabs, Button,
} from '@mantine/core';
import {
  IconSearch, IconEdit, IconUserOff, IconKey, IconCheck, IconCopy,
  IconUserCheck, IconClock,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER  = 'rgba(255,255,255,0.07)';

const ROLE_COLOR = {
  citizen:       'civic',
  ward_official: 'blue',
  field_worker:  'yellow',
  system_admin:  'red',
};

const ROLE_LABELS = {
  citizen:       'Citizen',
  ward_official: 'Ward Official',
  field_worker:  'Field Worker',
  system_admin:  'System Admin',
};

const inputSm = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.82rem' },
  label: { color: '#888', fontSize: '0.78rem', fontWeight: 500 },
};

const TH_STYLES = {
  th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
  td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 11, paddingBottom: 11 },
};

// ─── Editable role cell ───────────────────────────────────────────────────────
function RoleCell({ user, onRoleChange }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const handleChange = async (newRole) => {
    if (!newRole || newRole === user.role) { setEditing(false); return; }
    setSaving(true);
    try {
      await API.patch(`/auth/users/${user._id}/role`, { role: newRole });
      onRoleChange(user._id, newRole);
      notifications.show({ title: 'Role updated ✓', message: `${user.name} is now a ${ROLE_LABELS[newRole]}.`, color: 'civic', autoClose: 3000 });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not update role.', color: 'red' });
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Select
        size="xs"
        data={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        defaultValue={user.role}
        onChange={handleChange}
        disabled={saving}
        autoFocus
        onBlur={() => setEditing(false)}
        styles={inputSm}
        w={150}
      />
    );
  }

  return (
    <Group gap={6}>
      <Badge size="xs" color={ROLE_COLOR[user.role] ?? 'gray'} variant="light">
        {ROLE_LABELS[user.role] ?? user.role}
      </Badge>
      <Tooltip label="Edit role" position="top" withArrow>
        <ActionIcon size="xs" variant="subtle" color="dimmed" onClick={() => setEditing(true)}>
          <IconEdit size={12} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

// ─── User table row ───────────────────────────────────────────────────────────
function UserRow({ u, me, onRoleChange, onToggleActive, onResetPassword, resetLoading, showApprove }) {
  return (
    <Table.Tr key={u._id}>
      <Table.Td>
        <Group gap={6}>
          <Text size="sm" fw={600} c="white">{u.name}</Text>
          {!u.isActive && (
            <Badge size="xs" color="orange" variant="dot">Inactive</Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{u.email}</Text>
      </Table.Td>
      <Table.Td>
        <RoleCell user={u} onRoleChange={onRoleChange} />
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{u.wardId ?? u.employeeId ?? '—'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {showApprove && (
            <Tooltip label="Approve user" position="top" withArrow>
              <ActionIcon
                size="sm"
                variant="light"
                color="teal"
                onClick={() => onToggleActive(u)}
              >
                <IconUserCheck size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={u.isActive ? 'Deactivate user' : 'Reactivate user'} position="top" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color={u.isActive ? 'red' : 'teal'}
              disabled={u._id === me?._id}
              onClick={() => onToggleActive(u)}
            >
              <IconUserOff size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset password" position="top" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="orange"
              disabled={u._id === me?._id || resetLoading}
              onClick={() => onResetPassword(u)}
            >
              <IconKey size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

// ─── UserManagement ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const { user: me } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState('all');

  // Reset password modal
  const [resetTarget,  setResetTarget]  = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await API.get('/auth/users');
        const list = res.data.data?.users ?? res.data.data ?? [];
        setUsers(Array.isArray(list) ? list : []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = q
      ? users.filter(u =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
        )
      : users;
    if (activeTab === 'pending') return base.filter(u => !u.isActive);
    return base;
  }, [users, search, activeTab]);

  const pendingCount = useMemo(() => users.filter(u => !u.isActive).length, [users]);

  const handleRoleChange = (id, role) =>
    setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));

  const handleToggleActive = async (targetUser) => {
    try {
      const res = await API.put(`/auth/users/${targetUser._id}/deactivate`);
      const { isActive } = res.data.data;
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, isActive } : u));
      notifications.show({
        title: isActive ? 'User approved ✓' : 'User deactivated',
        message: `${targetUser.name} is now ${isActive ? 'active' : 'deactivated'}.`,
        color: isActive ? 'civic' : 'orange',
        autoClose: 3000,
      });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not update user.', color: 'red' });
    }
  };

  const handleResetPassword = async (targetUser) => {
    setResetLoading(true);
    try {
      const res = await API.put(`/auth/users/${targetUser._id}/reset-password`);
      setResetTarget({
        name:         res.data.data.userName,
        tempPassword: res.data.data.tempPassword,
      });
    } catch (err) {
      notifications.show({ title: 'Reset failed', message: err.response?.data?.message ?? 'Could not reset password.', color: 'red' });
    } finally {
      setResetLoading(false);
    }
  };

  const tableContent = (showApprove = false) => (
    <ScrollArea type="scroll" scrollbars="x">
      <Table styles={TH_STYLES}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Ward / Employee ID</Table.Th>
            <Table.Th>Joined</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <Table.Tr key={i}>
                  {[1,2,3,4,5,6].map(j => <Table.Td key={j}><Skeleton height={16} /></Table.Td>)}
                </Table.Tr>
              ))
            : filtered.length === 0
            ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      {users.length === 0
                        ? '/api/auth/users endpoint not yet implemented — add it to see users here.'
                        : activeTab === 'pending'
                        ? 'No users awaiting approval.'
                        : 'No users match your search.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )
            : filtered.map(u => (
                <UserRow
                  key={u._id}
                  u={u}
                  me={me}
                  onRoleChange={handleRoleChange}
                  onToggleActive={handleToggleActive}
                  onResetPassword={handleResetPassword}
                  resetLoading={resetLoading}
                  showApprove={showApprove}
                />
              ))
          }
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  return (
    <>
      {/* Reset Password Result Modal */}
      <Modal
        opened={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={
          <Text fw={700} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            🔑 Temporary Password Generated
          </Text>
        }
        centered
        radius="md"
        styles={{
          content: { background: '#161616', border: '1px solid rgba(255,255,255,0.08)' },
          header:  { background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.06)' },
        }}
      >
        {resetTarget && (
          <Stack gap="md" pt="xs">
            <Text size="sm" c="dimmed">
              The password for <strong style={{ color: '#fff' }}>{resetTarget.name}</strong> has been reset.
              Share this temporary password securely with the user.
            </Text>
            <Group gap="xs" p="sm" style={{ background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.20)', borderRadius: 8 }}>
              <Text size="sm" fw={700} c="civic.4" style={{ fontFamily: 'monospace', flex: 1, letterSpacing: '0.1em' }}>
                {resetTarget.tempPassword}
              </Text>
              <CopyButton value={resetTarget.tempPassword} timeout={2000}>
                {({ copied, copy }) => (
                  <ActionIcon size="sm" color={copied ? 'teal' : 'civic'} variant="subtle" onClick={copy}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                )}
              </CopyButton>
            </Group>
            <Text size="xs" c="dimmed">
              The user must change this password on next login. This dialog will not show again.
            </Text>
          </Stack>
        )}
      </Modal>

      <Box>
        <Box mb="xl">
          <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            User Management
          </Title>
          <Text size="sm" c="dimmed" mt={4}>Manage roles and access for all platform users.</Text>
        </Box>

        <Card p="lg" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group justify="space-between" mb="md">
            <TextInput
              placeholder="Search by name, email or role…"
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              size="sm"
              radius="md"
              w={280}
              styles={inputSm}
            />
            <Text size="xs" c="dimmed">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Text>
          </Group>

          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            styles={{
              tab:  { color: '#888', fontSize: '0.82rem', '&[dataActive]': { color: '#fff' } },
              list: { borderBottom: `1px solid ${BORDER}`, marginBottom: 16 },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="all" leftSection={<IconUserCheck size={13} />}>
                All Users
                <Badge size="xs" ml={6} color="gray" variant="filled">{users.length}</Badge>
              </Tabs.Tab>
              <Tabs.Tab
                value="pending"
                leftSection={<IconClock size={13} />}
                color={pendingCount > 0 ? 'orange' : undefined}
              >
                Pending Approval
                {pendingCount > 0 && (
                  <Badge size="xs" ml={6} color="orange" variant="filled">{pendingCount}</Badge>
                )}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="all">
              {tableContent(false)}
            </Tabs.Panel>

            <Tabs.Panel value="pending">
              {pendingCount === 0 && !loading ? (
                <Box py="xl" ta="center">
                  <IconUserCheck size={40} color="#333" style={{ marginBottom: 12 }} />
                  <Text size="sm" c="dimmed">No users awaiting approval. All registered accounts are active.</Text>
                </Box>
              ) : (
                <>
                  <Text size="xs" c="dimmed" mb="md">
                    These accounts are currently inactive. Click <strong style={{ color: '#fff' }}>Approve</strong> to activate them.
                  </Text>
                  {tableContent(true)}
                </>
              )}
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Box>
    </>
  );
}
