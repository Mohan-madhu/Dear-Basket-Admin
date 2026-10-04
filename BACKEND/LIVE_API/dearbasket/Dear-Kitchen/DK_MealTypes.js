const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all meal types
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('EXEC sp_dk_GetMealTypes;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET meal type by mealtypeid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('mealtypeid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_mealtypes WHERE mealtypeid = @mealtypeid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE meal type
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('mealtypename', sql.NVarChar, req.body.mealtypename)
      .input('sortorder', sql.Int, req.body.sortorder)
      // Default isactive to 1 when not provided
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_mealtypes
          (mealtypeid, mealtypename, sortorder, isactive, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @mealtypename, @sortorder, @isactive, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE meal type by mealtypeid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.mealtypeid;
    const fields = ['mealtypename', 'sortorder', 'isactive', 'luu'];
    const updates = [];
    const request = pool.request();

    request.input('mealtypeid', sql.VarChar, id);
    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'sortorder' || f === 'isactive') request.input(f, sql.Int, req.body[f]);
        else if (f === 'luu') request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_mealtypes
      SET ${setClause}
      WHERE mealtypeid = @mealtypeid;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE meal type by mealtypeid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.mealtypeid;
    await poolConnect;
    const result = await pool.request()
      .input('mealtypeid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_mealtypes
        WHERE mealtypeid = @mealtypeid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
