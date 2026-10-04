const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET ratings by kitchenid
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.query.kitchenid)
      .query('EXEC sp_dk_GetKitchenRatings @kitchenid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// GET rating by ratingid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('ratingid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_ratings WHERE ratingid = @ratingid;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// CREATE rating
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, req.body.orderid)
      .input('userid', sql.VarChar, req.body.userid)
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('rating', sql.Int, req.body.rating)
      .input('review', sql.NVarChar, req.body.review)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_ratings
          (ratingid, orderid, userid, kitchenid, rating, review, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @orderid, @userid, @kitchenid, @rating, @review, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE rating by ratingid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.ratingid;
    const fields = ['orderid', 'userid', 'kitchenid', 'rating', 'review', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('ratingid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'rating') request.input(f, sql.Int, req.body[f]);
        else if (['orderid', 'userid', 'kitchenid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_ratings
      SET ${setClause}
      WHERE ratingid = @ratingid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE rating by ratingid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.ratingid;
    await poolConnect;
    const result = await pool.request()
      .input('ratingid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_ratings
        WHERE ratingid = @ratingid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
