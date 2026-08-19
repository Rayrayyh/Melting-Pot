-- Phone cameras default to HEIC/HEIF; those uploads were rejected by the
-- bucket's MIME allowlist. Accept them alongside the existing types. The
-- accepted image set (png, jpeg, webp, gif, heic, heif) matches what
-- vision models consume, so attached images stay usable as model input.

update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'image/heic', 'image/heif',
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'attachments';
