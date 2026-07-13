# Daily Milk Complaint Chat: Server Setup

This module provides one permanent text-only conversation between each Daily
Milk user and administrators.

## 1. Database

Run:

`backend_drafts/sql/003_create_dailymilk_complaint_chat.sql`

The script creates:

- `tbl_dailymilk_complaint_conversations`
- `tbl_dailymilk_complaint_messages`
- Unique conversation enforcement per `userid`
- Message history and unread-message indexes

Timestamps are stored in UTC with `SYSUTCDATETIME()`. The mobile app renders
them in Indian Standard Time.

## 2. API Route

Copy `backend_drafts/DailyMilkComplaint.routes.js` into the server's active
DearBasket API route folder. Adjust the relative `config/db_dearbasket` import
to match that folder.

Mount it under:

```js
app.use(
  '/API/DearBasket/DailyMilkComplaint',
  require('./API/DearBasket/DailyMilkComplaint.routes')
);
```

## 3. Endpoint Contract

### Admin applicant inbox

`GET /API/DearBasket/DailyMilkComplaint/admin/conversations?adminid=369DA-X&search=`

Returns only Daily Milk users who have started a complaint by sending at least
one message. Merely opening the complaint screen does not add a user to the
admin inbox. Each row includes the latest message and admin unread count.

### Conversation history

`GET /API/DearBasket/DailyMilkComplaint/user/{userid}?readerid={id}&readerrole=USER|ADMIN`

Returns:

```json
{
  "Conversation": {},
  "Messages": [],
  "Registration": {}
}
```

### Send text message

`POST /API/DearBasket/DailyMilkComplaint/message`

```json
{
  "userid": "369DU-O",
  "senderid": "369DU-O",
  "senderrole": "USER",
  "message": "Milk was not delivered today."
}
```

For an admin reply, `senderid` is the logged-in admin id and `senderrole` is
`ADMIN`.

### Mark incoming messages as read

`PUT /API/DearBasket/DailyMilkComplaint/read`

```json
{
  "userid": "369DU-O",
  "readerid": "369DA-X",
  "readerrole": "ADMIN"
}
```

## 4. Security Requirement

The draft validates user/admin identities against request fields because the
current mobile API does not expose an authentication token. Before production,
the server should validate a signed session/JWT and derive `senderid` and role
from that token instead of trusting client-supplied identity fields.

## 5. Refresh Behavior

The mobile app uses fresh GET requests and short polling. No WebSocket server
is required for the first release. WebSockets can be added later without
changing these tables.
