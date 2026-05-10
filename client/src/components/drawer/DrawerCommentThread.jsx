import { Stack, Group, Text, ScrollArea, Avatar, Textarea, ActionIcon } from '@mantine/core';
import { IconMessageCircle, IconSend } from '@tabler/icons-react';

export default function DrawerCommentThread({ report, commentText, setCommentText, processing, onPost }) {
  const publicComments = (report.comments ?? []).filter(
    c => !c.content?.startsWith('[Ward Official Feedback]')
  );

  return (
    <Stack gap="sm">
      <Group gap="xs">
        <IconMessageCircle size={18} />
        <Text fw={700}>Community Thread ({publicComments.length})</Text>
      </Group>

      <ScrollArea h={300} type="auto" offsetScrollbars>
        <Stack gap="md" pr="sm">
          {publicComments.map(cmd => (
            <Group key={cmd._id} align="flex-start" wrap="nowrap">
              <Avatar color="blue" radius="xl">{cmd.authorName?.charAt(0) ?? '?'}</Avatar>
              <div>
                <Group gap="xs" align="center">
                  <Text size="sm" fw={600}>{cmd.authorName}</Text>
                  <Text size="xs" c="dimmed">{new Date(cmd.createdAt).toLocaleDateString()}</Text>
                </Group>
                <Text size="sm">{cmd.content}</Text>
              </div>
            </Group>
          ))}
          {publicComments.length === 0 && (
            <Text c="dimmed" size="sm" fs="italic">No comments yet. Be the first to respond.</Text>
          )}
        </Stack>
      </ScrollArea>

      <Group align="flex-end">
        <Textarea
          placeholder="Contribute strictly constructive feedback..."
          value={commentText}
          onChange={e => setCommentText(e.currentTarget.value)}
          style={{ flex: 1 }}
          autosize
          minRows={1}
          maxRows={4}
        />
        <ActionIcon size="xl" radius="md" color="indigo" variant="filled" onClick={onPost} loading={processing}>
          <IconSend size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
