const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all order items by orderid
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, req.query.orderid)
      .query('SELECT * FROM tbl_dk_orderitems WHERE orderid = @orderid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// GET order item by orderitemid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderitemid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_orderitems WHERE orderitemid = @orderitemid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// CREATE order item
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;

    const menuItemResult = await pool.request()
      .input('itemid', sql.VarChar, req.body.itemid)
      .query('SELECT itemname, price, isveg FROM tbl_dk_menuitems WHERE itemid = @itemid;');

    if (menuItemResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const menuItem = menuItemResult.recordset[0];

    const result = await pool.request()
      .input('orderid', sql.VarChar, req.body.orderid)
      .input('itemid', sql.VarChar, req.body.itemid)
      .input('itemname', sql.NVarChar, menuItem.itemname)
      .input('price', sql.Decimal(10, 2), menuItem.price)
      // Default quantity to 1 when not provided
      .input('quantity', sql.Int, req.body.quantity ?? 1)
      .input('isveg', sql.Int, menuItem.isveg)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_orderitems
          (orderitemid, orderid, itemid, itemname, price, quantity, isveg, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @orderid, @itemid, @itemname, @price, @quantity, @isveg, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE order item by orderitemid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.orderitemid;
    const fields = ['orderid', 'itemid', 'itemname', 'price', 'quantity', 'isveg', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('orderitemid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'quantity' || f === 'isveg') request.input(f, sql.Int, req.body[f]);
        else if (f === 'price') request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['orderid', 'itemid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_orderitems
      SET ${setClause}
      WHERE orderitemid = @orderitemid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE order item by orderitemid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.orderitemid;
    await poolConnect;
    const result = await pool.request()
      .input('orderitemid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_orderitems
        WHERE orderitemid = @orderitemid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
