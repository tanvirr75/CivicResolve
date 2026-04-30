import { Paper, Group, Stack, Text, Select, Textarea, Button } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';

export default function DrawerWorkOrderPanel({
  fieldWorkers, selectedWorker, setSelectedWorker,
  workNotes, setWorkNotes, dispatching, onDispatch,
}) {
  return (
    <Paper withBorder p="md" bg="blue.0" radius="md" mt="md">
      <Group mb="sm">
        <IconFileText size={18} color="indigo" />
        <Text fw={700} c="indigo.9">Digital Field Operations</Text>
      </Group>
      <Stack gap="sm">
        <Select
          label="Assign Field Worker"
          placeholder="Select active worker..."
          data={fieldWorkers}
          value={selectedWorker}
          onChange={setSelectedWorker}
          required
        />
        <Textarea
          label="Dispatch Directives"
          placeholder="e.g. Bring asphalt and traffic warning cones..."
          value={workNotes}
          onChange={e => setWorkNotes(e.currentTarget.value)}
        />
        <Button
          color="indigo"
          fullWidth
          loading={dispatching}
          leftSection={<IconFileText size={16} />}
          onClick={onDispatch}
        >
          Dispatch & Download Work Order (PDF)
        </Button>
      </Stack>
    </Paper>
  );
}
