import React, { useState, useEffect } from 'react';
import { Drawer, Text, Badge, Image, Group, Stack, Button, Textarea, Divider, ActionIcon, ScrollArea, Avatar, LoadingOverlay, Alert, Box, Paper, Select, FileInput } from '@mantine/core';
import { IconThumbUp, IconMessageCircle, IconMapPin, IconSend, IconFlame, IconUpload, IconShieldCheck, IconFileText, IconBrandFacebook } from '@tabler/icons-react';
import API from '../services/api';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';

export default function ReportDetailsDrawer({ reportId, opened, onClose }) {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Admin Overlay States
  const [newStatus, setNewStatus] = useState('');
  const [proofImage, setProofImage] = useState(null);

  // FR-13 Digital Work Order States
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workNotes, setWorkNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Fetch Deep Metadata natively when Drawer opens with a valid ID
  const fetchReportDetails = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await API.get(`/reports/${reportId}`);
      setReport(res.data.data.report);
    } catch (err) {
      notifications.show({ title: 'Sync Failure', message: 'Failed to access remote report data.', color: 'red' });
      onClose(); // Cleanly abort
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchReportDetails();
      // Load available workers selectively
      if (user && (user.role === 'ward_official' || user.role === 'system_admin')) {
        const loadWorkers = async () => {
          try {
            const res = await API.get('/auth/workers');
            setFieldWorkers(res.data.data.workers.map(w => ({ value: w._id, label: w.name })));
          } catch (e) { }
        };
        loadWorkers();
      }
    } else {
      setReport(null); // Dump memory
      setNewStatus('');
      setProofImage(null);
      setSelectedWorker(null);
      setWorkNotes('');
    }
  }, [reportId, opened]);

  useEffect(() => {
    if (report) setNewStatus(report.status);
  }, [report]);

  // Hook -> FR-04: Upvote / Community Verification Engine
  const handleToggleUpvote = async () => {
    setProcessingAction(true);
    try {
      const res = await API.put(`/reports/${reportId}/upvote`);

      // Optimistic Structural Update based on Backend resolution confirmation
      const isAdded = res.data.message.includes('added');
      setReport(prev => ({
        ...prev,
        upvoteCount: res.data.data.upvoteCount,
        priorityScore: res.data.data.priorityScore,
        // Physically emulate the active color state without querying JWT ID natively
        hasEmulatedUpvote: isAdded
      }));

    } catch (err) {
      notifications.show({ title: 'Authentication Required', message: 'You must be fully signed in to verify incidents!', color: 'orange' });
    } finally {
      setProcessingAction(false);
    }
  };

  // Hook -> FR-05: Deep Thread Comments
  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setProcessingAction(true);
    try {
      await API.post(`/reports/${reportId}/comments`, { content: commentText });
      setCommentText(''); // Clear buffer
      await fetchReportDetails(); // Re-sync the entire array block to fetch the newly stamped timestamp accurately
    } catch (err) {
      notifications.show({ title: 'Action Denied', message: 'Only registered users can contribute to active threads.', color: 'red' });
    } finally {
      setProcessingAction(false);
    }
  };

  // FR-13: PDF Work Order Dispatch Hook
  const handleDispatchWorkOrder = async () => {
    if (!selectedWorker) {
      return notifications.show({ title: 'Validation Breach', message: 'You must select a physical field worker to dispatch.', color: 'red' });
    }
    setDispatching(true);
    try {
      const res = await API.post('/work-orders', { reportId, assignedTo: selectedWorker, notes: workNotes });
      notifications.show({ title: 'Deployment Live!', message: 'Work Order securely sent. Core is rendering PDF payload...', color: 'teal', autoClose: 5000 });
      window.open(res.data.data.workOrder.pdfUrl, '_blank'); // Spawn secure downloaded window
      setWorkNotes('');
      setSelectedWorker(null);
      await fetchReportDetails();
    } catch (err) {
      notifications.show({ title: 'Deployment Blocked', message: err.response?.data?.message || 'Failed PDF Execution', color: 'red' });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      padding="xl"
      title={<Text fw={900} size="lg">Incident Analysis</Text>}
      overlayProps={{ opacity: 0.5, blur: 4 }}
    >
      <Box style={{ position: 'relative', minHeight: 300 }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

        {report && (
          <Stack gap="lg">

            {/* Header Block */}
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <Text fw={800} size="xl" style={{ flex: 1, lineHeight: 1.2 }}>{report.title}</Text>

                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" size="lg" radius="xl" onClick={() => {
                    const proxyUrl = `http://localhost:5000/api/share/${report._id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(proxyUrl)}`, '_blank', 'width=600,height=500');
                  }}>
                    <IconBrandFacebook size={20} />
                  </ActionIcon>
                  <Badge size="lg" color={report.status === 'Resolved' ? 'teal' : report.status === 'In Progress' ? 'blue' : 'orange'} variant="filled">
                    {report.status}
                  </Badge>
                </Group>

              </Group>

              <Group gap="xs">
                <Badge variant="outline" color="gray"><IconMapPin size={12} style={{ marginRight: 4 }} /> Ward {report.wardId}</Badge>
                <Badge variant="light" color="indigo">{report.category}</Badge>
                {report.priorityScore > 0 && (
                  <Badge color="red" variant="light" leftSection={<IconFlame size={12} />}>Severity: {report.priorityScore.toFixed(1)}/5</Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">Submitted on {new Date(report.createdAt).toLocaleString()} by {report.submittedBy?.name || 'Anonymous'}</Text>
            </Stack>

            {/* Visual Evidence Module */}
            {report.images && report.images.length > 0 && (
              <Image
                src={report.images[0].secure_url || report.images[0].fileUrl}
                radius="md"
                h={250}
                fit="cover"
                fallbackSrc="https://placehold.co/600x400?text=Evidence+Corrupted"
                withPlaceholder
              />
            )}

            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</Text>

            {/* FR-12/14: Administration Control Panel */}
            {user && (user.role === 'ward_official' || user.role === 'system_admin') && (
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

                  {newStatus === 'Resolved' && report.status !== 'Resolved' && (
                    <FileInput
                      label="Proof of Fix Image"
                      description="Photographic evidence strictly required to terminate incident."
                      placeholder="Upload photo..."
                      icon={<IconUpload size={14} />}
                      accept="image/png,image/jpeg,image/avif"
                      value={proofImage}
                      onChange={setProofImage}
                      required
                    />
                  )}

                  <Button
                    color="teal"
                    fullWidth
                    loading={processingAction}
                    onClick={async () => {
                      if (newStatus === report.status) return;
                      if (newStatus === 'Resolved' && !proofImage) {
                        return notifications.show({ title: 'Validation Breach', message: 'Proof of fix is required before resolution.', color: 'red' });
                      }

                      setProcessingAction(true);
                      try {
                        const fd = new FormData();
                        fd.append('status', newStatus);
                        if (proofImage) fd.append('proofImage', proofImage);

                        await API.put(`/reports/${reportId}/status`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                        notifications.show({ title: 'System Override Successful', message: `Marked issue as ${newStatus}. Locals notified.`, color: 'green' });
                        await fetchReportDetails();
                        setProofImage(null);
                      } catch (e) {
                        console.log(e);
                        notifications.show({ title: 'Action Explicitly Denied', message: 'Your jurisdiction limits were exceeded.', color: 'red' });
                      } finally {
                        setProcessingAction(false);
                      }
                    }}
                  >
                    Commit Global Status
                  </Button>
                </Stack>
              </Paper>
            )}

            {/* FR-13: Digital Field Operations Panel */}
            {user && (user.role === 'ward_official' || user.role === 'system_admin') && report.status !== 'Resolved' && (
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
                    onChange={(e) => setWorkNotes(e.currentTarget.value)}
                  />
                  <Button
                    color="indigo"
                    fullWidth
                    leftSection={<IconFileText size={16} />}
                    onClick={handleDispatchWorkOrder}
                  >
                    Deploy & Print Work Order (PDF)
                  </Button>
                </Stack>
              </Paper>
            )}

            {/* Action Frame */}
            <Group grow>
              <Button
                variant={report.hasEmulatedUpvote ? "filled" : "light"}
                color="orange"
                leftSection={<IconThumbUp size={16} />}
                onClick={handleToggleUpvote}
                loading={processingAction}
              >
                Verify ({report.upvoteCount})
              </Button>
            </Group>

            <Divider my="sm" />

            {/* Discussion Engine */}
            <Stack gap="sm">
              <Group gap="xs">
                <IconMessageCircle size={18} />
                <Text fw={700}>Community Thread ({report.comments?.length || 0})</Text>
              </Group>

              <ScrollArea h={300} type="auto" offsetScrollbars>
                <Stack gap="md" pr="sm">
                  {report.comments && report.comments.map((cmd) => (
                    <Group key={cmd._id} align="flex-start" wrap="nowrap">
                      <Avatar color="blue" radius="xl">{cmd.authorName.charAt(0)}</Avatar>
                      <div>
                        <Group gap="xs" align="center">
                          <Text size="sm" fw={600}>{cmd.authorName}</Text>
                          <Text size="xs" c="dimmed">{new Date(cmd.createdAt).toLocaleDateString()}</Text>
                        </Group>
                        <Text size="sm">{cmd.content}</Text>
                      </div>
                    </Group>
                  ))}
                  {(!report.comments || report.comments.length === 0) && (
                    <Text c="dimmed" size="sm" fs="italic">System log initialized. No community feedback recorded yet.</Text>
                  )}
                </Stack>
              </ScrollArea>

              <Group align="flex-end">
                <Textarea
                  placeholder="Contribute strictly constructive feedback..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  autosize
                  minRows={1}
                  maxRows={4}
                />
                <ActionIcon size="xl" radius="md" color="indigo" variant="filled" onClick={handlePostComment} loading={processingAction}>
                  <IconSend size={18} />
                </ActionIcon>
              </Group>

            </Stack>

          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
