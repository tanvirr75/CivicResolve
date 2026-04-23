import React, { useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Card,
  ThemeIcon,
  Badge,
  Anchor,
  Divider,
} from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useAnimation, useInView } from 'framer-motion';
import {
  IconRoad,
  IconDroplet,
  IconBulb,
  IconTrash,
  IconBrain,
  IconBell,
  IconMapPin,
  IconFlame,
  IconFileText,
  IconWifi,
  IconCircleCheck,
  IconArrowRight,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';

// ─── Design tokens (matches theme.js) ────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.15)';
const GREEN_BDR = 'rgba(0,255,65,0.25)';
const DARK_CARD = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';

// ─── Reusable scroll-reveal wrapper ──────────────────────────────────────────
function Reveal({ children, delay = 0, y = 30 }) {
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-80px' });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [inView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden:  { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating icon tile (used in hero) ───────────────────────────────────────
function FloatingIcon({ icon: Icon, color, delay, x, y, size = 44 }) {
  return (
    <motion.div
      style={{ position: 'absolute', left: x, top: y }}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 3.5 + delay * 0.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <ThemeIcon
        size={size}
        radius="md"
        style={{
          background: GREEN_DIM,
          border: `1px solid ${GREEN_BDR}`,
          color: GREEN,
          boxShadow: `0 0 20px ${GREEN_DIM}`,
        }}
      >
        <Icon size={size * 0.45} />
      </ThemeIcon>
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Badge
      variant="outline"
      color="civic"
      radius="sm"
      size="sm"
      style={{ letterSpacing: '0.10em', fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </Badge>
  );
}

// ─── Feature cards data ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: IconBrain,    title: 'AI Auto-Categorization',    desc: 'Gemini AI tags and routes every report by type and severity instantly.' },
  { icon: IconBell,     title: 'Real-Time Notifications',   desc: 'Socket.io pushes live status updates to citizens and ward officials.' },
  { icon: IconMapPin,   title: 'Geo-Tagged Reports',        desc: 'Every submission is pinned to an exact GPS coordinate on the live map.' },
  { icon: IconFlame,    title: 'Heatmap Visualization',     desc: 'Density overlays reveal civic hotspots across all 12 wards at a glance.' },
  { icon: IconFileText, title: 'Work Order PDF',            desc: 'One-click PDF dispatch to field workers — generated and stored instantly.' },
  { icon: IconWifi,     title: 'Offline Draft Mode',        desc: 'Cache reports locally; they auto-sync the moment connectivity returns.' },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Submit',          desc: 'Pin a location, describe the issue, upload evidence.' },
  { n: '02', title: 'AI Routes',       desc: 'Gemini categorises, scores severity, detects duplicates.' },
  { n: '03', title: 'Worker Assigned', desc: 'Ward official dispatches the closest field worker.' },
  { n: '04', title: 'Resolved',        desc: 'Worker uploads proof; citizen receives closure notification.' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box style={{ background: '#0d0d0d', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ════════════════════════════════════════════════════════════════════
          TOP NAV
      ════════════════════════════════════════════════════════════════════ */}
      <Box
        component="nav"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(13,13,13,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 24px',
          height: 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text
          fw={700}
          size="lg"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
        >
          <span style={{ color: GREEN }}>Civic</span>
          <span style={{ color: '#fff' }}>Resolve</span>
        </Text>

        <Group gap="xs" visibleFrom="sm">
          <Anchor component={Link} to="/dashboard" c="dimmed" size="sm" underline="never"
            style={{ transition: 'color .15s' }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = ''}
          >
            Map Dashboard
          </Anchor>
          <Anchor component={Link} to="/login" c="dimmed" size="sm" underline="never"
            style={{ transition: 'color .15s' }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = ''}
          >
            Login
          </Anchor>
          <Button
            component={Link} to="/register"
            size="xs" radius="md" color="civic"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get Started
          </Button>
        </Group>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <Box
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          paddingTop: 58,
        }}
      >
        {/* Isometric Smart City Background */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('/isometric-city.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />

        {/* Dark gradient overlay for text readability */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,13,13,0.8), rgba(13,13,13,0.95))',
            pointerEvents: 'none',
          }}
        />

        {/* Floating category icons (desktop-only decoration) */}
        <Box style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} visibleFrom="lg">
          <FloatingIcon icon={IconRoad}     delay={0}   x="8%"  y="25%" />
          <FloatingIcon icon={IconDroplet}  delay={0.7} x="12%" y="62%" />
          <FloatingIcon icon={IconBulb}     delay={1.2} x="82%" y="20%" />
          <FloatingIcon icon={IconTrash}    delay={0.4} x="78%" y="65%" />
          <FloatingIcon icon={IconMapPin}   delay={1.8} x="88%" y="42%" size={38} />
          <FloatingIcon icon={IconShieldCheck} delay={0.9} x="4%" y="44%" size={38} />
        </Box>

        <Container size="lg" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Stack align="center" gap="xl">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline" color="civic" radius="sm" size="sm"
                leftSection={<IconCircleCheck size={11} />}
                style={{ letterSpacing: '0.08em', marginBottom: 24 }}
              >
                AI-Powered Civic Platform · CSE470
              </Badge>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Title
                order={1}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(2.6rem, 6vw, 5rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  color: '#fff',
                  maxWidth: 800,
                }}
              >
                Report.{' '}
                <span style={{ color: GREEN, textShadow: `0 0 40px ${GREEN}55` }}>
                  Resolve.
                </span>{' '}
                Rebuild.
              </Title>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
            >
              <Text
                size="xl"
                c="dimmed"
                style={{ maxWidth: 540, lineHeight: 1.6, fontWeight: 400 }}
              >
                AI-powered civic issue reporting for smarter cities.
                Pin it. Report it. Watch it get fixed.
              </Text>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.34 }}
            >
              <Group justify="center" gap="md">
                <Button
                  component={Link}
                  to="/register"
                  size="lg"
                  radius="md"
                  color="civic"
                  rightSection={<IconArrowRight size={18} />}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    boxShadow: `0 0 24px rgba(0,255,65,0.35)`,
                    letterSpacing: '0.01em',
                  }}
                >
                  Report an Issue
                </Button>
                <Button
                  component={Link}
                  to="/dashboard"
                  size="lg"
                  radius="md"
                  variant="outline"
                  color="civic"
                  leftSection={<IconMapPin size={18} />}
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
                >
                  View Map
                </Button>
              </Group>
            </motion.div>

          </Stack>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <Container size="lg" py={48}>
          <Reveal>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
              {[
                { value: '2,400+', label: 'Issues Resolved',  icon: IconCircleCheck },
                { value: '12',    label: 'Wards Covered',     icon: IconMapPin },
                { value: '98%',   label: 'Response Rate',     icon: IconUsers },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    p="xl"
                    radius="md"
                    style={{
                      background: DARK_CARD,
                      border: `1px solid ${BORDER}`,
                      borderTop: `3px solid ${GREEN}`,
                      textAlign: 'center',
                    }}
                  >
                    <ThemeIcon
                      size={40} radius="md" mb="md" mx="auto"
                      style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}
                    >
                      <Icon size={20} />
                    </ThemeIcon>
                    <Title
                      order={2}
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: GREEN,
                        fontSize: '2.2rem',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {stat.value}
                    </Title>
                    <Text c="dimmed" size="sm" fw={500} mt={4}>{stat.label}</Text>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Reveal>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════════════════════════════════ */}
      <Container size="lg" py={96}>
        <Stack align="center" gap="xs" mb={56}>
          <Reveal>
            <SectionLabel>Platform Features</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <Title
              order={2}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#fff',
                textAlign: 'center',
                letterSpacing: '-0.025em',
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              }}
            >
              Everything a smart city needs
            </Title>
          </Reveal>
          <Reveal delay={0.15}>
            <Text c="dimmed" size="md" ta="center" maw={500} lh={1.7}>
              Six core modules — each mapped directly to a functional requirement in the SRS spec.
            </Text>
          </Reveal>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.07}>
                <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Card
                    p="xl"
                    radius="md"
                    h="100%"
                    style={{
                      background: DARK_CARD,
                      border: `1px solid ${BORDER}`,
                      cursor: 'default',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = GREEN_BDR;
                      e.currentTarget.style.boxShadow = `0 0 24px ${GREEN_DIM}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = BORDER;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <ThemeIcon
                      size={44} radius="md" mb="md"
                      style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}
                    >
                      <Icon size={22} />
                    </ThemeIcon>
                    <Group justify="space-between" align="flex-start" mb={8}>
                      <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                        {f.title}
                      </Title>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.65}>{f.desc}</Text>
                  </Card>
                </motion.div>
              </Reveal>
            );
          })}
        </SimpleGrid>
      </Container>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Stack align="center" gap="xs" mb={56}>
            <Reveal><SectionLabel>Process</SectionLabel></Reveal>
            <Reveal delay={0.1}>
              <Title
                order={2}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                }}
              >
                How CivicResolve works
              </Title>
            </Reveal>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <Card
                  p="xl"
                  radius="md"
                  style={{
                    background: DARK_CARD,
                    border: `1px solid ${BORDER}`,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {/* Connector line (all except last) */}
                  {i < STEPS.length - 1 && (
                    <Box
                      visibleFrom="lg"
                      style={{
                        position: 'absolute',
                        top: 36,
                        right: -32,
                        width: 32,
                        height: 1,
                        background: `linear-gradient(to right, ${GREEN_BDR}, transparent)`,
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Step number */}
                  <Box
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: GREEN_DIM,
                      border: `1.5px solid ${GREEN}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      boxShadow: `0 0 16px ${GREEN_DIM}`,
                    }}
                  >
                    <Text
                      fw={700}
                      size="sm"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: GREEN, letterSpacing: '-0.02em' }}
                    >
                      {step.n}
                    </Text>
                  </Box>

                  <Title order={5} mb={8} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                    {step.title}
                  </Title>
                  <Text size="sm" c="dimmed" lh={1.65}>{step.desc}</Text>
                </Card>
              </Reveal>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Reveal>
            <Card
              p={{ base: 'xl', md: 64 }}
              radius="md"
              style={{
                background: `
                  radial-gradient(ellipse at 60% 50%, rgba(0,255,65,0.08) 0%, transparent 65%),
                  ${DARK_CARD}
                `,
                border: `1px solid ${GREEN_BDR}`,
                textAlign: 'center',
              }}
            >
              <Title
                order={2}
                mb="md"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                }}
              >
                Ready to make your city better?
              </Title>
              <Text c="dimmed" mb={32} size="md" maw={480} mx="auto" lh={1.7}>
                Join thousands of citizens already using CivicResolve to report and track civic issues in real time.
              </Text>
              <Group justify="center" gap="md">
                <Button
                  component={Link}
                  to="/register"
                  size="lg"
                  radius="md"
                  color="civic"
                  rightSection={<IconArrowRight size={18} />}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    boxShadow: `0 0 28px rgba(0,255,65,0.3)`,
                  }}
                >
                  Create Free Account
                </Button>
                <Button
                  component={Link}
                  to="/dashboard"
                  size="lg"
                  radius="md"
                  variant="subtle"
                  color="civic"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Explore the Map →
                </Button>
              </Group>
            </Card>
          </Reveal>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={48}>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">

            {/* Brand */}
            <Stack gap={6} maw={280}>
              <Text
                fw={700}
                size="lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
              >
                <span style={{ color: GREEN }}>Civic</span>
                <span style={{ color: '#fff' }}>Resolve</span>
              </Text>
              <Text size="xs" c="dimmed" lh={1.7}>
                AI-powered civic issue reporting platform built for transparent, accountable local governance.
              </Text>
            </Stack>

            {/* Links */}
            <Group gap={48} align="flex-start" wrap="wrap">
              <Stack gap={10}>
                <Text size="xs" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Platform
                </Text>
                {[
                  { label: 'Map Dashboard', to: '/dashboard' },
                  { label: 'Submit Report',  to: '/report' },
                  { label: 'Register',       to: '/register' },
                  { label: 'Login',          to: '/login' },
                ].map(link => (
                  <Anchor
                    key={link.label}
                    component={Link}
                    to={link.to}
                    c="dimmed"
                    size="sm"
                    underline="never"
                    style={{ transition: 'color .15s' }}
                    onMouseEnter={e => e.target.style.color = GREEN}
                    onMouseLeave={e => e.target.style.color = ''}
                  >
                    {link.label}
                  </Anchor>
                ))}
              </Stack>

              <Stack gap={10}>
                <Text size="xs" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Project
                </Text>
                {['CSE470 — Software Engineering', 'BRAC University', 'Spring 2026'].map(t => (
                  <Text key={t} size="sm" c="dimmed">{t}</Text>
                ))}
              </Stack>
            </Group>
          </Group>

          <Divider my={32} color={BORDER} />

          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs" c="dimmed">
              © {new Date().getFullYear()} CivicResolve. All rights reserved.
            </Text>
            <Text size="xs" c="dimmed">
              Built with React · Mantine v7 · Node.js · MongoDB · Gemini AI
            </Text>
          </Group>
        </Container>
      </Box>

    </Box>
  );
}
