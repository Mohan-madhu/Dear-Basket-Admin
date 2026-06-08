const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all menu items for a kitchen
router.get('/:kitchenid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.params.kitchenid || null)
      .input('mealtypeid', sql.VarChar, req.query.mealtypeid || null)
      .query('EXEC sp_dk_GetKitchenMenu @kitchenid, @mealtypeid;');
    res.json({ Response: result.recordsets && result.recordsets[1] ? result.recordsets[1] : result.recordset });
  } catch (err) { next(err); }
});

// GET menu item by itemid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('itemid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_menuitems WHERE itemid = @itemid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// CREATE menu item
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('categoryid', sql.VarChar, req.body.categoryid)
      .input('itemname', sql.NVarChar, req.body.itemname)
      .input('description', sql.NVarChar, req.body.description)
      .input('price', sql.Decimal(10, 2), req.body.price)
      .input('imageurl', sql.NVarChar, req.body.imageurl)
      // Default flags to sensible values when not provided
      .input('isveg', sql.Int, req.body.isveg ?? 1)
      .input('isavailable', sql.Int, req.body.isavailable ?? 1)
      .input('isnew', sql.Int, req.body.isnew ?? 0)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_menuitems
          (itemid, kitchenid, categoryid, itemname, description, price, imageurl, isveg, isavailable, isnew, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @kitchenid, @categoryid, @itemname, @description, @price, @imageurl, @isveg, @isavailable, @isnew, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE menu item by itemid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.itemid;
    const fields = ['kitchenid', 'categoryid', 'itemname', 'description', 'price', 'imageurl', 'isveg', 'isavailable', 'isnew', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('itemid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (['isveg', 'isavailable', 'isnew'].includes(f)) request.input(f, sql.Int, req.body[f]);
        else if (f === 'price') request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['kitchenid', 'categoryid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_menuitems
      SET ${setClause}
      WHERE itemid = @itemid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE menu item by itemid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.itemid;
    await poolConnect;
    const result = await pool.request()
      .input('itemid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_menuitems
        WHERE itemid = @itemid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
