const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all menus
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_menu;');
      res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET menu by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_menu WHERE transid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
      res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// CREATE menu
router.post('/', async (req, res, next) => {
  try {
    const {
      name, image, startcolor,
      endcolor, background, icon, rcu
    } = req.body;
    await poolConnect;
    const result = await pool.request()
      .input('name',       sql.NVarChar, name)
      .input('image',      sql.NVarChar, image)
      .input('startcolor', sql.NVarChar, startcolor)
      .input('endcolor',   sql.NVarChar, endcolor)
      .input('background', sql.NVarChar, background)
      .input('icon',       sql.NVarChar, icon)
      .input('rcu',        sql.NVarChar, rcu)
      .query(`
        INSERT INTO tbl_menu
          (Name, Image, startcolor, endcolor, Background, icon, Rcu)
        OUTPUT INSERTED.*
        VALUES
          (@name, @image, @startcolor, @endcolor, @background, @icon, @rcu);
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE menu by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id     = req.body.transid;
    const fields = ['name','image','background','startcolor','endcolor','icon','luu'];
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
    const result = await request.query(`
      UPDATE tbl_menu
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

// DELETE menu by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_menu
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
