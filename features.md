# x-poster Features

## Open Source (Base Version)

Everything here is free and open source. Host it yourself, modify it, etc.

### Queue Management
- Add individual tweets to queue
- Add threads (multiple tweets in sequence) to queue
- Drag-and-drop to reorder queue items
- Skip, retry, and delete queue items
- View queue filtered by status (All, Pending, Posted, Failed, Skipped)
- Copy tweet/thread text to clipboard

### Multi-User Support
- User accounts with username/password authentication
- Per-user Twitter API credentials
- Separate queues per user
- Session-based authentication with cookies
- Each user posts from their own X account

### Scheduling System
- Schedule tweets and threads for specific date/time
- Quick-schedule options (Today, Tomorrow)
- Suggested posting times (static):
  - Morning (9:00 AM)
  - Lunch (12:00 PM)
  - Evening (5:30 PM)
  - Night (8:00 PM)
- Custom date/time picker
- Calendar view to see scheduled posts for the week
- Lazy scheduler: scheduled posts auto-post when they're due
- Reschedule or remove schedule from calendar

### Media Upload
- Drag-and-drop images/videos into composer
- Multiple media files per tweet
- Visual file list with remove option

### Posting
- Post next pending item manually
- Dry-run mode to preview before posting
- Automatic rate limit checking
- Post using account's Twitter credentials

### Technical
- Self-hosted (no cloud dependency)
- Dark theme UI
- Built with Bun, React 19, Tailwind v4, TypeScript
- OAuth 1.0a implemented from scratch
- JSON file-based storage per user

---

## Pro (Hosted Version Only)

Premium features for the hosted version. These require server-side processing and X API access.

### Optimal Timing AI
- Learns from your posted tweets' engagement patterns
- Suggests best posting times based on your specific audience
- Adapts over time as it gathers more data

### Analytics Dashboard
- Track views, retweets, likes, replies per tweet
- See which tweets perform best
- Basic follower growth metrics

### Hashtag AI
- Analyzes your tweet content
- Suggests relevant hashtags to maximize reach

### Recurring Schedules
- Schedule posts to repeat daily, weekly, or monthly
- Perfect for weekly tips, monthly recaps, etc.

---

## Coming Soon (Open Source)

- [ ] Browser extension for quick capture
- [ ] API webhooks for integrations
- [ ] Import/export queue data
- [ ] Thread templates

## Self-Hosting Setup

Requirements:
- Bun runtime
- X Developer account with API credentials

```bash
bun install
bun run src/index.ts user add <username> <password>
bun run src/index.ts user set-twitter <username>
bun run src/server.ts
```

Access at http://localhost:3001
