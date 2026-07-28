import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Alert, Button, Drawer, IconButton, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { mapAnnouncementRow } from '../utils/announcementApi.js'

function unwrap(response) {
  return response?.data ?? response
}

function timestamp(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

export default function AnnouncementDetailDrawer({
  announcementId,
  open,
  onClose,
  onEdit,
  onDelete,
}) {
  const query = useQuery({
    queryKey: ['hr-announcement', announcementId],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.ANNOUNCEMENT(announcementId))
        .then(unwrap)
        .then(mapAnnouncementRow),
    enabled: open && Boolean(announcementId),
  })
  const announcement = query.data

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'w-full sm:w-[560px]' }}
    >
      <div className="flex h-full flex-col bg-surface">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <Typography variant="h6" className="break-words">
              {announcement?.title || 'Announcement details'}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-muted">
              {announcement?.category || 'Loading announcement'} · {announcement?.status || '-'}
            </Typography>
          </div>
          <IconButton aria-label="Close announcement details" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="flex-1 space-y-5 overflow-auto px-5 py-4">
          {query.isPending ? <Skeleton variant="rectangular" height={300} /> : null}
          {query.isError ? (
            <Alert severity="error">{query.error.message || 'Could not load announcement'}</Alert>
          ) : null}
          {announcement ? (
            <>
              <section>
                <Typography variant="subtitle2" className="font-semibold text-ink-strong">
                  Message
                </Typography>
                <Typography className="mt-2 whitespace-pre-wrap break-words text-ink-strong">
                  {announcement.content}
                </Typography>
              </section>
              <dl className="grid gap-4 border-y border-border py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-muted">Priority</dt>
                  <dd className="mt-1 text-sm text-ink-strong">{announcement.priority || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Pinned</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {announcement.isPinned ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Audience</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {announcement.sendToAll ? 'All employees' : 'Targeted'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Departments</dt>
                  <dd className="mt-1 break-words text-sm text-ink-strong">
                    {announcement.targetDepartmentIds?.join(', ') || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Employees</dt>
                  <dd className="mt-1 break-words text-sm text-ink-strong">
                    {announcement.targetProfileIds?.join(', ') || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Scheduled</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {timestamp(announcement.scheduledAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Published</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {timestamp(announcement.publishedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Reminder</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {timestamp(announcement.remindAt)}
                  </dd>
                </div>
              </dl>
              <section>
                <Typography variant="subtitle2" className="font-semibold text-ink-strong">
                  Attachments
                </Typography>
                {announcement.attachments?.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-ink-strong">
                    {announcement.attachments.map((attachment) => (
                      <li key={attachment.mediaId}>
                        {attachment.filename || attachment.mediaId}
                        {attachment.mimeType ? ` (${attachment.mimeType})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Typography variant="body2" className="mt-2 text-ink-muted">
                    No attachments
                  </Typography>
                )}
              </section>
              {announcement.eventDetails ? (
                <section className="border-t border-border pt-4">
                  <Typography variant="subtitle2" className="font-semibold text-ink-strong">
                    Event details
                  </Typography>
                  <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-ink-muted">Starts</dt>
                      <dd className="mt-1 text-sm text-ink-strong">
                        {timestamp(announcement.eventDetails.startDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Ends</dt>
                      <dd className="mt-1 text-sm text-ink-strong">
                        {timestamp(announcement.eventDetails.endDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Location</dt>
                      <dd className="mt-1 text-sm text-ink-strong">
                        {announcement.eventDetails.location || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Mandatory</dt>
                      <dd className="mt-1 text-sm text-ink-strong">
                        {announcement.eventDetails.isMandatory ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
        {announcement ? (
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            className="border-t border-border px-5 py-3"
          >
            {announcement.capabilities?.delete ? (
              <Button
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => onDelete(announcement)}
              >
                Delete
              </Button>
            ) : null}
            {announcement.capabilities?.update ? (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={() => onEdit(announcement)}
              >
                Edit
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </div>
    </Drawer>
  )
}
