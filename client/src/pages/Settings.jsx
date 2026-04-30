import { useState, useEffect } from 'react';
import {
  Box, Card, Title, Text, Group, Stack, Switch, Badge,
  Divider, ThemeIcon, Select, Skeleton, Alert,
} from '@mantine/core';
import {
  IconSettings, IconBell, IconLock, IconGlobe, IconUser,
  IconShield, IconBriefcase, IconTruck, IconBuildingSkyscraper,
  IconInfoCircle, IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

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

// ─── Section wrapper ──────────────────────────────────────────────────────────
function SettingsSection({ icon: Icon, title, accent = GREEN, children }) {
  return (
    <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <Group gap="sm" mb="lg">
        <ThemeIcon size={34} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: accent }}>
          <Icon size={17} />
        </ThemeIcon>
        <Title order={5} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</Title>
      </Group>
      <Stack gap="md">
        {children}
      </Stack>
    </Card>
  );
}

// ─── Individual setting row ───────────────────────────────────────────────────
function SettingRow({ label, description, settingKey, value, onChange, disabled = false }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap"
      style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
      <Box style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <Text size="sm" c="white" fw={500}>{label}</Text>
        {description && <Text size="xs" c="dimmed" mt={2} lh={1.5}>{description}</Text>}
      </Box>
      <Switch
        checked={!!value}
        onChange={e => onChange(settingKey, e.currentTarget.checked)}
        disabled={disabled}
        color="civic"
        size="sm"
        styles={{ track: { cursor: 'pointer' } }}
      />
    </Group>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, setUser } = useAuth();
  const { i18n }          = useTranslation();
  const role              = user?.role ?? 'citizen';

  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    API.get('/auth/settings')
      .then(res => setSettings(res.data.data.settings ?? {}))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const saveSetting = async (key, value) => {
    const prev = settings[key];
    setSettings(s => ({ ...s, [key]: value }));
    try {
      await API.put('/auth/settings', { [key]: value });
      notifications.show({
        message: 'Setting saved.',
        color: 'teal',
        icon: <IconCheck size={14} />,
        autoClose: 1800,
      });
    } catch {
      setSettings(s => ({ ...s, [key]: prev }));
      notifications.show({ title: 'Failed', message: 'Could not save setting.', color: 'red' });
    }
  };

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    try {
      await API.put('/auth/profile', { language: lang });
      setUser(u => ({ ...u, language: lang }));
    } catch {
      // language change in UI already happened; non-critical
    }
  };

  if (loading) {
    return (
      <Box maw={720} mx="auto" p="md">
        <Stack gap="lg">
          {[1,2,3,4].map(i => <Skeleton key={i} height={180} radius="md" />)}
        </Stack>
      </Box>
    );
  }

  return (
    <Box maw={720} mx="auto" p="md" pb={80}>

      {/* Header */}
      <Group gap="sm" mb="xl" align="center">
        <ThemeIcon size={44} radius="md" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}>
          <IconSettings size={22} />
        </ThemeIcon>
        <Box>
          <Title order={2} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            Settings
          </Title>
          <Group gap="xs" mt={2}>
            <Text size="sm" c="dimmed">Preferences for your account</Text>
            <Badge color={ROLE_COLOR[role]} variant="light" size="xs">{ROLE_LABEL[role]}</Badge>
          </Group>
        </Box>
      </Group>

      <Stack gap="lg">

        {/* ── General ──────────────────────────────────────────────────────── */}
        <SettingsSection icon={IconGlobe} title="General">
          <Box style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <Text size="sm" c="white" fw={500} mb={6}>Language</Text>
            <Text size="xs" c="dimmed" mb={10}>Choose the interface language. Your preference is saved to your account.</Text>
            <Select
              value={i18n.language || 'en'}
              onChange={handleLanguageChange}
              data={[
                { value: 'en', label: 'English' },
                { value: 'bn', label: 'বাংলা (Bengali)' },
              ]}
              w={200}
              size="sm"
              styles={{
                input: { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#e5e5e5' },
              }}
            />
          </Box>
        </SettingsSection>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <SettingsSection icon={IconBell} title="Notifications" accent="#3b82f6">
          <SettingRow
            label="Email Notifications"
            description="Receive activity summaries and important alerts by email."
            settingKey="emailNotifications"
            value={settings?.emailNotifications ?? true}
            onChange={saveSetting}
          />
          <SettingRow
            label="Push Notifications"
            description="Allow in-app real-time notifications (via Socket.IO)."
            settingKey="pushNotifications"
            value={settings?.pushNotifications ?? true}
            onChange={saveSetting}
          />
          {role === 'citizen' && (
            <SettingRow
              label="Notify me on report status changes"
              description="Get a notification when your submitted reports are updated."
              settingKey="notifyStatusChange"
              value={settings?.notifyStatusChange ?? true}
              onChange={saveSetting}
            />
          )}
          {role === 'ward_official' && (
            <SettingRow
              label="Email me on new ward report"
              description="Receive an email when a new report is submitted to your ward."
              settingKey="emailNewReport"
              value={settings?.emailNewReport ?? true}
              onChange={saveSetting}
            />
          )}
          {role === 'field_worker' && (
            <SettingRow
              label="Notify me on new work order"
              description="Get an in-app alert when a new work order is assigned to you."
              settingKey="notifyWorkOrder"
              value={settings?.notifyWorkOrder ?? true}
              onChange={saveSetting}
            />
          )}
          {role === 'system_admin' && (
            <SettingRow
              label="Weekly analytics digest"
              description="Receive a weekly summary report of platform activity by email."
              settingKey="weeklyDigest"
              value={settings?.weeklyDigest ?? true}
              onChange={saveSetting}
            />
          )}
        </SettingsSection>

        {/* ── Privacy ──────────────────────────────────────────────────────── */}
        <SettingsSection icon={IconLock} title="Privacy" accent="#a855f7">
          <SettingRow
            label="Public profile"
            description="Allow other platform users to see your name and role when viewing reports."
            settingKey="profilePublic"
            value={settings?.profilePublic ?? true}
            onChange={saveSetting}
          />
          {role === 'citizen' && (
            <SettingRow
              label="Default anonymous submissions"
              description="New reports will be submitted anonymously unless you change it per report."
              settingKey="defaultAnonymous"
              value={settings?.defaultAnonymous ?? false}
              onChange={saveSetting}
            />
          )}
        </SettingsSection>

        {/* ── Role-specific ────────────────────────────────────────────────── */}
        {role === 'ward_official' && (
          <SettingsSection icon={IconBuildingSkyscraper} title="Ward Official Preferences" accent="#3b82f6">
            <SettingRow
              label="AI morning briefing"
              description="Show an AI-generated summary of pending issues at the top of your dashboard each day."
              settingKey="aiDailyBriefing"
              value={settings?.aiDailyBriefing ?? true}
              onChange={saveSetting}
            />
            <Alert
              icon={<IconInfoCircle size={14} />}
              color="blue" variant="light" radius="md"
              styles={{ root: { background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' } }}
            >
              <Text size="xs" c="blue.3">
                The AI briefing is cached once per day per ward. Disabling it hides it from your dashboard but does not stop generation.
              </Text>
            </Alert>
          </SettingsSection>
        )}

        {role === 'field_worker' && (
          <SettingsSection icon={IconTruck} title="Field Worker Preferences" accent="#f59e0b">
            <SettingRow
              label="Available for assignment"
              description="Mark yourself as available to receive new work orders. Turn off when on leave."
              settingKey="availableForWork"
              value={settings?.availableForWork ?? true}
              onChange={saveSetting}
            />
          </SettingsSection>
        )}

        {role === 'system_admin' && (
          <SettingsSection icon={IconShield} title="Admin Preferences" accent="#ef4444">
            <SettingRow
              label="Auto spam flagging"
              description="Automatically flag and hide reports detected as spam without manual review."
              settingKey="autoSpamFlagging"
              value={settings?.autoSpamFlagging ?? true}
              onChange={saveSetting}
            />
          </SettingsSection>
        )}

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <SettingsSection icon={IconUser} title="Account" accent="#6b7280">
          <Box style={{ padding: '8px 0' }}>
            <Group gap="xl" wrap="wrap">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>Account ID</Text>
                <Text size="sm" c="white" fw={500} style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {user?._id}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>Role</Text>
                <Badge color={ROLE_COLOR[role]} variant="light" size="sm" mt={4}>{ROLE_LABEL[role]}</Badge>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>Status</Text>
                <Badge color="teal" variant="light" size="sm" mt={4}>Active</Badge>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>Member Since</Text>
                <Text size="sm" c="white" fw={500}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}
                </Text>
              </Box>
            </Group>
          </Box>
          <Divider color={BORDER} />
          <Box style={{ padding: '8px 0' }}>
            <Text size="sm" c="white" fw={500} mb={4}>Account Deactivation</Text>
            <Text size="xs" c="dimmed" lh={1.6}>
              To deactivate your account, contact a system administrator. Deactivation removes your access but preserves your submitted reports for civic record purposes.
            </Text>
          </Box>
        </SettingsSection>

      </Stack>
    </Box>
  );
}
