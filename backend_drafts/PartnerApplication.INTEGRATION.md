# Partner application deployment

1. Run `PartnerApplication.sql` against `db_dearbasket`.
2. Copy `PartnerApplication.routes.js` into the backend routes folder.
3. Adjust its `db_dearbasket` import path if the server route folder differs.
4. Register it in the DearBasket router/server:

```js
const partnerApplicationRoutes = require('./routes/PartnerApplication.routes');
app.use('/API/DearBasket/PartnerApplication', partnerApplicationRoutes);
```

The route uses `mobile` as the partner login identifier because the deployed `tbl_user` has no `username` column. If the deployed `UserSignUp` endpoint hashes passwords, replace the direct password insert with that same hashing helper before deployment.
