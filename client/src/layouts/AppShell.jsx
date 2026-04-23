import React, { useState } from 'react';
import {
  AppShell,
  Group,
  Text,
  NavLink,
  Avatar,
  ActionIcon,
  Burger,
  ScrollArea,
  Divider,
  Tooltip,
  Box,
  Stack,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconFileReport,
  IconMap,
  IconBell,
  IconUsers,
  IconChartBar,
  IconClipboardList,
  IconLogout,
  IconSettings,
  IconBriefcase,
  IconNotes,
  IconUserEdit,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useAuth } from '../context/AuthContext';
import NotificationsMenu from '../components/NotificationsMenu';
import { destroySocket } from '../services/socket';


// ─── Role-based nav configuration ────────────────────────────────────────────
const NAV_CONFIG = {
  citizen: [
    { label: 'Dashboard',      icon: IconLayoutDashboard, to: '/citizen/dashboard' },
    { label: 'Submit Report',  icon: IconFileReport,      to: '/citizen/submit' },
    { label: 'Live Map',       icon: IconMap,             to: '/map' },
    { label: 'Notifications',  icon: IconBell,            to: '/notifications' },
    { label: 'My Drafts',      icon: IconNotes,           to: '/citizen/drafts' },
    { label: 'My Profile',     icon: IconUserEdit,        to: '/profile' },
  ],
  ward_official: [
    { label: 'Dashboard',      icon: IconLayoutDashboard, to: '/ward/dashboard' },
    { label: 'Reports',        icon: IconFileReport,      to: '/ward/reports' },
    { label: 'Assign Workers', icon: IconClipboardList,   to: '/ward/reports' },
    { label: 'Live Map',       icon: IconMap,             to: '/map' },
    { label: 'Notifications',  icon: IconBell,            to: '/notifications' },
    { label: 'My Profile',     icon: IconUserEdit,        to: '/profile' },
  ],
  field_worker: [
    { label: 'Dashboard',      icon: IconLayoutDashboard, to: '/field/dashboard' },
    { label: 'Work Orders',    icon: IconBriefcase,       to: '/field/dashboard' },
    { label: 'Live Map',       icon: IconMap,             to: '/map' },
    { label: 'Notifications',  icon: IconBell,            to: '/notifications' },
    { label: 'My Profile',     icon: IconUserEdit,        to: '/profile' },
  ],
  system_admin: [
    { label: 'Dashboard',      icon: IconLayoutDashboard, to: '/admin/dashboard' },
    { label: 'Users',          icon: IconUsers,           to: '/admin/users' },
    { label: 'Reports',        icon: IconFileReport,      to: '/admin/reports' },
    { label: 'Analytics',      icon: IconChartBar,        to: '/admin/analytics' },
    { label: 'My Profile',     icon: IconUserEdit,        to: '/profile' },
  ],
};


// ─── Role badge colors ────────────────────────────────────────────────────────
const ROLE_COLOR = {
  citizen:      'civic',
  ward_official:'blue',
  field_worker: 'yellow',
  system_admin: 'red',
};

