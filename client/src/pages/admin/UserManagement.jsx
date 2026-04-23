import React, { useState, useMemo } from 'react';
import {
  Box, Title, Text, Group, Card, Table, Badge, Select,
  TextInput, Skeleton, ActionIcon, Tooltip,
} from '@mantine/core';
import { IconSearch, IconEdit, IconUserOff } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { useEffect } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER  = 'rgba(255,255,255,0.07)';

const ROLE_COLOR = {
  citizen:      'civic',
  ward_official:'blue',
  field_worker: 'yellow',
  system_admin: 'red',
};

const ROLE_LABELS = {
  citizen:      'Citizen',
  ward_official:'Ward Official',
  field_worker: 'Field Worker',
  system_admin: 'System Admin',
};

const inputSm = {
  input:  { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5', fontSize: '0.82rem' },
  label:  { color: '#888', fontSize: '0.78rem', fontWeight: 500 },
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

// ─── UserManagement ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  // Fetch all users via /api/auth/users (admin-only endpoint — may not exist yet)
  // Falls back gracefully with empty list and a friendly message
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await API.get('/auth/users');
        const list = res.data.data?.users ?? res.data.data ?? [];
        setUsers(Array.isArray(list) ? list : []);
      } catch {
        // Endpoint may not exist yet — use empty degraded state
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleRoleChange = (id, role) => {
    setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
  };

  const handleToggleActive = async (targetUser) => {
    try {
      const res = await API.put(`/auth/users/${targetUser._id}/deactivate`);
      const { isActive } = res.data.data;
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, isActive } : u));
      notifications.show({
        title: isActive ? 'User reactivated ✓' : 'User deactivated',
        message: `${targetUser.name} is now ${isActive ? 'active' : 'deactivated'}.`,
        color: isActive ? 'civic' : 'orange',
        autoClose: 3000,
      });
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not update user.', color: 'red' });
    }
  };

  return (
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

        <Table
          styles={{
            th: { color: '#555', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 },
            td: { borderBottom: `1px solid rgba(255,255,255,0.04)`, paddingTop: 11, paddingBottom: 11 },
          }}
        >
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
                          : 'No users match your search.'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )
              : filtered.map(u => (
                  <Table.Tr key={u._id}>
                    <Table.Td>
                      <Text size="sm" fw={600} c="white">{u.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{u.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <RoleCell user={u} onRoleChange={handleRoleChange} />
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
                      <Tooltip label={u.isActive ? 'Deactivate user' : 'Reactivate user'} position="top" withArrow>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color={u.isActive ? 'red' : 'teal'}
                          disabled={u._id === me?._id}
                          onClick={() => handleToggleActive(u)}
                        >
                          <IconUserOff size={14} />
                        </ActionIcon>
                      </Tooltip>
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
