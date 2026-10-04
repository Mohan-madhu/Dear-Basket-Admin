const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all menu categories for a kitchen and meal type
router.get('/:kitchenid/:mealtypeid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.params.kitchenid || null)
      .input('mealtypeid', sql.VarChar, req.params.mealtypeid || null)
      .query('EXEC sp_dk_GetKitchenMenu @kitchenid, @mealtypeid;');
    res.json({ Response: result.recordsets && result.recordsets[0] ? result.recordsets[0] : result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET menu category by categoryid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('categoryid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_menucategories WHERE categoryid = @categoryid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// CREATE menu category
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('mealtypeid', sql.VarChar, req.body.mealtypeid)
      .input('categoryname', sql.NVarChar, req.body.categoryname)
      .input('sortorder', sql.Int, req.body.sortorder)
      // Default isactive to 1 when not provided
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_menucategories
          (categoryid, kitchenid, mealtypeid, categoryname, sortorder, isactive, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @kitchenid, @mealtypeid, @categoryname, @sortorder, @isactive, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE menu category by categoryid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.categoryid;
    const fields = ['kitchenid', 'mealtypeid', 'categoryname', 'sortorder', 'isactive', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('categoryid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'sortorder' || f === 'isactive') request.input(f, sql.Int, req.body[f]);
        else if (['kitchenid', 'mealtypeid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_menucategories
      SET ${setClause}
      WHERE categoryid = @categoryid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE menu category by categoryid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.categoryid;
    await poolConnect;
    const result = await pool.request()
      .input('categoryid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_menucategories
        WHERE categoryid = @categoryid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
