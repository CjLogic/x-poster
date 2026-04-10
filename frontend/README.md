# A dark-themed dashboard with 3 tabs

|---|---|
| Dashboard | | Stats cards (pending/posted/failed/skipped counts), filterable queue list with action buttons per item |
| Add Tweet | | Tweet or Thread mode, 280-char counter, media path input, add to queue button |
| Post Next | | Preview of next pending tweet, Post Now / Dry Run buttons, result display |

## API Endpoints

Method-Endpoint-Action
GET - /api/queue = List items (filter with ?status=pending)
GET - /api/queue/stats = Queue stats
POST - /api/queue = Add tweet or thread
POST - /api/queue/post = Post next pending to X
POST - /api/queue/post/dry-run = Preview without posting
POST - /api/queue/:id/skip = Skip an item
POST - /api/queue/:id/retry = etry a failed item
DELETE - /api/queue/:id = Remove from queue
