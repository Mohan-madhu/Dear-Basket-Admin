const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all categories
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_category;');
    res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET category by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_category WHERE transid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// CREATE category
router.post('/', async (req, res, next) => {
  try {
    const { name, image, sectionid, sectionname, menuname, menuid, rcu } = req.body;
    await poolConnect;
    const result = await pool.request()
      .input('name',        sql.NVarChar, req.body.name)
      .input('image',       sql.NVarChar, req.body.image)
      .input('sectionid',   sql.NVarChar, req.body.sectionid)
      .input('sectionname', sql.NVarChar, req.body.sectionname)
      .input('menuname',    sql.NVarChar, req.body.menuname)
      .input('menuid',      sql.NVarChar, req.body.menuid)
      .input('rcu',         sql.NVarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_category
          (name, image, sectionid, sectionname, menuname, menuid, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@name, @image, @sectionid, @sectionname, @menuname, @menuid, @rcu);
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE category by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id     = req.body.transid;
    const fields = ['name','image','sectionid','sectionname','menuname','menuid','luu'];
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
    const setClause = updates.join(', ') + ', lcm = GETDATE()';

    await poolConnect;
    const result = await request
      .query(`
        UPDATE tbl_category
        SET ${setClause}
        WHERE transid = @transid;
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

// DELETE category by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_category
        WHERE transid = @transid;
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
