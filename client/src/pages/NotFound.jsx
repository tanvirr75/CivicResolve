import React, { useEffect, useRef } from 'react';
import { Box, Title, Text, Button, Stack, Group } from '@mantine/core';
import { IconArrowLeft, IconMapPin } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.25)';

// Animated floating pin
function FloatingPin() {
  return (
    <motion.div
      animate={{ y: [0, -18, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}
    >
      <Box
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: GREEN_DIM,
          border: `2px solid ${GREEN_BDR}`,
          boxShadow: `0 0 40px ${GREEN_DIM}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconMapPin size={36} color={GREEN} />
      </Box>
    </motion.div>
  );
}

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid background */}
      <Box
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* Glow orb */}
      <Box
        style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translateX(-50%)',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,255,65,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}
      >
        <FloatingPin />

        {/* 404 number */}
        <Text
          style={{
            fontSize: 'clamp(5rem, 14vw, 9rem)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            background: `linear-gradient(135deg, ${GREEN} 0%, rgba(0,255,65,0.35) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8,
            display: 'block',
          }}
        >
          404
        </Text>

        <Title
          order={2}
          mb="sm"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: '#fff',
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
          }}
        >
          Location not found
        </Title>

        <Text size="sm" c="dimmed" lh={1.7} mb={32} maw={380} mx="auto">
          This page doesn't exist or has been moved. The pin you dropped doesn't match
          any coordinates on our map.
        </Text>

        <Group justify="center" gap="md">
          <Button
            size="sm"
            radius="md"
            color="civic"
            leftSection={<IconArrowLeft size={15} />}
            onClick={() => navigate(-1)}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              boxShadow: `0 0 20px rgba(0,255,65,0.25)`,
            }}
          >
            Go back
          </Button>
          <Button
            component={Link}
            to="/"
            size="sm"
            radius="md"
            variant="outline"
            color="civic"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Return home
          </Button>
        </Group>

        {/* Brand mark */}
        <Text
          size="xs"
          c="dimmed"
          mt={48}
          style={{ fontFamily: "'Space Grotesk', sans-serif", opacity: 0.4 }}
        >
          <span style={{ color: GREEN }}>Civic</span>Resolve
        </Text>
      </motion.div>
    </Box>
  );
}
