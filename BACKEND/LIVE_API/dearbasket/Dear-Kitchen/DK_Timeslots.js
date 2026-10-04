const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all timeslots for a kitchen
router.get('/:kitchenid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.params.kitchenid || null)
      .input('mealtypeid', sql.VarChar, req.query.mealtypeid || null)
      .query('EXEC sp_dk_GetKitchenTimeslots @kitchenid, @mealtypeid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET timeslot by slotid
// Use a distinct route so it doesn't conflict with the kitchen-level GET('/:kitchenid')
router.get('/slot/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('slotid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_timeslots WHERE slotid = @slotid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE timeslot
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('mealtypeid', sql.VarChar, req.body.mealtypeid)
      .input('slottime', sql.NVarChar, req.body.slottime)
      // Default isactive to 1 when not provided
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_timeslots
          (slotid, kitchenid, mealtypeid, slottime, isactive, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @kitchenid, @mealtypeid, @slottime, @isactive, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE timeslot by slotid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.slotid;
    const fields = ['kitchenid', 'mealtypeid', 'slottime', 'isactive', 'luu'];
    const updates = [];
    const request = pool.request();

    request.input('slotid', sql.VarChar, id);
    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'isactive') request.input(f, sql.Int, req.body[f]);
        else if (['kitchenid', 'mealtypeid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_timeslots
      SET ${setClause}
      WHERE slotid = @slotid;
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

// DELETE timeslot by slotid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.slotid;
    await poolConnect;
    const result = await pool.request()
      .input('slotid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_timeslots
        WHERE slotid = @slotid;
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
