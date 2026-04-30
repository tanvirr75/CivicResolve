import { useState, useEffect, useRef } from 'react';
import {
  Box, Card, Title, Text, TextInput, Button, Group, Stack,
  RingProgress, Avatar, Badge, SimpleGrid, Divider, Select,
  PasswordInput, Collapse, ThemeIcon, Overlay, ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUserEdit, IconCheck, IconDeviceFloppy, IconKey,
  IconChevronDown, IconCamera, IconMapPin, IconBriefcase,
  IconShield, IconCalendar, IconPhone, IconMail, IconId,
  IconBuildingSkyscraper, IconTruck, IconClock,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

const inputStyles = {
  input: { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#e5e5e5' },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

const ROLE_LABEL = {
  citizen:      'Citizen',
  ward_official:'Ward Official',
  field_worker: 'Field Worker',
  system_admin: 'System Admin',
};

const ROLE_COLOR = {
  citizen:      'civic',
  ward_official:'blue',
  field_worker: 'yellow',
  system_admin: 'red',
};

// ─── Small read-only info row ─────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <Group gap="sm" py={6} style={{ borderBottom: `1px solid ${BORDER}` }}>
      <ThemeIcon size={28} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN, flexShrink: 0 }}>
        <Icon size={14} />
      </ThemeIcon>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>{label}</Text>
        <Text size="sm" c="white" fw={500} style={{ wordBreak: 'break-word' }}>{value}</Text>
      </Box>
    </Group>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [loading,        setLoading]        = useState(false);
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [avatarPreview,  setAvatarPreview]  = useState(null);
  const [showPwChange,   setShowPwChange]   = useState(false);
  const [pwForm,         setPwForm]         = useState({ current: '', next: '', confirm: '' });
  const [pwLoading,      setPwLoading]      = useState(false);
  const fileInputRef = useRef(null);

  const role = user?.role ?? 'citizen';

  const form = useForm({
    initialValues: {
      name:             user?.name             || '',
      phone:            user?.phone            || '',
      dob:              user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
      bloodGroup:       user?.bloodGroup       || '',
      nationality:      user?.nationality      || '',
      address:          user?.address          || '',
      nid:              user?.nid              || '',
      emergencyContact: user?.emergencyContact || '',
      // ward_official
      jurisdiction:     user?.jurisdiction     || '',
      officeAddress:    user?.officeAddress    || '',
      contactNumber:    user?.contactNumber    || '',
      // field_worker
      expertise:        user?.expertise        || '',
      vehicleType:      user?.vehicleType      || '',
      workingHours:     user?.workingHours     || '',
      // system_admin
      adminLevel:       user?.adminLevel       || '',
      accessScope:      user?.accessScope      || '',
    },
  });

  useEffect(() => {
    if (user) setAvatarPreview(user.avatar || null);
  }, [user]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarLoading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await API.put('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(res.data.data.user);
      notifications.show({ title: 'Avatar updated', color: 'teal', icon: <IconCheck size={16} /> });
    } catch {
      notifications.show({ title: 'Upload failed', message: 'Could not upload image.', color: 'red' });
      setAvatarPreview(user?.avatar || null);
    } finally {
      setAvatarLoading(false);
    }
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await API.put('/auth/profile', values);
      setUser(res.data.data.user);
      notifications.show({ title: 'Profile Updated', message: 'Changes saved.', color: 'teal', icon: <IconCheck size={16} /> });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed to update profile', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!pwForm.current) { notifications.show({ title: 'Required', message: 'Enter your current password.', color: 'orange' }); return; }
    if (pwForm.next.length < 8) { notifications.show({ title: 'Too short', message: 'Min. 8 characters.', color: 'orange' }); return; }
    if (pwForm.next !== pwForm.confirm) { notifications.show({ title: 'Mismatch', message: 'New passwords do not match.', color: 'red' }); return; }
    setPwLoading(true);
    try {
      await API.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      notifications.show({ title: 'Password changed', color: 'teal', autoClose: 3000 });
      setPwForm({ current: '', next: '', confirm: '' });
      setShowPwChange(false);
    } catch (err) {
      notifications.show({ title: 'Failed', message: err.response?.data?.message ?? 'Could not change password.', color: 'red' });
    } finally {
      setPwLoading(false);
    }
  };

  const completeness = user?.profileCompleteness || 0;
  const ringColor = completeness === 100 ? GREEN : completeness >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <Box maw={960} mx="auto" p="md" pb={80}>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <Card p="xl" radius="md" mb="xl"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `3px solid ${GREEN}` }}>
        <Group gap="xl" align="flex-start" wrap="nowrap">

          {/* Avatar with upload overlay */}
          <Box style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatarPreview}
              size={100}
              radius="xl"
              color="civic"
              style={{ border: `2px solid ${GREEN_BDR}`, cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {!avatarPreview && (user?.name?.[0]?.toUpperCase() || 'U')}
            </Avatar>
            {avatarLoading && (
              <Overlay color="#000" backgroundOpacity={0.6} radius="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text size="xs" c="white">...</Text>
              </Overlay>
            )}
            <Tooltip label="Change photo" withArrow>
              <ActionIcon
                size="sm" radius="xl" variant="filled"
                style={{ position: 'absolute', bottom: 2, right: 2, background: GREEN, color: '#000' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <IconCamera size={12} stroke={2.5} />
              </ActionIcon>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </Box>

          {/* Identity info */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="sm" mb={4} align="center">
              <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
                {user?.name}
              </Title>
              <Badge color={ROLE_COLOR[role]} variant="light" size="sm">
                {ROLE_LABEL[role]}
              </Badge>
            </Group>
            <Group gap="lg" wrap="wrap">
              <Group gap="xs">
                <IconMail size={13} color="#666" />
                <Text size="sm" c="dimmed">{user?.email}</Text>
              </Group>
              {user?.phone && (
                <Group gap="xs">
                  <IconPhone size={13} color="#666" />
                  <Text size="sm" c="dimmed">{user.phone}</Text>
                </Group>
              )}
              {user?.wardId && (
                <Group gap="xs">
                  <IconMapPin size={13} color="#666" />
                  <Text size="sm" c="dimmed">Ward {user.wardId}</Text>
                </Group>
              )}
              {user?.createdAt && (
                <Group gap="xs">
                  <IconCalendar size={13} color="#666" />
                  <Text size="sm" c="dimmed">
                    Member since {new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </Text>
                </Group>
              )}
            </Group>
          </Box>

          {/* Completeness ring */}
          <Box style={{ flexShrink: 0, textAlign: 'center' }}>
            <RingProgress
              size={90}
              thickness={7}
              roundCaps
              sections={[{ value: completeness, color: ringColor }]}
              label={
                <Text ta="center" fw={800} size="xs" style={{ color: ringColor, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {completeness}%
                </Text>
              }
            />
            <Text size="xs" c="dimmed" mt={4}>Profile</Text>
          </Box>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mb="xl">

        {/* ── Personal Information ────────────────────────────────────────── */}
        <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Group gap="sm" mb="lg">
            <IconUserEdit size={18} color={GREEN} />
            <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Personal Information</Title>
          </Group>
          <form id="profile-form" onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <TextInput label="Full Name"         {...form.getInputProps('name')} required styles={inputStyles} />
              <TextInput label="Phone Number"      {...form.getInputProps('phone')} styles={inputStyles} />
              <TextInput label="Date of Birth"     type="date" {...form.getInputProps('dob')} styles={inputStyles} />
              <SimpleGrid cols={2} spacing="sm">
                <TextInput label="Blood Group"     {...form.getInputProps('bloodGroup')} styles={inputStyles} />
                <TextInput label="Nationality"     {...form.getInputProps('nationality')} styles={inputStyles} />
              </SimpleGrid>
              <TextInput label="National ID (NID)" {...form.getInputProps('nid')} styles={inputStyles} />
              <TextInput label="Emergency Contact" {...form.getInputProps('emergencyContact')} placeholder="Name & phone" styles={inputStyles} />
              <TextInput label="Full Address"      {...form.getInputProps('address')} styles={inputStyles} />
            </Stack>
          </form>
        </Card>

        {/* ── Role-specific info ──────────────────────────────────────────── */}
        <Stack gap="xl">
          <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            {role === 'citizen' && (
              <>
                <Group gap="sm" mb="lg">
                  <IconId size={18} color={GREEN} />
                  <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Citizen Identity</Title>
                </Group>
                <Stack gap="xs">
                  <InfoRow icon={IconMail}     label="Email"     value={user?.email} />
                  <InfoRow icon={IconCalendar} label="Joined"    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                  <InfoRow icon={IconMapPin}   label="Address"   value={user?.address} />
                </Stack>
              </>
            )}

            {role === 'ward_official' && (
              <>
                <Group gap="sm" mb="lg">
                  <IconBuildingSkyscraper size={18} color={GREEN} />
                  <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Ward Assignment</Title>
                </Group>
                <Stack gap="xs" mb="lg">
                  <InfoRow icon={IconMapPin}   label="Ward ID"      value={user?.wardId} />
                  <InfoRow icon={IconMapPin}   label="Jurisdiction" value={user?.jurisdiction} />
                  <InfoRow icon={IconPhone}    label="Office Phone" value={user?.contactNumber} />
                </Stack>
                <Divider color={BORDER} my="sm" />
                <Stack gap="sm" mt="sm">
                  <TextInput label="Jurisdiction / Area Name" form="profile-form" {...form.getInputProps('jurisdiction')} styles={inputStyles} />
                  <TextInput label="Office Address"           form="profile-form" {...form.getInputProps('officeAddress')} styles={inputStyles} />
                  <TextInput label="Office Contact Number"    form="profile-form" {...form.getInputProps('contactNumber')} styles={inputStyles} />
                </Stack>
              </>
            )}

            {role === 'field_worker' && (
              <>
                <Group gap="sm" mb="lg">
                  <IconTruck size={18} color={GREEN} />
                  <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Work Details</Title>
                </Group>
                <Stack gap="xs" mb="lg">
                  <InfoRow icon={IconId}      label="Employee ID"  value={user?.employeeId} />
                  <InfoRow icon={IconBriefcase} label="Expertise"  value={user?.expertise} />
                  <InfoRow icon={IconTruck}   label="Vehicle"      value={user?.vehicleType} />
                  <InfoRow icon={IconClock}   label="Working Hours" value={user?.workingHours} />
                </Stack>
                <Divider color={BORDER} my="sm" />
                <Stack gap="sm" mt="sm">
                  <TextInput label="Area of Expertise"   form="profile-form" {...form.getInputProps('expertise')} placeholder="e.g. Drainage, Electrical" styles={inputStyles} />
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput label="Vehicle Type"      form="profile-form" {...form.getInputProps('vehicleType')} placeholder="e.g. Truck" styles={inputStyles} />
                    <TextInput label="Working Hours"     form="profile-form" {...form.getInputProps('workingHours')} placeholder="e.g. 9am–5pm" styles={inputStyles} />
                  </SimpleGrid>
                </Stack>
              </>
            )}

            {role === 'system_admin' && (
              <>
                <Group gap="sm" mb="lg">
                  <IconShield size={18} color={GREEN} />
                  <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Admin Details</Title>
                </Group>
                <Stack gap="xs" mb="lg">
                  <InfoRow icon={IconShield}   label="Admin Level"  value={user?.adminLevel} />
                  <InfoRow icon={IconBriefcase} label="Access Scope" value={user?.accessScope} />
                  <InfoRow icon={IconCalendar} label="Joined"        value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                </Stack>
                <Divider color={BORDER} my="sm" />
                <Stack gap="sm" mt="sm">
                  <Select
                    label="Admin Level"
                    form="profile-form"
                    data={['Level 1', 'Level 2', 'Level 3', 'Super Admin']}
                    {...form.getInputProps('adminLevel')}
                    styles={inputStyles}
                    clearable
                  />
                  <TextInput label="Access Scope" form="profile-form" {...form.getInputProps('accessScope')} placeholder="e.g. All Wards" styles={inputStyles} />
                </Stack>
              </>
            )}
          </Card>
        </Stack>
      </SimpleGrid>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <Card p="lg" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group justify="space-between" align="center">
          <Box>
            <Text size="sm" fw={600} c="white">Save Profile Changes</Text>
            <Text size="xs" c="dimmed">Updates your name, contact info, and role-specific details.</Text>
          </Box>
          <Button
            type="submit"
            form="profile-form"
            color="civic"
            loading={loading}
            leftSection={<IconDeviceFloppy size={16} />}
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
          >
            Save Changes
          </Button>
        </Group>
      </Card>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group
          justify="space-between"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowPwChange(s => !s)}
        >
          <Group gap="sm">
            <IconKey size={18} color={GREEN} />
            <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Change Password</Title>
          </Group>
          <IconChevronDown size={16} color="#666"
            style={{ transform: showPwChange ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </Group>

        <Collapse in={showPwChange}>
          <Stack gap="sm" mt="lg">
            <Divider color={BORDER} />
            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              styles={inputStyles}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
              <Button color="civic" loading={pwLoading}
                disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
                onClick={handleChangePassword}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                Update Password
              </Button>
              <Button variant="subtle" color="gray"
                onClick={() => { setShowPwChange(false); setPwForm({ current: '', next: '', confirm: '' }); }}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Collapse>
      </Card>
    </Box>
  );
}