const ROLE_LABEL = {
  citizen:      'Citizen',
  ward_official:'Ward Official',
  field_worker: 'Field Worker',
  system_admin: 'System Admin',
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
function SidebarNavItems({ links, onClose }) {
  const location = useLocation();

  return (
    <Stack gap={2}>
      {links.map((item) => {
        const Icon    = item.icon;
        const active  = location.pathname === item.to;
        return (
          <NavLink
            key={item.label}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<Icon size={18} stroke={1.8} />}
            onClick={onClose}
            active={active}
            variant="subtle"
            style={(theme) => ({
              borderLeft: active
                ? `3px solid ${theme.colors.civic[5]}`
                : '3px solid transparent',
              borderRadius: 0,
              paddingLeft: active ? 'calc(var(--mantine-spacing-sm) - 3px)' : 'var(--mantine-spacing-sm)',
              color: active ? theme.colors.civic[4] : undefined,
              fontWeight: active ? 600 : 400,
            })}
          />
        );
      })}
    </Stack>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function CivicAppShell({ children }) {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role  = user?.role ?? 'citizen';
  const links = NAV_CONFIG[role] ?? NAV_CONFIG.citizen;

  const { i18n } = useTranslation();

  const handleLogout = () => {
    destroySocket();
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 58 }}
      navbar={{
        width: 230,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        root:   { background: '#0d0d0d' },
        main:   { background: '#111111', minHeight: '100vh' },
        header: {
          background: 'rgba(13,13,13,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        },
        navbar: {
          background: '#0d0d0d',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        },
      }}
    >
      {/* ── Top Navbar ───────────────────────────────────────────────────── */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" align="center">

          {/* Left: burger + logo */}
          <Group gap="sm" align="center">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="var(--mantine-color-civic-5)"
            />
            <Text
              component={Link}
              to="/"
              fw={700}
              size="lg"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textDecoration: 'none',
                letterSpacing: '-0.02em',
                color: 'var(--mantine-color-civic-5)',
              }}
            >
              Civic<span style={{ color: '#fff' }}>Resolve</span>
            </Text>
          </Group>

          {/* Navigation links have been moved exclusively to the sidebar to prevent duplication */}

          {/* Right: language toggle + notifications + avatar */}
          <Group gap="xs" align="center">
            <Tooltip label="Switch language / ভাষা পরিবর্তন" position="bottom" withArrow>
              <SegmentedControl
                size="xs"
                radius="xl"
                value={i18n.language === 'bn' ? 'bn' : 'en'}
                onChange={(lang) => {
                  i18n.changeLanguage(lang);
                  localStorage.setItem('civicresolve_lang', lang);
                }}
                data={[
                  { label: 'EN',   value: 'en' },
                  { label: 'বাং', value: 'bn' },
                ]}
                styles={{
                  root:      { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' },
                  label:     { color: '#aaa', fontSize: '0.75rem', fontWeight: 600 },
                  indicator: { background: 'rgba(0,255,65,0.15)', borderRadius: 20 },
                }}
              />
            </Tooltip>
            <NotificationsMenu />
            {user && (
              <Avatar size={32} radius="xl" color="civic" style={{ cursor: 'pointer' }}>
                {user.name?.charAt(0).toUpperCase() ?? 'U'}
              </Avatar>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <AppShell.Navbar p={0}>
        <ScrollArea style={{ flex: 1 }} py="sm">

          {/* User info block */}
          {user && (
            <Box px="md" py="sm">
              <Group gap="xs" wrap="nowrap">
                <Avatar size={36} radius="xl" color="civic">
                  {user.name?.charAt(0).toUpperCase() ?? 'U'}
                </Avatar>
                <Box style={{ overflow: 'hidden' }}>
                  <Text size="sm" fw={600} truncate>
                    {user.name ?? 'Unknown'}
                  </Text>
                  <Badge
                    size="xs"
                    color={ROLE_COLOR[role] ?? 'gray'}
                    variant="light"
                    radius="sm"
                  >
                    {ROLE_LABEL[role] ?? role}
                  </Badge>
                </Box>
              </Group>
            </Box>
          )}

          <Divider
            my="xs"
            color="rgba(255,255,255,0.06)"
            label={
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em' }}>
                Navigation
              </Text>
            }
            labelPosition="left"
            px="md"
          />

          {/* Role-based nav links */}
          <Box px="xs">
            <SidebarNavItems links={links} onClose={close} />
          </Box>
        </ScrollArea>

        {/* Bottom: settings + logout */}
        <Box px="xs" py="sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Stack gap={2}>
            <NavLink
              label="Settings"
              leftSection={<IconSettings size={18} stroke={1.8} />}
              variant="subtle"
              style={{ borderRadius: '6px' }}
            />
            <NavLink
              label="Logout"
              leftSection={<IconLogout size={18} stroke={1.8} />}
              onClick={handleLogout}
              variant="subtle"
              color="red"
              style={{ borderRadius: '6px' }}
            />
          </Stack>
        </Box>
      </AppShell.Navbar>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
