const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET orders by user, kitchen, or partner
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;

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
        .query('EXEC sp_dk_GetOrdersByKitchen @kitchenid, @orderstatus;');w
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
      .input('rcu', sql.VarChar, req.body.rcu)
      .input('orderdata', sql.VarChar, req.body.orderdata)
      .query(`
        INSERT INTO tbl_dk_orders
          (orderid, userid, kitchenid, mappedpartnerid, slotid, mealtypeid, deliverydate, deliveryaddress, deliverycity, deliverystate, deliverypincode, latitude, longitude, specialinstructions, itemtotal, deliverycharge, totalamount, paymentmode, paymentstatus, orderstatus, rcu, rcm,orderdata)
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
    const fields = ['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverydate', 'deliveryaddress', 'deliverycity', 'deliverystate', 'deliverypincode', 'latitude', 'longitude', 'specialinstructions', 'itemtotal', 'deliverycharge', 'totalamount', 'paymentmode', 'paymentstatus', 'orderstatus', 'rejectionreason', 'luu','orderdata'];
    const updates = [];
    const request = pool.request();
    request.input('orderid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'deliverydate') request.input(f, sql.Date, req.body[f]);
        else if (['latitude', 'longitude', 'itemtotal', 'deliverycharge', 'totalamount'].includes(f)) request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverypincode', 'luu', 'orderdata'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
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
