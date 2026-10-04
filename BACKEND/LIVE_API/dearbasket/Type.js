const express = require('express');
const router  = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all types
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_types;');
     res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET types by categoryid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('categoryid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_types WHERE categoryid = @categoryid;');
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
     res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// CREATE type
router.post('/', async (req, res, next) => {
  try {
    const {
      name, image, categoryname, categoryid,
      sectionname, sectionid, menuname, menuid, rcu
    } = req.body;
    await poolConnect;
    const result = await pool.request()
      .input('name',         sql.NVarChar, name)
      .input('image',        sql.NVarChar, image)
      .input('categoryname', sql.NVarChar, categoryname)
      .input('categoryid',   sql.VarChar,  categoryid)
      .input('sectionname',  sql.NVarChar, sectionname)
      .input('sectionid',    sql.VarChar,  sectionid)
      .input('menuname',     sql.NVarChar, menuname)
      .input('menuid',       sql.VarChar,  menuid)
      .input('rcu',          sql.NVarChar, rcu)
      .query(`
        INSERT INTO tbl_types
          (name, image, categoryname, categoryid,
           sectionname, sectionid, menuname, menuid,
           rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (@name, @image, @categoryname, @categoryid,
           @sectionname, @sectionid, @menuname, @menuid,
           @rcu, GETDATE());
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// UPDATE type by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id     = req.body.transid;
    const fields = [
      'name','image','categoryname','categoryid',
      'sectionname','sectionid','menuname','menuid','luu'
    ];
    const updates = [];
    const request = pool.request();

    request.input('transid', sql.VarChar, id);
    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        request.input(f, sql.NVarChar, req.body[f]);
      }
    });
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }
    updates.push('lcm = GETDATE()');

    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_types
      SET ${updates.join(', ')}
      WHERE transid = @transid;
      SELECT @@ROWCOUNT AS affected;
    `);
    if (!result.recordset[0].affected) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE type by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) return res.status(400).json({ message: 'transid required' });
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_types
        WHERE transid = @transid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (!result.recordset[0].affected) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
