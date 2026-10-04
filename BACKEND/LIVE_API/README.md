# DearBasket live backend snapshot

This folder is a source snapshot of the DearBasket API files copied from the
live backend working folder. It intentionally does not include `config/`,
`.env`, database credentials, or deployment files.

## Daily Milk changes

- `dearbasket/DailyMilkStatus.js` now accepts and persists `reducedmilk` via
  `adjustedquantity`.
- Extra/reduced updates reject cancelled or already received dates.
- `dearbasket/DailyMilkBooking.js` excludes cancelled rows from payment totals
  and does not mark cancelled rows as received when payment is recorded.
- `dearbasket/sql/001_dailymilk_adjustments.sql` adds the required database
  column and index.

Run the SQL migration against the DEV `db_dearbasket` database before deploying
the updated route files. Do not commit real environment files or credentials.
