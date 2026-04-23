import React, { useState, useEffect } from 'react';
import {
  Box, Card, Title, Text, TextInput, Button, Group, Stack,
  Progress, Avatar, Badge, SimpleGrid, Divider, Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconUserEdit, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const GREEN = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.30)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.08)';

export default function Profile() {
  const { user, login } = useAuth(); // Need login to update context user
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(user || {});

  const form = useForm({
    initialValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
      bloodGroup: user?.bloodGroup || '',
      nationality: user?.nationality || '',
      address: user?.address || '',
      nid: user?.nid || '',
      emergencyContact: user?.emergencyContact || '',
      
      // Role specifics
      officeAddress: user?.officeAddress || '',
      contactNumber: user?.contactNumber || '',
      vehicleType: user?.vehicleType || '',
      workingHours: user?.workingHours || '',
    }
  });

  // Re-sync if context updates
  useEffect(() => {
    if (user) setProfileData(user);
  }, [user]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await API.put('/auth/profile', values);
      const updatedUser = res.data.data.user;
      setProfileData(updatedUser);
      // Update local storage and context
      const token = localStorage.getItem('civic_token');
      login(token, updatedUser);

      notifications.show({
        title: 'Profile Updated',
        message: 'Your information has been saved successfully.',
        color: 'teal',
        icon: <IconCheck size={16} />
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to update profile',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const completeness = profileData?.profileCompleteness || 30;

  return (
    <Box maw={900} mx="auto" p="md">
      <Group align="flex-end" mb="xl">
        <Avatar size={80} radius="xl" color="civic">
          {profileData?.name?.charAt(0)}
        </Avatar>
        <Box style={{ flex: 1 }}>
          <Title order={2} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
            {profileData?.name}
          </Title>
          <Text c="dimmed">{profileData?.email} • <Badge color="civic" variant="outline">{profileData?.role}</Badge></Text>
        </Box>
      </Group>

      {/* Completeness Bar */}
      <Card p="md" radius="md" mb="xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group justify="space-between" mb={8}>
          <Text size="sm" fw={600} c="white">Profile Completeness</Text>
          <Text size="sm" fw={700} c={completeness === 100 ? GREEN : 'yellow'}>{completeness}%</Text>
        </Group>
        <Progress 
          value={completeness} 
          size="lg" 
          radius="xl" 
          color={completeness === 100 ? GREEN : 'yellow'} 
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
        {completeness < 100 && (
          <Text size="xs" c="dimmed" mt="xs">Complete your profile to unlock all platform features.</Text>
        )}
      </Card>

      {/* Form */}
      <Card p="xl" radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <Group mb="lg">
          <IconUserEdit size={20} color={GREEN} />
          <Title order={4} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>Personal Information</Title>
        </Group>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Full Name" {...form.getInputProps('name')} required />
              <TextInput label="Phone Number" {...form.getInputProps('phone')} />
              <TextInput label="Date of Birth" type="date" {...form.getInputProps('dob')} />
              <TextInput label="Blood Group" {...form.getInputProps('bloodGroup')} />
              <TextInput label="Nationality" {...form.getInputProps('nationality')} />
              <TextInput label="National ID (NID)" {...form.getInputProps('nid')} />
              <TextInput label="Emergency Contact" {...form.getInputProps('emergencyContact')} />
            </SimpleGrid>
            <TextInput label="Full Address" {...form.getInputProps('address')} />

            {/* Role Specifics */}
            {profileData?.role === 'ward_official' && (
              <>
                <Divider my="md" label="Ward Official Info" labelPosition="center" color={BORDER} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Office Address" {...form.getInputProps('officeAddress')} />
                  <TextInput label="Office Contact Number" {...form.getInputProps('contactNumber')} />
                </SimpleGrid>
              </>
            )}

            {profileData?.role === 'field_worker' && (
              <>
                <Divider my="md" label="Field Worker Info" labelPosition="center" color={BORDER} />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Vehicle Type (e.g. Truck, Van)" {...form.getInputProps('vehicleType')} />
                  <TextInput label="Working Hours" {...form.getInputProps('workingHours')} />
                </SimpleGrid>
              </>
            )}

            <Button 
              type="submit" 
              color="civic" 
              loading={loading}
              leftSection={<IconDeviceFloppy size={16} />}
              mt="xl"
            >
              Save Profile Changes
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
