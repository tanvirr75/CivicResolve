import React, { useState } from 'react';
import {
  Box,
  Card,
  Center,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Alert,
  Stack,
  Divider,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconMail,
  IconLock,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Role → route map ────────────────────────────────────────────────────────
const ROLE_REDIRECT = {
  citizen:      '/citizen/dashboard',
  ward_official:'/ward/dashboard',
  field_worker: '/field/dashboard',
  system_admin: '/admin/dashboard',
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.30)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.08)';

import AuthSplitScreen from '../layouts/AuthSplitScreen';

// ─── Focus-glow style helper (injected per input via sx-equivalent) ───────────
// Mantine v7 doesn't have sx on TextInput — we use the `styles` prop pattern
const inputStyles = {
  input: {
    background:  'rgba(255,255,255,0.04)',
    border:      `1px solid ${BORDER}`,
    color:       '#e5e5e5',
    fontFamily:  "'Inter', sans-serif",
    transition:  'border-color 0.18s, box-shadow 0.18s',
    '&:focus': {
      borderColor: GREEN,
      boxShadow:   `0 0 0 2px ${GREEN_DIM}`,
    },
    '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active': {
      WebkitBoxShadow: '0 0 0 30px #0d0d0d inset !important',
      WebkitTextFillColor: '#e5e5e5 !important',
      transition: 'background-color 5000s ease-in-out 0s',
    },
  },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

// ─── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate     = useNavigate();
  const { login }    = useAuth();
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email:    (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Enter a valid email address'),
      password: (v) => (v.length >= 1                   ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res  = await API.post('/auth/login', {
        email:    values.email.trim().toLowerCase(),
        password: values.password,
      });

      const { token, user } = res.data.data;

      // Persist JWT via AuthContext (triggers server hydration)
      login(token, user);

      notifications.show({
        title:   'Welcome back 👋',
        message: `Signed in as ${user.name}.`,
        color:   'civic',
      });

      // Role-based redirect
      const dest = ROLE_REDIRECT[user.role] ?? '/dashboard';
      navigate(dest, { replace: true });

    } catch (err) {
      const msg = err.response?.data?.message ?? 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitScreen>
      {/* Mobile Logo (hidden on desktop) */}
      <Text
        component={Link}
        to="/"
        fw={700}
        size="xl"
        mb="xl"
        hiddenFrom="md"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          textDecoration: 'none',
          letterSpacing: '-0.02em',
          display: 'block',
          textAlign: 'center',
        }}
      >
        <span style={{ color: GREEN }}>Civic</span>
        <span style={{ color: '#fff' }}>Resolve</span>
      </Text>

      <Card
        p="xl"
        radius="md"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
      <Stack gap="xs" mb="xl">
        <Title
          order={2}
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}
        >
          Sign in
        </Title>
        <Text size="sm" c="dimmed">
          Don't have an account?{' '}
          <Anchor component={Link} to="/register" c="civic.4" size="sm" underline="never">
            Create one →
          </Anchor>
        </Text>
      </Stack>

      {/* Error alert */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          radius="md"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
          style={{ border: '1px solid rgba(255,80,80,0.25)' }}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Email address"
            placeholder="you@example.com"
            autoComplete="off"
            leftSection={<IconMail size={16} color="#666" />}
            styles={inputStyles}
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            autoComplete="new-password"
            leftSection={<IconLock size={16} color="#666" />}
            styles={inputStyles}
            {...form.getInputProps('password')}
          />

          <Button
            type="submit"
            fullWidth
            size="md"
            color="civic"
            radius="md"
            loading={loading}
            rightSection={!loading && <IconArrowRight size={16} />}
            style={{
              fontFamily:  "'Space Grotesk', sans-serif",
              fontWeight:  700,
              marginTop:   4,
              boxShadow:   `0 0 20px rgba(0,255,65,0.25)`,
              letterSpacing: '0.01em',
            }}
          >
            Sign in
          </Button>
        </Stack>
      </form>

      <Divider
        my="xl"
        color="rgba(255,255,255,0.06)"
        label={<Text size="xs" c="dimmed">Or continue as</Text>}
        labelPosition="center"
      />

      <Group justify="center">
        <Anchor
          component={Link}
          to="/register"
          size="sm"
          c="dimmed"
          underline="never"
          style={{ transition: 'color .15s' }}
          onMouseEnter={e => e.target.style.color = GREEN}
          onMouseLeave={e => e.target.style.color = ''}
        >
          Create an account to submit reports →
        </Anchor>
      </Group>
      </Card>
    </AuthSplitScreen>
  );
}
