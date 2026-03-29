## Return Module Draft

This folder contains ready-to-copy backend drafts for Product Return flow.

### Files
- `ProductReturn.routes.js`
- `sql/001_create_product_return_tables.sql`
- `sql/002_create_product_return_sps.sql`

### Integration Steps
1. Run SQL scripts in order:
   1. `001_create_product_return_tables.sql`
   2. `002_create_product_return_sps.sql`
2. Mount route in your server:
   - `app.use('/API/DearBasket/ProductReturn', require('./routes/Orders/ProductReturn'));`
3. Update db path import if needed:
   - `require('../config/db_dearbasket')` in route file may need path adjustment.

### Main Endpoints
- `GET /ProductReturn/admin/dashboard`
- `GET /ProductReturn/admin/list`
- `GET /ProductReturn/user/:userid`
- `POST /ProductReturn`
- `PUT /ProductReturn/cancel`
- `PUT /ProductReturn/admin/review`
- `PUT /ProductReturn/admin/status`
- `PUT /ProductReturn/admin/qc`
- `PUT /ProductReturn/admin/refund`
- `GET /ProductReturn/partner/:partnerid`
- `PUT /ProductReturn/partner/status`
- `GET /ProductReturn/:returnid`

### Notes
- Status history is auto-logged using `sp_update_product_return_status`.
- Refund success auto-moves return status to `Refunded`.
- Header + detail creation in `POST /` is transaction-safe.
- This draft is backward-compatible with previously created return tables/SPs.
- `GET /:returnid` is intentionally placed last in route order to avoid shadowing other GET routes.
