const express = require('express');
const router  = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all sections
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_section;');
     res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET section by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_section WHERE menuid = @transid;');
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
   res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// CREATE section
router.post('/', async (req, res, next) => {
  try {
    const { name, image, menuname, menuid, rcu } = req.body;
    await poolConnect;
    const result = await pool.request()
      .input('name',     sql.NVarChar, name)
      .input('image',    sql.NVarChar, image)
      .input('menuname', sql.NVarChar, menuname)
      .input('menuid',   sql.NVarChar, menuid)
      .input('rcu',      sql.NVarChar, rcu)
      .query(`
        INSERT INTO tbl_section
          ([name], image, menuname, menuid, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@name, @image, @menuname, @menuid, @rcu);
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// UPDATE section by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id     = req.body.transid;
    const fields = ['name','image','menuname','menuid','luu'];
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
      UPDATE tbl_section
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

// DELETE section by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) return res.status(400).json({ message: 'transid required' });
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_section
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
