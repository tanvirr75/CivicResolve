import { useState, useEffect } from 'react';
import {
  Box, Card, Title, Text, TextInput, Button, Group, Stack,
  RingProgress, Avatar, Badge, SimpleGrid, Divider,
  PasswordInput, Collapse,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUserEdit, IconCheck, IconDeviceFloppy, IconKey, IconChevronDown,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const GREEN = '#00FF41';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.08)';

const inputStyles = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5' },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

export default function Profile() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(user || {});

  // ── Change password state ──────────────────────────────────────────────────
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name:             user?.name || '',
      phone:            user?.phone || '',
      dob:              user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
      bloodGroup:       user?.bloodGroup || '',
      nationality:      user?.nationality || '',
      address:          user?.address || '',
      nid:              user?.nid || '',
      emergencyContact: user?.emergencyContact || '',
      officeAddress:    user?.officeAddress || '',
      contactNumber:    user?.contactNumber || '',
      vehicleType:      user?.vehicleType || '',
      workingHours:     user?.workingHours || '',
    },
  });

  useEffect(() => {
    if (user) setProfileData(user);
  }, [user]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await API.put('/auth/profile', values);
      const updatedUser = res.data.data.user;
      setProfileData(updatedUser);
      const token = localStorage.getItem('civic_token');
      login(token, updatedUser);
      notifications.show({
        title: 'Profile Updated',
        message: 'Your information has been saved successfully.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to update profile',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) {
      notifications.show({ title: 'Required', message: 'Enter your current password.', color: 'orange' });
      return;
    }
    if (pwForm.next.length < 8) {
      notifications.show({ title: 'Too short', message: 'New password must be at least 8 characters.', color: 'orange' });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      notifications.show({ title: 'Mismatch', message: 'New passwords do not match.', color: 'red' });
      return;
    }
    setPwLoading(true);
    try {
      await API.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      notifications.show({ title: 'Password changed ✓', message: 'Your password has been updated.', color: 'teal', autoClose: 3000 });
      setPwForm({ current: '', next: '', confirm: '' });
      setShowPwChange(false);
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not change password.', color: 'red' });
    } finally {
      setPwLoading(false);
    }
  };

  const completeness = profileData?.profileCompleteness || 30;
  const ringColor = completeness === 100 ? GREEN : completeness >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <Box maw={900} mx="auto" p="md">
      <Group align="flex-end" mb="xl">
        <Avatar size={80} radius="xl" color="civic">
          {profileData?.name?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box style={{ flex: 1 }}>
          <Title order={2} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
            {profileData?.name}
          </Title>
          <Text c="dimmed">
            {profileData?.email} • <Badge color="civic" variant="outline">{profileData?.role}</Badge>
          </Text>
        </Box>
      </Group>

      {/* ── Profile completeness ring ──────────────────────────────────────── */}
      <Card p="lg" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group gap="xl" align="center">
          <RingProgress
            size={110}
            thickness={9}
            roundCaps
            sections={[{ value: completeness, color: ringColor }]}
            label={
              <Text ta="center" fw={800} size="sm" style={{ color: ringColor, fontFamily: "'Space Grotesk', sans-serif" }}>
                {completeness}%
              </Text>
            }
          />
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={700} c="white" mb={4} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Profile Completeness
            </Text>
            <Text size="xs" c="dimmed" lh={1.6}>
              {completeness === 100
                ? 'Your profile is fully complete. All platform features are unlocked.'
                : 'Fill in more profile fields to unlock the full platform experience and improve civic report credibility.'}
            </Text>
            {completeness < 100 && (
              <Text size="xs" mt={8} style={{ color: ringColor, fontWeight: 600 }}>
                {100 - completeness}% remaining
              </Text>
            )}
          </Box>
        </Group>
      </Card>

      {/* ── Personal information form ─────────────────────────────────────── */}
      <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group mb="lg">
          <IconUserEdit size={20} color={GREEN} />
          <Title order={4} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
            Personal Information
          </Title>
        </Group>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Full Name" {...form.getInputProps('name')} required styles={inputStyles} />
              <TextInput label="Phone Number" {...form.getInputProps('phone')} styles={inputStyles} />
              <TextInput label="Date of Birth" type="date" {...form.getInputProps('dob')} styles={inputStyles} />
              <TextInput label="Blood Group" {...form.getInputProps('bloodGroup')} styles={inputStyles} />
              <TextInput label="Nationality" {...form.getInputProps('nationality')} styles={inputStyles} />
              <TextInput label="National ID (NID)" {...form.getInputProps('nid')} styles={inputStyles} />
              <TextInput label="Emergency Contact" {...form.getInputProps('emergencyContact')} styles={inputStyles} />
            </SimpleGrid>
            <TextInput label="Full Address" {...form.getInputProps('address')} styles={inputStyles} />

            {profileData?.role === 'ward_official' && (
              <>
                <Divider my="md" label="Ward Official Info" labelPosition="center" color={BORDER} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Office Address" {...form.getInputProps('officeAddress')} styles={inputStyles} />
                  <TextInput label="Office Contact Number" {...form.getInputProps('contactNumber')} styles={inputStyles} />
                </SimpleGrid>
              </>
            )}

            {profileData?.role === 'field_worker' && (
              <>
                <Divider my="md" label="Field Worker Info" labelPosition="center" color={BORDER} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Vehicle Type (e.g. Truck, Van)" {...form.getInputProps('vehicleType')} styles={inputStyles} />
                  <TextInput label="Working Hours" {...form.getInputProps('workingHours')} styles={inputStyles} />
                </SimpleGrid>
              </>
            )}

            <Button
              type="submit"
              color="civic"
              loading={loading}
              leftSection={<IconDeviceFloppy size={16} />}
              mt="xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              Save Profile Changes
            </Button>
          </Stack>
        </form>
      </Card>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Card p="xl" radius="md" mt="lg" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group
          justify="space-between"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowPwChange(s => !s)}
        >
          <Group gap="sm">
            <IconKey size={20} color={GREEN} />
            <Title order={4} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
              Change Password
            </Title>
          </Group>
          <IconChevronDown
            size={16}
            color="#666"
            style={{
              transform: showPwChange ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </Group>

        <Collapse in={showPwChange}>
          <Stack gap="md" mt="lg">
            <Divider color={BORDER} />
            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              styles={inputStyles}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <PasswordInput
                label="New Password"
                placeholder="Min. 8 characters"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                styles={inputStyles}
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                styles={inputStyles}
              />
            </SimpleGrid>
            <Group>
              <Button
                color="civic"
                loading={pwLoading}
                disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
                onClick={handleChangePassword}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
              >
                Update Password
              </Button>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => { setShowPwChange(false); setPwForm({ current: '', next: '', confirm: '' }); }}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        </Collapse>
      </Card>
    </Box>
  );
}
