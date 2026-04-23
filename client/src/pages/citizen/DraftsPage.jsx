import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Title, Text, Group, Stack, Card, Badge, Button,
  ActionIcon, Popover, Tooltip, Alert, Anchor, ThemeIcon, Center,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconTrash, IconEdit, IconCloudUpload, IconFileOff,
  IconAlertCircle, IconCircleCheck, IconPlus,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications as toast } from '@mantine/notifications';
import API from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.08)';
const GREEN_BDR = 'rgba(0,255,65,0.20)';
const CARD_BG   = 'rgba(255,255,255,0.03)';
const BORDER    = 'rgba(255,255,255,0.07)';
const DRAFT_KEY = 'civicresolve_drafts';

// ─── Draft helpers ────────────────────────────────────────────────────────────
function readDrafts()         { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '[]'); } catch { return []; } }
function writeDrafts(arr)     { localStorage.setItem(DRAFT_KEY, JSON.stringify(arr)); }
function removeDraft(draftId) { writeDrafts(readDrafts().filter(d => d.draftId !== draftId)); }
function patchDraft(draftId, patch) {
  writeDrafts(readDrafts().map(d => d.draftId === draftId ? { ...d, ...patch } : d));
}

// ─── Delete confirmation popover ──────────────────────────────────────────────
function DeletePopover({ onConfirm }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover opened={open} onClose={() => setOpen(false)} position="top" withArrow shadow="md"
      styles={{ dropdown: { background: '#1a1a1a', border: `1px solid ${BORDER}` } }}>
      <Popover.Target>
        <Tooltip label="Delete draft" position="top" withArrow>
          <ActionIcon size="sm" variant="subtle" color="red" radius="md"
            onClick={() => setOpen(o => !o)}>
            <IconTrash size={15} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm" maw={200}>
          <Text size="xs" c="dimmed">Delete this draft permanently?</Text>
          <Group gap="xs">
            <Button size="xs" variant="subtle" color="gray" radius="sm"
              onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" color="red" radius="sm"
              onClick={() => { onConfirm(); setOpen(false); }}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// ─── Draft card ───────────────────────────────────────────────────────────────
function DraftCard({ draft, onDelete, onSync }) {
  const navigate = useNavigate();

  const handleResume = () => {
    navigate('/citizen/submit', { state: { draft } });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <Card p="lg" radius="md"
        style={{
          background: CARD_BG,
          border: `1px solid ${draft.isSynced ? GREEN_BDR : BORDER}`,
          transition: 'border-color .2s',
        }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <Text size="sm" fw={600} c="white" truncate
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {draft.title?.trim() || 'Untitled Draft'}
            </Text>

            {/* Description preview */}
            {draft.description && (
              <Text size="xs" c="dimmed" mt={4} lineClamp={2} lh={1.5}>
                {draft.description.slice(0, 80)}
                {draft.description.length > 80 ? '…' : ''}
              </Text>
            )}

            {/* Meta row */}
            <Group gap={8} mt={10} wrap="wrap">
              {draft.category && (
                <Badge size="xs" color="cyan" variant="dot">{draft.category}</Badge>
              )}
              <Badge
                size="xs"
                color={draft.isSynced ? 'teal' : 'yellow'}
                variant="light"
                leftSection={draft.isSynced
                  ? <IconCircleCheck size={10} />
                  : <IconAlertCircle size={10} />}
              >
                {draft.isSynced ? 'Synced' : 'Pending'}
              </Badge>
              {draft.createdAt && (
                <Text size="xs" c="dimmed">
                  {new Date(draft.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                </Text>
              )}
            </Group>
          </Box>

          {/* Actions */}
          <Group gap={6} align="center" style={{ flexShrink: 0, marginLeft: 12 }}>
            <Button size="xs" radius="md" color="civic" variant="light"
              leftSection={<IconEdit size={13} />}
              onClick={handleResume}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Resume
            </Button>

            {!draft.isSynced && (
              <Tooltip label="Sync now" position="top" withArrow>
                <ActionIcon size="sm" variant="subtle" color="blue" radius="md"
                  onClick={() => onSync(draft)}>
                  <IconCloudUpload size={15} />
                </ActionIcon>
              </Tooltip>
            )}

            <DeletePopover onConfirm={() => onDelete(draft.draftId)} />
          </Group>
        </Group>
      </Card>
    </motion.div>
  );
}

// ─── DraftsPage ───────────────────────────────────────────────────────────────
export default function DraftsPage() {
  const [drafts,     setDrafts]     = useState([]);
  const [syncing,    setSyncing]    = useState(false);

  // Load on mount
  useEffect(() => { setDrafts(readDrafts()); }, []);

  // Delete
  const handleDelete = useCallback((draftId) => {
    removeDraft(draftId);
    setDrafts(readDrafts());
    toast.show({ title: 'Draft deleted', message: '', color: 'gray', autoClose: 2000 });
  }, []);

  // Sync single draft
  const syncDraft = useCallback(async (draft) => {
    try {
      await API.post('/drafts/sync', {
        message:   draft.description ?? draft.title ?? '',
        createdAt: draft.createdAt,
        title:     draft.title,
        category:  draft.category,
      });
      patchDraft(draft.draftId, { isSynced: true });
      setDrafts(readDrafts());
      toast.show({ title: 'Draft synced ✓', message: `"${draft.title || 'Untitled'}" synced to server.`, color: 'civic', autoClose: 3000 });
    } catch {
      toast.show({ title: 'Sync failed', message: 'Could not reach server. Try again later.', color: 'red', autoClose: 4000 });
    }
  }, []);

  // Sync ALL pending
  const handleSyncAll = async () => {
    const pending = drafts.filter(d => !d.isSynced);
    if (!pending.length) return;
    setSyncing(true);
    let ok = 0;
    for (const draft of pending) {
      try {
        await API.post('/drafts/sync', {
          message:   draft.description ?? draft.title ?? '',
          createdAt: draft.createdAt,
          title:     draft.title,
          category:  draft.category,
        });
        patchDraft(draft.draftId, { isSynced: true });
        ok++;
      } catch { /* skip, keep trying others */ }
    }
    setDrafts(readDrafts());
    setSyncing(false);
    toast.show({
      title:   ok === pending.length ? 'All synced ✓' : `${ok}/${pending.length} synced`,
      message: ok === pending.length ? 'All drafts are now on the server.' : 'Some drafts could not sync.',
      color:   ok === pending.length ? 'civic' : 'orange',
      autoClose: 4000,
    });
  };

  const pendingCount = drafts.filter(d => !d.isSynced).length;

  return (
    <Box maw={680} mx="auto">
      {/* Header */}
      <Group justify="space-between" align="flex-end" mb="xl" wrap="wrap" gap="sm">
        <Box>
          <Title order={2}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>
            My Drafts
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} unsynced`}
          </Text>
        </Box>

        <Group gap="sm">
          <Button
            component={Link}
            to="/citizen/submit"
            size="sm" radius="md" variant="outline" color="civic"
            leftSection={<IconPlus size={15} />}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            New Report
          </Button>
          {pendingCount > 0 && (
            <Button
              size="sm" radius="md" color="blue" variant="light"
              loading={syncing}
              leftSection={<IconCloudUpload size={15} />}
              onClick={handleSyncAll}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Sync All ({pendingCount})
            </Button>
          )}
        </Group>
      </Group>

      {/* Empty state */}
      {drafts.length === 0 ? (
        <Card p={0} radius="md" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Center py={72}>
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#555' }}>
                <IconFileOff size={30} />
              </ThemeIcon>
              <Title order={4} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#555' }}>
                No saved drafts
              </Title>
              <Text size="sm" c="dimmed" ta="center" maw={260}>
                Start a report and click "Save Draft" to save your progress here.
              </Text>
              <Button
                component={Link}
                to="/citizen/submit"
                size="sm" radius="md" color="civic" variant="light"
                leftSection={<IconPlus size={14} />}
              >
                Start a Report
              </Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Stack gap="md">
          <AnimatePresence mode="popLayout">
            {drafts.map(d => (
              <DraftCard
                key={d.draftId}
                draft={d}
                onDelete={handleDelete}
                onSync={syncDraft}
              />
            ))}
          </AnimatePresence>
        </Stack>
      )}
    </Box>
  );
}
