import { useState, useEffect } from 'react';
import {
  Drawer, Text, Badge, Image, Group, Stack, Button, Divider,
  ActionIcon, Box, LoadingOverlay,
} from '@mantine/core';
import { IconThumbUp, IconMapPin, IconFlame, IconBrandFacebook } from '@tabler/icons-react';
import API from '../services/api';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';
import DrawerAdminControls  from './drawer/DrawerAdminControls';
import DrawerWorkOrderPanel from './drawer/DrawerWorkOrderPanel';
import DrawerCommentThread  from './drawer/DrawerCommentThread';

export default function ReportDetailsDrawer({ reportId, opened, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [report,          setReport]          = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [commentText,     setCommentText]     = useState('');
  const [processingAction,setProcessingAction]= useState(false);
  const [newStatus,       setNewStatus]       = useState('');
  const [fieldWorkers,    setFieldWorkers]    = useState([]);
  const [selectedWorker,  setSelectedWorker]  = useState(null);
  const [workNotes,       setWorkNotes]       = useState('');
  const [dispatching,     setDispatching]     = useState(false);

  const isOfficial = user && (user.role === 'ward_official' || user.role === 'system_admin');

  const fetchReportDetails = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await API.get(`/reports/${reportId}`);
      setReport(res.data.data.report);
    } catch {
      notifications.show({ title: 'Failed to load report', message: 'Could not retrieve report details.', color: 'red' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchReportDetails();
      if (isOfficial) {
        API.get('/auth/workers')
          .then(res => setFieldWorkers(
            (res.data.data.workers ?? []).map(w => ({ value: w._id, label: w.name }))
          ))
          .catch(() => setFieldWorkers([]));
      }
    } else {
      setReport(null);
      setNewStatus('');
      setSelectedWorker(null);
      setWorkNotes('');
    }
  }, [reportId, opened]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (report) setNewStatus(report.status);
  }, [report]);

  const handleToggleUpvote = async () => {
    if (!isAuthenticated()) {
      notifications.show({ title: 'Login required', message: 'You must be logged in to upvote.', color: 'orange' });
      return;
    }
    setProcessingAction(true);
    try {
      const res = await API.put(`/reports/${reportId}/upvote`);
      const isAdded = res.data.message.includes('added');
      setReport(prev => ({
        ...prev,
        upvoteCount:       res.data.data.upvoteCount,
        priorityScore:     res.data.data.priorityScore,
        hasEmulatedUpvote: isAdded,
      }));
    } catch {
      notifications.show({ title: 'Error', message: 'Could not process upvote.', color: 'red' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setProcessingAction(true);
    try {
      await API.post(`/reports/${reportId}/comments`, { content: commentText });
      setCommentText('');
      await fetchReportDetails();
    } catch {
      notifications.show({ title: 'Comment failed', message: 'You must be logged in to comment.', color: 'red' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUpdateStatus = async () => {
    setProcessingAction(true);
    try {
      await API.put(`/reports/${reportId}/status`, { status: newStatus });
      notifications.show({ title: 'Status updated', message: `Marked as ${newStatus}.`, color: 'teal', autoClose: 3000 });
      await fetchReportDetails();
    } catch (e) {
      notifications.show({ title: 'Update failed', message: e.response?.data?.message ?? 'Could not update status.', color: 'red' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDispatchWorkOrder = async () => {
    if (!selectedWorker) {
      return notifications.show({ title: 'Select a worker', message: 'Please select a field worker before dispatching.', color: 'red' });
    }
    setDispatching(true);
    try {
      const res = await API.post('/work-orders', { reportId, assignedTo: selectedWorker, notes: workNotes });
      notifications.show({ title: 'Work order dispatched', message: 'Field worker assigned and PDF generated.', color: 'teal', autoClose: 5000 });
      window.open(res.data.data.workOrder.pdfUrl, '_blank');
      setWorkNotes('');
      setSelectedWorker(null);
      await fetchReportDetails();
    } catch (err) {
      notifications.show({ title: 'Dispatch failed', message: err.response?.data?.message ?? 'Could not dispatch work order.', color: 'red' });
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
      title={<Text fw={900} size="lg">Report Details</Text>}
      overlayProps={{ opacity: 0.5, blur: 4 }}
    >
      <Box style={{ position: 'relative', minHeight: 300 }}>
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

        {report && (
          <Stack gap="lg">

            {/* Header */}
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <Text fw={800} size="xl" style={{ flex: 1, lineHeight: 1.2 }}>{report.title}</Text>
                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" size="lg" radius="xl" onClick={() => {
                    const publicUrl = `${window.location.origin}/reports/${report._id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, '_blank', 'width=600,height=500');
                  }}>
                    <IconBrandFacebook size={20} />
                  </ActionIcon>
                  <Badge size="lg" color={
                    report.status === 'Resolved'    ? 'teal'   :
                    report.status === 'In Progress' ? 'orange' :
                    report.status === 'Assigned'    ? 'blue'   : 'yellow'
                  } variant="filled">
                    {report.status}
                  </Badge>
                </Group>
              </Group>

              <Group gap="xs">
                <Badge variant="outline" color="gray">
                  <IconMapPin size={12} style={{ marginRight: 4 }} /> Ward {report.wardId}
                </Badge>
                <Badge variant="light" color="indigo">{report.category}</Badge>
                {report.priorityScore > 0 && (
                  <Badge color="red" variant="light" leftSection={<IconFlame size={12} />}>
                    Priority: {report.priorityScore.toFixed(1)}/10
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Submitted on {new Date(report.createdAt).toLocaleString()} by {report.submittedBy?.name || 'Anonymous'}
              </Text>
            </Stack>

            {/* Evidence image */}
            {report.images?.length > 0 && (
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

            {/* Admin: status management */}
            {isOfficial && (
              <DrawerAdminControls
                report={report}
                newStatus={newStatus}
                setNewStatus={setNewStatus}
                processing={processingAction}
                onUpdateStatus={handleUpdateStatus}
              />
            )}

            {/* Admin: work order dispatch */}
            {isOfficial && report.status !== 'Resolved' && (
              <DrawerWorkOrderPanel
                fieldWorkers={fieldWorkers}
                selectedWorker={selectedWorker}
                setSelectedWorker={setSelectedWorker}
                workNotes={workNotes}
                setWorkNotes={setWorkNotes}
                dispatching={dispatching}
                onDispatch={handleDispatchWorkOrder}
              />
            )}

            {/* Upvote */}
            <Group grow>
              <Button
                variant={report.hasEmulatedUpvote ? 'filled' : 'light'}
                color="orange"
                leftSection={<IconThumbUp size={16} />}
                onClick={handleToggleUpvote}
                loading={processingAction}
              >
                Verify ({report.upvoteCount})
              </Button>
            </Group>

            <Divider my="sm" />

            {/* Comments */}
            <DrawerCommentThread
              report={report}
              commentText={commentText}
              setCommentText={setCommentText}
              processing={processingAction}
              onPost={handlePostComment}
            />

          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
