const express = require('express');
const router  = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// type‐map for dynamic binding
const typeMap = {
  transid:          sql.VarChar,
  image:            sql.NVarChar,
  imageid:          sql.VarChar,
  name:             sql.NVarChar,
  description:      sql.NVarChar,
  quantity:         sql.NVarChar,
  stock:            sql.Int,
  instock:          sql.Int,
  price:            sql.Decimal(18,2),
  discount:         sql.Decimal(5,2),
  rating:           sql.Decimal(3,2),
  linkedproductsid: sql.VarChar,
  typename:         sql.NVarChar,
  typeid:           sql.VarChar,
  categoryname:     sql.NVarChar,
  categoryid:       sql.VarChar,
  sectionname:      sql.NVarChar,
  sectionid:        sql.VarChar,
  menuname:         sql.NVarChar,
  menuid:           sql.VarChar,
  rcu:              sql.NVarChar,
  luu:              sql.NVarChar
};

// GET all
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_products ORDER BY rcm DESC;');
      res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_products WHERE transid = @transid ORDER BY rcm DESC;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
       res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET by typeid
router.get('/Type/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('typeid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_products WHERE typeid = @typeid ORDER BY rcm DESC;');
      res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// GET related by categoryid
router.get('/RelatedProducts/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('categoryid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_products WHERE categoryid = @categoryid ORDER BY transid DESC;');
     res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});

// CREATE
router.post('/', async (req, res, next) => {
  try {
    const fields = Object.keys(typeMap).filter(f => req.body[f] != null);
    if (!fields.length) {
      return res.status(400).json({ message: 'No product data provided' });
    }
    const request = pool.request();
    fields.forEach(f => request.input(f, typeMap[f], req.body[f]));
    const cols   = fields.join(','),
          vals   = fields.map(f => `@${f}`).join(',');
    await poolConnect;
    const result = await request.query(`
      INSERT INTO tbl_products (${cols})
      OUTPUT INSERTED.*
      VALUES (${vals});
    `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id       = req.body.transid;
    const fields   = Object.keys(typeMap).filter(f => f!=='transid' && req.body[f]!=null);
    if (!id || !fields.length) {
      return res.status(400).json({ message: 'transid + at least one field required' });
    }
    const request  = pool.request().input('transid', sql.VarChar, id);
    fields.forEach(f => request.input(f, typeMap[f], req.body[f]));
    const sets     = fields.map(f => `${f} = @${f}`);
    sets.push('lum = DATEADD(MINUTE, 330, GETUTCDATE())');
    await poolConnect;
    const result   = await request.query(`
      UPDATE tbl_products
      SET ${sets.join(', ')}
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

// DELETE by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) {
      return res.status(400).json({ message: 'transid required' });
    }
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_products
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
