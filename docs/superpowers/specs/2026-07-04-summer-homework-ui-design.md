# Summer Homework Check-in UI Design

## Design Direction

The app should feel like a small, dependable family tool rather than a public education platform. The child side should be simple enough to use without explanation. The parent side should be dense enough to review quickly, but not feel like an enterprise dashboard.

Visual tone:

- True white background.
- Light gray dividers and surfaces.
- Teal as the main action color.
- Amber for pending confirmation or unfinished work.
- Green for completed work.
- Charcoal text with muted gray secondary text.
- Cards and panels use modest radius, around 8px.
- Avoid marketing-style hero sections, decorative illustrations, purple gradients, and oversized metric cards.

## Child Mobile PWA

### Primary Screen: Today Check-in

The first screen is the daily homework list.

Top area:

- App title: `暑假打卡`
- Child selector showing the current child.
- Date selector defaulting to today.
- Small daily summary, for example `已完成 2 / 共 6 项`.

Main content:

- Homework grouped by subject.
- Subject headers show subject name and item count.
- Items inside each subject preserve configured order.
- Each homework item shows:
  - status icon
  - content
  - status label
  - photo count
  - photo thumbnails when uploaded
  - camera/upload action when editable
  - lock affordance when completed

States:

- `未提交`: gray status, no photos.
- `待确认`: amber status, one or more photos uploaded.
- `已完成`: green status, locked from child edits.

Navigation:

- Keep bottom navigation minimal if used:
  - `今日打卡`
  - `全部作业`
  - `我的`
- Version one can implement only the needed screens behind these labels.

### Upload Flow

The upload flow should be direct:

1. Child taps `拍照上传` or opens an item.
2. Phone camera/file picker opens.
3. One or more photos can be added.
4. Photos are compressed before upload.
5. Uploaded thumbnails appear under that item.
6. Tapping a thumbnail opens large preview.
7. If the item is not completed, photos can be deleted.
8. If the item is completed, upload and delete controls are hidden or disabled.

### Empty Date

If the selected date has no homework, show a calm empty state:

`这天没有作业`

Do not allow the child to create homework from this state.

## Parent Web Admin

### Layout

Use a desktop/tablet-friendly admin layout:

- Left sidebar navigation.
- Top date toolbar.
- Main review table/list.
- Right side summary or pending queue panel.

Sidebar items:

- `按日期查看`
- `待审核`
- `作业计划`
- `JSON导入`

The admin area should indicate that parent mode is protected, but it does not need public account UI.

### Date Review View

This is the default parent view.

Top controls:

- Date picker.
- Previous day / next day buttons.
- Today button.

Main content:

- Separate sections for each child.
- Within each child, rows are grouped or sorted by subject.
- Each row shows:
  - subject
  - homework content
  - completion status
  - photo thumbnails
  - photo count
  - `查看照片`
  - `标记完成` or `改为未完成`

Use table-like rows on desktop for scan speed. On smaller screens, the same information can collapse into stacked rows.

### Pending Review View

The pending review view lists all not-completed homework items that already have photos.

Each item should show:

- child
- date
- subject
- homework content
- photo count
- thumbnails
- actions to view photos and mark completed

This view is for fast daily cleanup.

### JSON Import View

The JSON import page should be plain and practical:

- Large text area for pasted JSON.
- Validate button.
- Validation result summary.
- Preview table grouped by child/date.
- Confirm import button.

The import preview should make it obvious which child, date, subject, and content will be added.

Import behavior:

- Append only.
- No overwrite.
- No deduplication.
- Manual cleanup happens after import if needed.

### Plan Management View

The plan management view should support:

- Filter by child.
- Filter by date.
- Add item.
- Edit item.
- Delete item with confirmation if photos exist.
- Adjust subject and item order.

Do not include backup, restore, reset, or destructive system-level controls in the UI.

## Photo Preview

Both child and parent surfaces need photo preview.

Preview behavior:

- Tap/click a thumbnail to open a large viewer.
- Support next/previous when multiple photos exist.
- Show photo count, for example `2 / 4`.
- Parent viewer should keep completion action nearby, such as `标记完成`.
- Child viewer should show delete only when the item is editable.

## Responsive Behavior

Child side:

- Designed mobile-first.
- Primary target around 390px width.
- Must remain usable on common Android phones and iPhones.

Parent side:

- Best on desktop or tablet.
- Should remain usable on a phone for emergency checks, but dense management can be optimized for larger screens.

## Copy Guidelines

Use short Chinese labels:

- `暑假打卡`
- `今天`
- `未提交`
- `待确认`
- `已完成`
- `拍照上传`
- `查看照片`
- `标记完成`
- `改为未完成`
- `这天没有作业`
- `JSON导入`
- `确认导入`

Avoid explanatory paragraphs inside the app. The interface should be self-explanatory through labels, states, and button placement.

## Implementation Notes For Later

This document is a UI design reference, not a technical plan.

When implementing, use reusable components for:

- app shell
- child selector
- date selector
- subject group
- homework item row/card
- status badge
- photo thumbnail strip
- photo preview modal
- admin sidebar
- admin review row
- JSON import preview table

The child UI and parent UI can share status colors, photo viewer behavior, and date/child data models, but their layouts should remain separately optimized.
