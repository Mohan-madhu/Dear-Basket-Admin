const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

const SERVER_NOW_SQL = "CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30'))";

// GET orders by user, kitchen, or partner
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;

    if (String(req.query.payout || '').toLowerCase() === '1') {
      const filterType = String(req.query.filterType || 'ALL').toUpperCase();
      const fromDate = req.query.fromDate || null;
      const toDate = req.query.toDate || null;
      const mappedpartnerid = req.query.mappedpartnerid || null;

      const result = await pool.request()
        .input('mappedpartnerid', sql.VarChar, mappedpartnerid)
        .input('filterType', sql.VarChar, filterType)
        .input('fromDate', sql.Date, fromDate)
        .input('toDate', sql.Date, toDate)
        .query(`
          DECLARE @Today DATE = CONVERT(DATE, ${SERVER_NOW_SQL});
          DECLARE @StartDate DATE = NULL;
          DECLARE @EndDate DATE = NULL;

          IF @filterType = 'TODAY'
          BEGIN
            SET @StartDate = @Today;
            SET @EndDate = DATEADD(DAY, 1, @Today);
          END
          ELSE IF @filterType = 'TOMORROW'
          BEGIN
            SET @StartDate = DATEADD(DAY, 1, @Today);
            SET @EndDate = DATEADD(DAY, 2, @Today);
          END
          ELSE IF @filterType = 'WEEK'
          BEGIN
            SET @StartDate = DATEADD(DAY, -6, @Today);
            SET @EndDate = DATEADD(DAY, 1, @Today);
          END
          ELSE IF @filterType = 'MONTH'
          BEGIN
            SET @StartDate = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
            SET @EndDate = DATEADD(MONTH, 1, @StartDate);
          END
          ELSE IF @filterType = 'YEAR'
          BEGIN
            SET @StartDate = DATEFROMPARTS(YEAR(@Today), 1, 1);
            SET @EndDate = DATEADD(YEAR, 1, @StartDate);
          END
          ELSE IF @filterType = 'CUSTOM'
          BEGIN
            SET @StartDate = @fromDate;
            SET @EndDate = CASE WHEN @toDate IS NULL THEN NULL ELSE DATEADD(DAY, 1, @toDate) END;
          END

          SELECT
            o.orderid,
            o.orderid AS productorderid,
            o.userid,
            COALESCE(u.name, o.rcu, 'Client') AS username,
            COALESCE(u.name, o.rcu, 'Client') AS name,
            u.mobile AS usermobile,
            o.kitchenid,
            k.kitchenname,
            o.mappedpartnerid,
            4 AS isdailymilkuser,
            'kitchen_order' AS order_type,
            'Food Delivery' AS type,
            o.orderstatus,
            o.orderdata,
            o.itemtotal,
            o.deliverycharge,
            o.tax,
            o.totalamount,
            o.totalamount AS ordergrandtotal,
            o.deliveryaddress,
            o.deliverycity,
            o.deliverystate,
            o.deliverypincode,
            o.latitude,
            o.longitude,
            o.rcm AS ordertime,
            o.orderdelivered,
            o.orderdeliveredby,
            o.orderdeliveredtime,
            o.partnerpayoutapplicationid,
            o.partnerpayoutapplicationstatus,
            o.partnerpayoutpaid
          FROM dbo.tbl_dk_orders o
          LEFT JOIN dbo.tbl_user u ON u.transid = o.userid
          LEFT JOIN dbo.tbl_dk_kitchens k ON k.kitchenid = o.kitchenid
          WHERE (o.orderstatus = 'Delivered' OR ISNULL(o.orderdelivered, 0) = 1)
            AND o.mappedpartnerid IS NOT NULL
            AND (@mappedpartnerid IS NULL OR o.mappedpartnerid = @mappedpartnerid)
            AND (@StartDate IS NULL OR CONVERT(DATE, ISNULL(o.orderdeliveredtime, o.lum)) >= @StartDate)
            AND (@EndDate IS NULL OR CONVERT(DATE, ISNULL(o.orderdeliveredtime, o.lum)) < @EndDate)
          ORDER BY ISNULL(o.orderdeliveredtime, o.lum) DESC, o.orderid DESC;
        `);
      return res.json({ Response: result.recordset });
    }

    if (req.query.userid) {
      const result = await pool.request()
        .input('userid', sql.VarChar, req.query.userid)
        .query('EXEC sp_dk_GetOrdersByUser @userid;');
      return res.json({ Response: result.recordset });
    }

    if (req.query.kitchenid) {
      const result = await pool.request()
        .input('kitchenid', sql.VarChar, req.query.kitchenid)
        .input('orderstatus', sql.NVarChar, req.query.orderstatus || null)
        .query('EXEC sp_dk_GetOrdersByKitchen @kitchenid, @orderstatus;');
      return res.json({ Response: result.recordset });
    }

    if (req.query.mappedpartnerid) {
      const result = await pool.request()
        .input('mappedpartnerid', sql.VarChar, req.query.mappedpartnerid)
        .query('EXEC sp_dk_GetOrdersByPartner @mappedpartnerid;');
      return res.json({ Response: result.recordset });
    }

    const result = await pool.request().query('SELECT * FROM tbl_dk_orders;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// GET order detail by orderid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, req.params.id)
      .query('EXEC sp_dk_GetOrderDetail @orderid;');
    // sp_dk_GetOrderDetail returns two result sets: header (0) and items (1)
    const header = (result.recordsets && result.recordsets[0] && result.recordsets[0][0]) || (result.recordset && result.recordset[0]) || null;
    const items = (result.recordsets && result.recordsets[1]) || [];
    res.json({ Response: { order: header, items } });
  } catch (err) { next(err); }
});

