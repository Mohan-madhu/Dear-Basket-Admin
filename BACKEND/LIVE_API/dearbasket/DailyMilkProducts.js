const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

const selectDailyMilkProductsSql = `
  SELECT
    transid,
    name,
    price,
    quantity,
    image,
    increment,
    rcu,
    rcm,
    luu,
    lum,
    ISNULL(minimumquantity, ISNULL(increment, 0.50)) AS minimumquantity
  FROM tbl_dailymilkproducts
`;

// GET all DailyMilkProducts
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      ${selectDailyMilkProductsSql}
      ORDER BY rcm DESC;
    `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query(`
        ${selectDailyMilkProductsSql}
        WHERE transid = @transid;
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE product
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      price,
      quantity,
      image,
      increment,
      minimumquantity,
      rcu,
    } = req.body;

    if (!name || price === undefined || increment === undefined || !rcu) {
      return res.status(400).json({
        message: 'Missing required fields. Please provide name, price, increment, and rcu.',
      });
    }

    const priceValue = Number(price);
    const incrementValue = Number(increment);
    const minimumQuantityValue = Number(minimumquantity ?? increment ?? 0.5);

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      return res.status(400).json({ message: 'Price must be a valid number greater than zero.' });
    }

    if (!Number.isFinite(incrementValue) || incrementValue <= 0) {
      return res.status(400).json({ message: 'Increment must be a valid number greater than zero.' });
    }

    if (!Number.isFinite(minimumQuantityValue) || minimumQuantityValue <= 0) {
      return res.status(400).json({ message: 'Minimum quantity must be a valid number greater than zero.' });
    }

    await poolConnect;

    const result = await pool.request()
      .input('name', sql.NVarChar(200), name)
      .input('price', sql.Decimal(10, 2), priceValue)
      .input('quantity', sql.NVarChar(50), quantity || 'litre')
      .input('image', sql.NVarChar(sql.MAX), image || null)
      .input('increment', sql.Decimal(10, 2), incrementValue)
      .input('minimumquantity', sql.Decimal(10, 2), minimumQuantityValue)
      .input('rcu', sql.NVarChar(100), rcu)
      .query(`
        INSERT INTO tbl_dailymilkproducts
          (name, price, quantity, image, increment, minimumquantity, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@name, @price, @quantity, @image, @increment, @minimumquantity, @rcu);
      `);

    res.status(201).json(result.recordset);
  } catch (err) {
    console.error('Error inserting daily milk product:', err);
    next(err);
  }
});

// UPDATE product by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.transid;

    if (!id) {
      return res.status(400).json({ message: 'transid is required.' });
    }

    const allowedFields = [
      'name',
      'price',
      'quantity',
      'image',
      'increment',
      'minimumquantity',
      'luu',
    ];

    const decimalFields = new Set(['price', 'increment', 'minimumquantity']);
    const updates = [];
    const request = pool.request();

    request.input('transid', sql.VarChar, id);

    allowedFields.forEach((field) => {
      if (req.body[field] === undefined) return;

      updates.push(`${field} = @${field}`);

      if (decimalFields.has(field)) {
        const value = Number(req.body[field]);
        request.input(field, sql.Decimal(10, 2), Number.isFinite(value) ? value : 0);
      } else if (field === 'image') {
        request.input(field, sql.NVarChar(sql.MAX), req.body[field]);
      } else {
        request.input(field, sql.NVarChar(200), req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    await poolConnect;

    const result = await request.query(`
      UPDATE tbl_dailymilkproducts
      SET ${setClause}
      WHERE transid = @transid;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        message: 'Daily milk product not found with the provided transid.',
      });
    }

    res.json({ message: 'Daily milk product updated successfully.' });
  } catch (err) {
    console.error('Error updating daily milk product:', err);
    next(err);
  }
});

// DELETE product by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;

    if (!id) {
      return res.status(400).json({ message: 'transid is required.' });
    }

    await poolConnect;

    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dailymilkproducts
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