import { Paper, Group, Stack, Text, Select, Button } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';

export default function DrawerAdminControls({ report, newStatus, setNewStatus, processing, onUpdateStatus }) {
  return (
    <Paper withBorder p="md" bg="gray.0" radius="md">
      <Group mb="sm">
        <IconShieldCheck size={18} color="teal" />
        <Text fw={700} c="teal.9">Official Authority Controls</Text>
      </Group>
      <Stack gap="sm">
        <Select
          label="Incident Resolution Status"
          value={newStatus}
          onChange={setNewStatus}
          data={['Open', 'Assigned', 'In Progress', 'Resolved']}
          allowDeselect={false}
        />
        <Button
          color="teal"
          fullWidth
          loading={processing}
          disabled={newStatus === report.status}
          onClick={onUpdateStatus}
        >
          Update Status
        </Button>
      </Stack>
    </Paper>
  );
}
