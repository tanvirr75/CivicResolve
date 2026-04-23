import React, { useState } from 'react';
import {
  Box,
  Card,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Alert,
  Stack,
  Progress,
  Group,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconUser,
  IconMail,
  IconLock,
  IconAlertCircle,
  IconArrowRight,
  IconShieldCheck,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthSplitScreen from '../layouts/AuthSplitScreen';

// ─── Design tokens (match LoginPage) ─────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.30)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.08)';

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

// ─── Password strength meter ──────────────────────────────────────────────────
const STRENGTH_CHECKS = [
  { re: /.{8,}/,                     label: 'At least 8 characters' },
  { re: /[0-9]/,                     label: 'Contains a number' },
  { re: /[a-z]/,                     label: 'Contains lowercase letter' },
  { re: /[A-Z]/,                     label: 'Contains uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Contains special character' },
];

function getStrength(password) {
  if (!password) return 0;
  const passed = STRENGTH_CHECKS.filter(c => c.re.test(password)).length;
  return Math.round((passed / STRENGTH_CHECKS.length) * 100);
}

function strengthColor(pct) {
  if (pct === 100) return 'teal';
  if (pct >= 60)   return 'yellow';
  return 'red';
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate             = useNavigate();
  const { login }            = useAuth();
  const [error, setError]    = useState(null);
  const [loading, setLoading]= useState(false);

  const form = useForm({
    initialValues: {
      name:            '',
      email:           '',
      phone:           '',
      dob:             '',
      bloodGroup:      '',
      password:        '',
      confirmPassword: '',
      terms:           false,
    },
    validate: {
      name:  (v) => (v.trim().length >= 2 ? null : 'Full name must be at least 2 characters'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Enter a valid email address'),
      password: (v) => {
        if (v.length < 8)            return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(v))        return 'Must contain an uppercase letter';
        if (!/[0-9]/.test(v))        return 'Must contain a number';
        return null;
      },
      confirmPassword: (v, values) =>
        v === values.password ? null : 'Passwords do not match',
      terms: (v) => (v ? null : 'You must accept the terms to continue'),
    },
  });

  const strength = getStrength(form.values.password);
  const color    = strengthColor(strength);

  const handleSubmit = async (values) => {
    setError(null);
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        name:       values.name.trim(),
        email:      values.email.trim().toLowerCase(),
        phone:      values.phone.trim(),
        dob:        values.dob,
        bloodGroup: values.bloodGroup.trim(),
        password:   values.password,
        role:       'citizen',   // Only citizens can self-register; other roles are admin-created
      });

      const { token, user } = res.data.data;
      login(token, user);

      notifications.show({
        title:   'Account created ✓',
        message: 'Welcome to CivicResolve!',
        color:   'teal',
        autoClose: 5000,
      });

      navigate('/citizen/dashboard', { replace: true });

    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed. Please try again.';
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
        w="100%"
        maw={440}
        p="xl"
        radius="md"
        style={{
          background: CARD_BG,
          border:     `1px solid ${BORDER}`,
          boxShadow:  '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <Stack gap="xs" mb="xl">
          <Title
            order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}
          >
            Create account
          </Title>
          <Text size="sm" c="dimmed">
            Already registered?{' '}
            <Anchor component={Link} to="/login" c="civic.4" size="sm" underline="never">
              Sign in →
            </Anchor>
          </Text>
        </Stack>

        {/* Citizen-only note */}
        <Alert
          icon={<IconShieldCheck size={15} />}
          color="civic"
          variant="light"
          radius="md"
          mb="lg"
          style={{ border: `1px solid ${GREEN_BDR}`, background: GREEN_DIM }}
        >
          <Text size="xs" c="civic.3">
            Public registration is for <strong>citizens</strong> only.
            Ward officials, field workers and admins are created by a system administrator.
          </Text>
        </Alert>

        {/* Error */}
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
            {/* Name */}
            <TextInput
              label="Full name"
              placeholder="Alex Rahman"
              autoComplete="name"
              leftSection={<IconUser size={16} color="#666" />}
              styles={inputStyles}
              {...form.getInputProps('name')}
            />

            {/* Email */}
            <TextInput
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              leftSection={<IconMail size={16} color="#666" />}
              styles={inputStyles}
              {...form.getInputProps('email')}
            />

            <Group grow>
              <TextInput
                label="Phone Number"
                placeholder="+88017..."
                styles={inputStyles}
                {...form.getInputProps('phone')}
              />
              <TextInput
                label="Date of Birth"
                type="date"
                styles={inputStyles}
                {...form.getInputProps('dob')}
              />
            </Group>

            <TextInput
              label="Blood Group"
              placeholder="A+, O-, etc"
              styles={inputStyles}
              {...form.getInputProps('bloodGroup')}
            />

            {/* Password + strength meter */}
            <Box>
              <PasswordInput
                label="Password"
                placeholder="Min. 8 characters, 1 uppercase, 1 number"
                autoComplete="new-password"
                leftSection={<IconLock size={16} color="#666" />}
                styles={inputStyles}
                {...form.getInputProps('password')}
              />
              {form.values.password.length > 0 && (
                <Box mt={8}>
                  <Progress
                    value={strength}
                    color={color}
                    size={4}
                    radius="xl"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                  <Text
                    size="xs"
                    mt={4}
                    c={strength === 100 ? 'teal' : strength >= 60 ? 'yellow' : 'red'}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {strength === 100
                      ? '✓ Strong password'
                      : strength >= 60
                      ? 'Moderate — add uppercase or special characters'
                      : 'Weak — add numbers and uppercase letters'}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Confirm password */}
            <PasswordInput
              label="Confirm password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              leftSection={<IconLock size={16} color="#666" />}
              styles={inputStyles}
              {...form.getInputProps('confirmPassword')}
            />

            {/* Terms */}
            <Checkbox
              label={
                <Text size="sm" c="dimmed">
                  I agree to the{' '}
                  <Anchor c="civic.4" size="sm" underline="never" href="#">
                    Terms of Service
                  </Anchor>{' '}
                  and{' '}
                  <Anchor c="civic.4" size="sm" underline="never" href="#">
                    Privacy Policy
                  </Anchor>
                </Text>
              }
              color="civic"
              {...form.getInputProps('terms', { type: 'checkbox' })}
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
                fontFamily:    "'Space Grotesk', sans-serif",
                fontWeight:    700,
                marginTop:     4,
                boxShadow:     `0 0 20px rgba(0,255,65,0.25)`,
                letterSpacing: '0.01em',
              }}
            >
              Create account
            </Button>
          </Stack>
        </form>
      </Card>
    </AuthSplitScreen>
  );
}
