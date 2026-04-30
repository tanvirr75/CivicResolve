import { useState } from 'react';
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
  Stepper,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconUser,
  IconMail,
  IconLock,
  IconAlertCircle,
  IconArrowRight,
  IconArrowLeft,
  IconShieldCheck,
  IconPhone,
  IconCalendar,
  IconDroplet,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthSplitScreen from '../layouts/AuthSplitScreen';

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
    '&:focus': { borderColor: GREEN, boxShadow: `0 0 0 2px ${GREEN_DIM}` },
  },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};

// ─── Password strength ────────────────────────────────────────────────────────
const STRENGTH_CHECKS = [
  { re: /.{8,}/,                     label: 'At least 8 characters' },
  { re: /[0-9]/,                     label: 'Contains a number' },
  { re: /[a-z]/,                     label: 'Contains lowercase letter' },
  { re: /[A-Z]/,                     label: 'Contains uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Contains special character' },
];

function getStrength(password) {
  if (!password) return 0;
  return Math.round((STRENGTH_CHECKS.filter(c => c.re.test(password)).length / STRENGTH_CHECKS.length) * 100);
}

function strengthColor(pct) {
  if (pct === 100) return 'teal';
  if (pct >= 60)   return 'yellow';
  return 'red';
}

// ─── RegisterPage ──────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate             = useNavigate();
  const { login }            = useAuth();
  const { t }                = useTranslation();
  const [step, setStep]      = useState(0);
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
        if (v.length < 8)     return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
        if (!/[0-9]/.test(v)) return 'Must contain a number';
        return null;
      },
      confirmPassword: (v, values) =>
        v === values.password ? null : 'Passwords do not match',
      terms: (v) => (v ? null : 'You must accept the terms to continue'),
    },
  });

  const strength = getStrength(form.values.password);
  const color    = strengthColor(strength);

  // ── Step 0 → Step 1 validation ─────────────────────────────────────────────
  const handleNext = () => {
    const step0Fields = ['name', 'email', 'password', 'confirmPassword', 'terms'];
    const hasErrors = step0Fields
      .map(f => form.validateField(f))
      .some(r => r.hasError);
    if (!hasErrors) {
      setError(null);
      setStep(1);
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await API.post('/auth/google', { credential });
      const { token, user } = res.data.data;
      login(token, user);
      notifications.show({ title: 'Account created ✓', message: 'Welcome to CivicResolve!', color: 'teal', autoClose: 5000 });
      navigate('/citizen/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        role:       'citizen',
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
      setStep(0); // bounce back to step 0 on server error
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitScreen>
      {/* Mobile logo */}
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
        maw={460}
        p="xl"
        radius="md"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <Stack gap="xs" mb="lg">
          <Title
            order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}
          >
            {t('Create account')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('Already registered?')}{' '}
            <Anchor component={Link} to="/login" c="civic.4" size="sm" underline="never">
              {t('Sign in →')}
            </Anchor>
          </Text>
        </Stack>

        {/* Stepper */}
        <Stepper
          active={step}
          size="xs"
          mb="lg"
          styles={{
            stepIcon:  { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#888' },
            separator: { background: BORDER },
          }}
        >
          <Stepper.Step label={t('Account')} description={t('Login credentials')} />
          <Stepper.Step label={t('Profile')}  description={t('Optional details')} />
        </Stepper>

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

        {/* Google sign-up (step 0 only) */}
        {step === 0 && (
          <>
            <Stack align="center" mb="md">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-up failed. Please try again.')}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width="320"
                text="signup_with"
              />
            </Stack>
            <Divider
              mb="md"
              color="rgba(255,255,255,0.06)"
              label={<Text size="xs" c="dimmed">Or register with email</Text>}
              labelPosition="center"
            />
          </>
        )}

        {/* Server error */}
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
          {/* ── Step 0: credentials ─────────────────────────────────────── */}
          {step === 0 && (
            <Stack gap="md">
              <TextInput
                label={t('Full name')}
                placeholder="Alex Rahman"
                autoComplete="name"
                leftSection={<IconUser size={16} color="#666" />}
                styles={inputStyles}
                {...form.getInputProps('name')}
              />

              <TextInput
                label={t('Email address')}
                placeholder="you@example.com"
                autoComplete="email"
                leftSection={<IconMail size={16} color="#666" />}
                styles={inputStyles}
                {...form.getInputProps('email')}
              />

              {/* Password + strength meter */}
              <Box>
                <PasswordInput
                  label="Password"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
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
                    >
                      {strength === 100
                        ? t('✓ Strong password')
                        : strength >= 60
                        ? t('Moderate — add uppercase or special characters')
                        : t('Weak — add numbers and uppercase letters')}
                    </Text>
                  </Box>
                )}
              </Box>

              <PasswordInput
                label={t('Confirm password')}
                placeholder="••••••••"
                autoComplete="new-password"
                leftSection={<IconLock size={16} color="#666" />}
                styles={inputStyles}
                {...form.getInputProps('confirmPassword')}
              />

              <Checkbox
                label={
                  <Text size="sm" c="dimmed">
                    I agree to the{' '}
                    <Anchor c="civic.4" size="sm" underline="never" href="#">Terms of Service</Anchor>
                    {' '}and{' '}
                    <Anchor c="civic.4" size="sm" underline="never" href="#">Privacy Policy</Anchor>
                  </Text>
                }
                color="civic"
                {...form.getInputProps('terms', { type: 'checkbox' })}
              />

              <Button
                fullWidth
                size="md"
                color="civic"
                radius="md"
                rightSection={<IconArrowRight size={16} />}
                onClick={handleNext}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  marginTop: 4,
                  boxShadow: `0 0 20px rgba(0,255,65,0.25)`,
                }}
              >
                {t('Continue')}
              </Button>
            </Stack>
          )}

          {/* ── Step 1: optional profile details ──────────────────────── */}
          {step === 1 && (
            <Stack gap="md">
              <Text size="xs" c="dimmed" mb={4}>
                These fields are optional — you can fill them in from your profile later.
              </Text>

              <TextInput
                label={t('Phone Number')}
                placeholder="+88017..."
                leftSection={<IconPhone size={16} color="#666" />}
                styles={inputStyles}
                {...form.getInputProps('phone')}
              />

              <Group grow>
                <TextInput
                  label={t('Date of Birth')}
                  type="date"
                  leftSection={<IconCalendar size={16} color="#666" />}
                  styles={inputStyles}
                  {...form.getInputProps('dob')}
                />
                <TextInput
                  label={t('Blood Group')}
                  placeholder="A+, O−, etc."
                  leftSection={<IconDroplet size={16} color="#666" />}
                  styles={inputStyles}
                  {...form.getInputProps('bloodGroup')}
                />
              </Group>

              <Group grow mt={4}>
                <Button
                  variant="subtle"
                  color="gray"
                  radius="md"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setStep(0)}
                >
                  {t('Back')}
                </Button>
                <Button
                  type="submit"
                  size="md"
                  color="civic"
                  radius="md"
                  loading={loading}
                  rightSection={!loading && <IconArrowRight size={16} />}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    boxShadow: `0 0 20px rgba(0,255,65,0.25)`,
                  }}
                >
                  {t('Create account')}
                </Button>
              </Group>

              <Text
                size="xs"
                c="dimmed"
                ta="center"
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => form.onSubmit(handleSubmit)()}
              >
                {t('Skip and create with just credentials →')}
              </Text>
            </Stack>
          )}
        </form>
      </Card>
    </AuthSplitScreen>
  );
}
