export enum TeacherStatus {
  ACTIVE = 'active',
  RESIGNED = 'resigned',
  DISABLED = 'disabled',
}

export enum ContentStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum FileStatus {
  UPLOADED = 'uploaded',
  PARSED = 'parsed',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum PreviewStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum ExportStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}
