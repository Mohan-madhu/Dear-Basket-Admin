const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all kitchen images for a kitchen
// Include `isactive` in the response so frontend can show current status
router.get('/:kitchenid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.params.kitchenid || null)
      .query(`
        SELECT
          imageid,
          imageurl,
          imagetype,
          imagedesc,
          sortorder,
          isactive
        FROM tbl_dk_kitchenimages
        WHERE kitchenid = @kitchenid
        ORDER BY sortorder ASC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET kitchen image by imageid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dk_kitchenimages WHERE imageid = @imageid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE kitchen image
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('imageurl', sql.NVarChar, req.body.imageurl)
      .input('imagetype', sql.NVarChar, req.body.imagetype)
      .input('imagedesc', sql.NVarChar, req.body.imagedesc)
      .input('sortorder', sql.Int, req.body.sortorder)
      // Default isactive to 1 when not provided to avoid NULL inserts
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_kitchenimages
          (imageid, kitchenid, imageurl, imagetype, imagedesc, sortorder, isactive, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @kitchenid, @imageurl, @imagetype, @imagedesc, @sortorder, @isactive, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE kitchen image by imageid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.imageid;
    const fields = ['kitchenid', 'imageurl', 'imagetype', 'imagedesc', 'sortorder', 'isactive', 'luu'];
    const updates = [];
    const request = pool.request();

    request.input('imageid', sql.VarChar, id);
    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'sortorder' || f === 'isactive') request.input(f, sql.Int, req.body[f]);
        else if (f === 'kitchenid' || f === 'luu') request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_kitchenimages
      SET ${setClause}
      WHERE imageid = @imageid;
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

// DELETE kitchen image by imageid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.imageid;
    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_kitchenimages
        WHERE imageid = @imageid;
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
