# Dear-Kitchen API Changes (summary)

This file documents recent changes made to some Dear-Kitchen API endpoints and the JSON shapes they now return. Use this to update the mobile/web app client to match the new responses.

## Summary

- Fixed `GET /Orders/:id` so the endpoint returns both the order header and the order items (stored procedure `sp_dk_GetOrderDetail` returns two result sets). Previously only the first recordset was returned.
- Confirmed `sp_dk_GetKitchenMenu` returns two result sets (categories, then items). The backend APIs already returned the two sets separately in `DK_MenuCategories` and `DK_MenuItems`.
- Switched some `expo-image` cachePolicy usage in the app to `memory-disk` (front-end change) — documented elsewhere.

---

## Changed endpoint: `GET /Dear-Kitchen/Orders/:id`

Location (backend): `BACKEND/APIS/Dear-Kitchen/DK_Orders.js`

### What changed
- Previously the API returned only the first recordset (`result.recordset`) which contained the order header. The stored procedure `sp_dk_GetOrderDetail` returns two SELECTs: the order header and the order items. The items were being discarded.
- The endpoint now returns both sets in a single JSON `Response` object with this shape:

```json
{
  "Status": true,
  "Response": {
    "order": { /* header object or null */ },
    "items": [ /* array of order item objects */ ]
  }
}
```

### Example
Before (older response body):

```json
{ "Response": { "orderid": "...", "userid": "...", /* header fields */ } }
```

After (new response body):

```json
{
  "Response": {
    "order": {
      "orderid": "...",
      "userid": "...",
      "totalamount": 123.45,
      "slottime": "12:30",
      /* other header fields */
    },
    "items": [
      { "orderitemid": "...", "itemid": "...", "price": 45.00, "quantity": 2 },
      { "orderitemid": "...", "itemid": "...", "price": 33.45, "quantity": 1 }
    ]
  }
}
```

### Frontend migration steps
1. Find places where the app calls the order detail endpoint. Example patterns to search for in the app source:
   - `API.GET('Orders/${id}')`
   - `DearKitchenAPI.GET('orders/${id}')`
   - Any client wrapper that calls `Orders/:id`.

2. Replace code that assumes `Response` is a flat recordset or array. Update to use `Response.order` and `Response.items`.

Example change (pseudo-JS):

```js
// Old
const { Response } = await DearKitchenAPI.GET(`Orders/${orderId}`);
const orderHeader = Response; // used directly
const items = []; // previously missing

// New
const { Response } = await DearKitchenAPI.GET(`Orders/${orderId}`);
const orderHeader = Response?.order || null;
const items = Array.isArray(Response?.items) ? Response.items : [];

// Use orderHeader and items in UI/state
```

3. If code expects a single `recordset` array (e.g. `Response[0]`), update to use `Response.items`.

4. Update any TypeScript types or JSDoc describing the API response shape.

---

## Confirmed endpoints already returning multiple sets correctly

- `sp_dk_GetKitchenMenu` → called by:
  - `BACKEND/APIS/Dear-Kitchen/DK_MenuCategories.js` — returns categories (first recordset) as `Response`.
  - `BACKEND/APIS/Dear-Kitchen/DK_MenuItems.js` — returns items (second recordset) as `Response`.

Frontend usage notes:
- The mobile client currently calls separate endpoints for categories and items (`menucategories` and `menuitems`). No change required unless you want to merge them into a single call that returns both sets.

---

## Suggested follow-ups

- Search the app for other endpoints that call stored procedures returning multiple SELECTs. Ensure the API route handlers return all resultsets (the backend `.recordsets` array), and the app consumes the appropriate set.
- Add integration tests on the backend to assert multi-resultset SPs are returned in the expected JSON shape.
- Update API documentation / OpenAPI spec if you maintain one.

---

If you want, I can:
- Update the mobile app files that call `Orders/:id` to the new shape for you (I can search and patch them).
- Produce a short patch list of frontend files to update and apply the changes automatically.

Tell me which action you'd like next.