// CREATE order
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('userid', sql.VarChar, req.body.userid)
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('slotid', sql.VarChar, req.body.slotid)
      .input('mealtypeid', sql.VarChar, req.body.mealtypeid)
      .input('deliverydate', sql.Date, req.body.deliverydate)
      .input('deliveryaddress', sql.NVarChar, req.body.deliveryaddress)
      .input('deliverycity', sql.NVarChar, req.body.deliverycity)
      .input('deliverystate', sql.NVarChar, req.body.deliverystate)
      .input('deliverypincode', sql.VarChar, req.body.deliverypincode)
      .input('latitude', sql.Decimal(10, 2), req.body.latitude)
      .input('longitude', sql.Decimal(10, 2), req.body.longitude)
      .input('specialinstructions', sql.NVarChar, req.body.specialinstructions)
      // Default monetary fields to 0 when not provided
      .input('itemtotal', sql.Decimal(10, 2), req.body.itemtotal ?? 0)
      .input('deliverycharge', sql.Decimal(10, 2), req.body.deliverycharge ?? 0)
      .input('totalamount', sql.Decimal(10, 2), req.body.totalamount ?? 0)
      .input('paymentmode', sql.NVarChar, req.body.paymentmode)
      .input('orderdata', sql.NVarChar(sql.MAX), req.body.orderdata || null)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_orders
          (orderid, userid, kitchenid, mappedpartnerid, slotid, mealtypeid, deliverydate, deliveryaddress, deliverycity, deliverystate, deliverypincode, latitude, longitude, specialinstructions, itemtotal, deliverycharge, totalamount, paymentmode, paymentstatus, orderstatus, rcu, rcm, orderdata)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @userid, @kitchenid, NULL, @slotid, @mealtypeid, @deliverydate, @deliveryaddress, @deliverycity, @deliverystate, @deliverypincode, @latitude, @longitude, @specialinstructions, @itemtotal, @deliverycharge, @totalamount, @paymentmode, 'Pending', 'Placed', @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')), @orderdata);
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE order by orderid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.orderid;
    const fields = ['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverydate', 'deliveryaddress', 'deliverycity', 'deliverystate', 'deliverypincode', 'latitude', 'longitude', 'specialinstructions', 'itemtotal', 'deliverycharge', 'tax', 'totalamount', 'paymentmode', 'paymentstatus', 'orderstatus', 'rejectionreason', 'partnerpayoutapplicationid', 'partnerpayoutapplicationstatus', 'partnerpayoutpaid', 'orderdata', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('orderid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'deliverydate') request.input(f, sql.Date, req.body[f]);
        else if (['latitude', 'longitude', 'itemtotal', 'deliverycharge', 'tax', 'totalamount'].includes(f)) request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverypincode', 'partnerpayoutapplicationid', 'partnerpayoutapplicationstatus', 'partnerpayoutpaid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else if (f === 'orderdata') request.input(f, sql.NVarChar(sql.MAX), req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_orders
      SET ${setClause}
      WHERE orderid = @orderid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE order by orderid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.orderid;
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_orders
        WHERE orderid = @orderid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
