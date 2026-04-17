import React, { useState } from 'react';
import { Grid, Box, Title, Text, TextInput, PasswordInput, Button, Anchor, Flex } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail, IconLock } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import authImage from '../assets/login_bg.png';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email format'),
      password: (val) => (val.length >= 1 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/login', values);
      localStorage.setItem('token', res.data.data.token);
      
      notifications.show({ title: 'Authentication Verified', message: 'Logged in successfully.', color: 'green' });
      navigate('/dashboard'); // Route user directly to Map Hub
    } catch (err) {
      notifications.show({ title: 'Access Denied', message: err.response?.data?.message || 'Login failed due to invalid credentials.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid gutter={0} style={{ minHeight: '100vh' }}>
      
      {/* Interaction Framework */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Flex direction="column" justify="center" h="100%" p="xl" style={{ maxWidth: 450, margin: '0 auto' }}>
          <Text size="xl" fw={800} c="dark.9" component={Link} to="/" style={{ textDecoration: 'none' }}>📍 CivicResolve</Text>
          <Title order={1} mt="xl">Welcome Back</Title>
          <Text c="dimmed" mb="xl">Sign in directly to report and track issues.</Text>
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput label="Email Address" placeholder="you@example.com" leftSection={<IconMail size={16} />} {...form.getInputProps('email')} mb="md" />
            <PasswordInput label="Password" leftSection={<IconLock size={16} />} {...form.getInputProps('password')} mb="xl" />
            <Button fullWidth size="lg" color="orange" radius="xl" type="submit" loading={loading}>Sign In</Button>
          </form>

          <Text ta="center" mt="md">Don't have an account? <Anchor component={Link} to="/register" c="orange">Register</Anchor></Text>
        </Flex>
      </Grid.Col>

      {/* Visual Component Framework */}
      <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
        <Box h="100%" w="100%" style={{ backgroundImage: `url(${authImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#fff4e6' }} />
      </Grid.Col>

    </Grid>
  );
}
