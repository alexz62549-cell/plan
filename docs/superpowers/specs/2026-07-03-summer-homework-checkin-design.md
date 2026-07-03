# Summer Homework Check-in Design

## Purpose

Build a family-use homework check-in app for one summer vacation. The parent prepares daily homework plans for two children. Each child opens a phone-friendly web app, selects their name and date, uploads photos for each homework item, and waits for parent confirmation. The parent manages plans and confirms completion from a protected admin area.

The first version should stay small, reliable, and easy to iterate. It should not include public registration, app-store release, mini-program publishing, messaging, offline sync, or analytics-heavy reporting.

## Product Form

The app will be a mobile-first PWA deployed to the user's own server. Children access it from a home-screen icon on their phones. The same server also hosts the parent admin pages and stores the database and uploaded photos.

This avoids APK packaging, app-store installation, and WeChat mini-program review. A later migration to a WeChat mini-program or native app remains possible if the workflow proves stable.

## Users

### Children

- There are two child profiles.
- The app remembers the last selected child on the device.
- The child can manually switch to the other profile.
- Children do not log in.
- Children cannot create homework items.
- Children upload photos as evidence for planned homework items.

### Parent

- The parent opens a separate admin area.
- The admin area is protected by one fixed PIN or password.
- There is no user registration or multi-account system.
- The parent imports, edits, reviews, and confirms homework.

## Child Workflow

1. Open the PWA from the phone home screen.
2. The app defaults to the last selected child.
3. The app defaults to today's date.
4. The child may choose any date, including past or future dates.
5. If that date has no plan, show a simple empty state such as "No homework for this day."
6. If homework exists, show items grouped by subject.
7. Within each subject, preserve the configured item order.
8. The child opens a homework item and uploads one or more photos.
9. Photos are compressed before upload.
10. Uploaded photos appear as thumbnails and can be opened in a larger preview.
11. While an item is not completed, the child may add or delete photos.
12. Once the parent marks an item completed, the item is locked for the child.

## Homework Item States

Each homework item has a simple state derived from photos and parent confirmation:

- `not_submitted`: no photos uploaded and not completed.
- `pending_confirmation`: one or more photos uploaded and not completed.
- `completed`: parent has marked the item completed.

The child-facing UI should use plain labels:

- 未提交
- 待确认
- 已完成

Only `completed` locks child edits.

## Parent Workflow

### Plan Management

The parent admin can:

- Import homework plans.
- Preview imported plans before saving.
- Save imports by appending to existing plans.
- Manually add homework items.
- Edit homework item date, child, subject, content, and order.
- Delete homework items, with confirmation if photos already exist.

For version one, JSON is the primary import format because it is stable to parse and easy for AI to generate. Markdown import is out of scope for the first version.

### Review

The parent admin has two main review views:

- Date view: choose a date and see both children's homework for that day, grouped by child, subject, and item.
- Pending view: see all not-completed items that already have uploaded photos.

From either view, the parent can:

- Open photo thumbnails in a large preview.
- Mark an item completed.
- Change a completed item back to not completed.

There are no comments, redo reasons, review notes, or complex progress statuses in version one.

## Homework Plan Import

The first version accepts JSON. The import process should:

1. Let the parent paste or upload JSON.
2. Validate the structure.
3. Show a preview grouped by child and date.
4. Save only after confirmation.
5. Append imported items to existing items.
6. Avoid automatic deduplication or overwrite behavior.

Recommended JSON shape:

```json
{
  "children": [
    {
      "name": "小明",
      "days": [
        {
          "date": "2026-07-10",
          "items": [
            {
              "subject": "语文",
              "content": "阅读 20 分钟"
            },
            {
              "subject": "数学",
              "content": "口算 2 页"
            }
          ]
        }
      ]
    },
    {
      "name": "小红",
      "days": [
        {
          "date": "2026-07-10",
          "items": [
            {
              "subject": "英语",
              "content": "朗读第 1 课"
            }
          ]
        }
      ]
    }
  ]
}
```

The system should assign item order from array position during import. Manual editing can later adjust order if needed.

## Data Model

The implementation should support these core entities:

### Child

- `id`
- `name`
- `display_order`

### HomeworkItem

- `id`
- `child_id`
- `date`
- `subject`
- `content`
- `subject_order`
- `item_order`
- `is_completed`
- `created_at`
- `updated_at`

### Photo

- `id`
- `homework_item_id`
- `file_path`
- `thumbnail_path` if thumbnails are stored separately
- `original_filename`
- `file_size`
- `width`
- `height`
- `created_at`

The database should store paths relative to the upload root so the upload directory can be moved or backed up.

## Photo Handling

Photo requirements:

- Each homework item can have multiple photos.
- Photos always belong to a specific homework item.
- Photos are not stored as a daily shared photo pool.
- Uploads should be compressed before sending when possible.
- Server-side limits should reject unexpectedly large files.
- The app saves compressed images only; original full-size photos are not required.
- A reasonable first default is longest edge around 1600 to 2000 pixels and JPEG quality around 0.75 to 0.85.
- Both child and parent views support large photo preview.

The exact upload directory can be chosen during implementation, but it should be friendly to backup and inspection. A path organized by child, date, and item is acceptable as long as the database remains the source of truth.

## Deployment And Storage

The app will run on the user's own server, likely Ubuntu with Python available. Exact server capabilities will be verified later.

Version one should assume:

- A backend service runs on the server.
- A database stores plans, photos, and completion status.
- Uploaded photos are stored on server disk.
- Backup and restore are handled by scripts or direct server operations, not by web UI buttons.
- The web UI does not include destructive reset or restore controls.

Docker can be considered during implementation if available, but the product requirements do not depend on Docker.

## Authentication And Access

- Child pages do not require login.
- Parent admin pages require one fixed PIN or password.
- The password should be configurable on the server.
- There is no user registration, password recovery, role management, or public account system.
- The server URL is expected to remain private, but admin protection is still required.

## Out Of Scope For Version One

- WeChat mini-program implementation.
- Native Android APK.
- iOS app packaging.
- Public publishing or app-store distribution.
- User registration.
- Multiple families.
- Multiple vacations or school terms.
- Offline upload or background sync.
- Push, SMS, WeChat, or email notifications.
- Audio dictation playback.
- Reading voice recording.
- Parent comments or redo notes.
- Trend charts, weekly reports, or completion analytics.
- Web UI backup, restore, or reset buttons.

## Future Enhancements

Possible later improvements:

- Audio materials for dictation homework.
- Child reading recordings.
- Markdown import.
- Multiple vacation plans such as winter vacation and next summer.
- Export package for database and photos.
- More detailed review statuses such as needs redo.
- Optional parent notes.
- WeChat mini-program wrapper if the PWA workflow is not convenient enough.

## Acceptance Criteria

The version-one product is acceptable when:

- A child can open the phone-friendly app and see the last selected child by default.
- A child can switch child profiles.
- A child can select any date.
- Homework for a date is grouped by subject and ordered correctly.
- A child can upload multiple compressed photos for a homework item.
- A child can preview uploaded photos.
- A completed item is locked against child edits.
- The parent can enter admin with a fixed password.
- The parent can import a valid JSON plan after preview.
- The parent can manually add, edit, and delete homework items.
- The parent can view work by date.
- The parent can view pending uploaded work.
- The parent can preview photos in large view.
- The parent can mark items completed or not completed.
- Data and photos are stored on the server in a backup-friendly way.
