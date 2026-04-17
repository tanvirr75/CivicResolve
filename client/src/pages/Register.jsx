import React, { useState } from 'react';
import { Grid, Box, Title, Text, TextInput, PasswordInput, Button, Anchor, Flex, Select, Checkbox, Progress, Collapse, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUser, IconMail, IconLock, IconInfoCircle } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import authImage from '../assets/auth_illustration.png';

// Password Strength Mathematical Thresholds
const strengthChecks = [
  { re: /.{8,}/, label: 'Includes at least 8 characters' },
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '', role: '', language: 'English', terms: false, employeeId: '' },
    validate: {
      name: (val) => (val.trim() ? null : 'Name is required'),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length >= 8 ? null : 'Password too short'),
      confirmPassword: (val, values) => (val === values.password ? null : 'Passwords do not match'),
      role: (val) => (val ? null : 'Role is required'),
      terms: (val) => (val ? null : 'Must agree to terms'),
    },
  });

  const getStrength = (password) => {
    let multiplier = password.length > 5 ? 0 : 1;
    let matches = 0;
    strengthChecks.forEach((check) => { if (check.re.test(password)) matches += 1; });
    return Math.max(10, (100 / strengthChecks.length) * matches - multiplier * 10);
  };

  const strength = getStrength(form.values.password);
  const strengthColor = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';
  
  // Collapse Controller Boolean Check
  const showApprovalAlert = form.values.role === 'Ward Official' || form.values.role === 'Field Worker';

  const handleSubmit = async (values) => {
    setLoading(true);
    let payloadRole = 'citizen';
    if (values.role === 'Ward Official') payloadRole = 'ward_official';
    if (values.role === 'Field Worker') payloadRole = 'field_worker';

    const payload = {
      name: values.name, 
      email: values.email, 
      password: values.password, 
      role: payloadRole,
      language: values.language === 'English' ? 'en' : 'bn'
    };

    // Attach dynamic ID constraints targeting the strict backend validation criteria
    if (payloadRole === 'ward_official') payload.wardId = values.employeeId;
    if (payloadRole === 'field_worker') payload.employeeId = values.employeeId;

    try {
      await API.post('/auth/register', payload);
      notifications.show({ title: 'Welcome to CivicResolve!', message: 'Account created! Please sign in below.', color: 'green' });
      navigate('/login');
    } catch (err) {
      notifications.show({ title: 'Registration Blocked', message: err.response?.data?.message || 'Registration pipeline failed dynamically.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid gutter={0} style={{ minHeight: '100vh' }}>
      
      {/* Forms Framework Zone */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Flex direction="column" justify="center" h="100%" p="xl" style={{ maxWidth: 500, margin: '0 auto' }}>
          <Text size="xl" fw={800} c="dark.9" component={Link} to="/" style={{ textDecoration: 'none' }}>📍 CivicResolve</Text>
          <Title order={1} mt="xl">Join CivicResolve</Title>
          <Text c="dimmed" mb="xl">Create your account and start making your city better.</Text>
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput label="Full Name" placeholder="Your full name" leftSection={<IconUser size={16} />} {...form.getInputProps('name')} mb="sm" />
            <TextInput label="Email Address" placeholder="you@example.com" leftSection={<IconMail size={16} />} {...form.getInputProps('email')} mb="sm" />
            
            <PasswordInput label="Password" leftSection={<IconLock size={16} />} {...form.getInputProps('password')} mb="xs" />
            <Progress value={strength} color={strengthColor} size="sm" mb="sm" />

            <PasswordInput label="Confirm Password" leftSection={<IconLock size={16} />} {...form.getInputProps('confirmPassword')} mb="sm" />
            
            <Select label="Register As" placeholder="Select your role" data={['Citizen', 'Field Worker', 'Ward Official']} {...form.getInputProps('role')} mb="sm" />
            
            {/* Dynamic Mantine Dropdown Mechanics */}
            <Collapse in={showApprovalAlert}>
              <Alert icon={<IconInfoCircle size={16} />} color="blue" mb="sm">
                Your account will require admin approval before activation.
              </Alert>
              <TextInput label="Employee or Ward ID" placeholder="Enter your ID credential" {...form.getInputProps('employeeId')} mb="sm" />
            </Collapse>

            <Select label="Preferred Language" data={['English', 'বাংলা']} {...form.getInputProps('language')} mb="md" />

            <Checkbox label={<>I agree to the <Anchor color="orange">Terms of Service</Anchor> and <Anchor color="orange">Privacy Policy</Anchor></>} {...form.getInputProps('terms', { type: 'checkbox' })} mb="xl" />

            <Button fullWidth size="lg" color="orange" radius="xl" type="submit" loading={loading}>Create Account</Button>
          </form>

          <Text ta="center" mt="md" pb="xl">Already have an account? <Anchor component={Link} to="/login" c="orange">Sign in</Anchor></Text>
        </Flex>
      </Grid.Col>

      {/* Visual Generative Illustration Rendering Zone */}
      <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
        {/* Cover mechanics explicitly set to contain dimensions dynamically */}
        <Box h="100%" w="100%" style={{ backgroundImage: `url(${authImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#fff4e6' }} />
      </Grid.Col>
    </Grid>
  );
}
