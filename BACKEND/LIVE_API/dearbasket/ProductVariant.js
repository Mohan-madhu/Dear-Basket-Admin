const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

const normalizeSku = (value) => {
  const sku = String(value ?? '').trim();
  if (!sku || sku.toLowerCase() === 'no sku') return null;
  return sku;
};

// GET all Product Variants
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productvariants ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all active product variants
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productvariants WHERE isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET variants by product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`
        SELECT *
        FROM tbl_productvariants
        WHERE productid = @productid AND isactive = 1
        ORDER BY rcm DESC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET variants with detailed product info
router.get('/detailed', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`
        SELECT v.*, p.productname, p.productcode, p.categoryname, p.typename
        FROM tbl_productvariants v
        INNER JOIN tbl_products_new p ON p.productid = v.productid
        WHERE v.isactive = 1 AND p.isactive = 1
        ORDER BY v.rcm DESC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET variants by product ID with detailed info
router.get('/detailed/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`
        SELECT v.*, p.productname, p.productcode, p.categoryname, p.typename
        FROM tbl_productvariants v
        INNER JOIN tbl_products_new p ON p.productid = v.productid
        WHERE v.productid = @productid AND v.isactive = 1 AND p.isactive = 1
        ORDER BY v.rcm DESC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET low stock variants
router.get('/lowstock', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`
        SELECT v.*, p.productname, p.productcode
        FROM tbl_productvariants v
        INNER JOIN tbl_products_new p ON p.productid = v.productid
        WHERE v.stockquantity <= v.minstocklevel AND v.isactive = 1
        ORDER BY v.stockquantity ASC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET variant by SKU - keep before /:id
router.get('/sku/:sku', async (req, res, next) => {
  try {
    await poolConnect;
    const sku = normalizeSku(req.params.sku);

    if (!sku) {
      return res.json({ Response: [] });
    }

    const result = await pool.request()
      .input('sku', sql.NVarChar(50), sku)
      .query('SELECT * FROM tbl_productvariants WHERE sku = @sku;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// SEARCH variants by name or SKU - keep before /:id
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`
        SELECT v.*, p.productname, p.productcode
        FROM tbl_productvariants v
        INNER JOIN tbl_products_new p ON p.productid = v.productid
        WHERE (
            v.variantname LIKE @searchTerm
            OR v.sku LIKE @searchTerm
            OR p.productname LIKE @searchTerm
          )
          AND v.isactive = 1
          AND p.isactive = 1
        ORDER BY v.rcm DESC;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET variant by variantid - keep after /sku and /search
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('variantid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_productvariants WHERE variantid = @variantid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product variant
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;

    const {
      productid,
      variantname,
      weight,
      dimensions,
      packsize,
      baseprice,
      sellingprice,
      discountpercentage,
      stockquantity,
      minstocklevel,
      maxorderquantity,
      isactive,
      rcu,
    } = req.body;

    const sku = normalizeSku(req.body.sku);

    if (!productid || baseprice === undefined || sellingprice === undefined || !rcu) {
      return res.status(400).json({
        message: 'Missing required fields. Please provide productid, baseprice, sellingprice, and rcu.',
      });
    }

    if (isNaN(parseFloat(baseprice)) || isNaN(parseFloat(sellingprice))) {
      return res.status(400).json({
        message: 'Base price and selling price must be valid numbers.',
      });
    }

    if (parseFloat(baseprice) < 0 || parseFloat(sellingprice) < 0) {
      return res.status(400).json({
        message: 'Prices cannot be negative.',
      });
    }

    if (sku) {
      const checkResult = await pool.request()
        .input('sku', sql.NVarChar(50), sku)
        .query(`
          SELECT COUNT(*) as count
          FROM tbl_productvariants
          WHERE sku = @sku;
        `);

      if (checkResult.recordset[0].count > 0) {
        return res.status(400).json({
          message: 'SKU already exists. Please use a unique SKU.',
        });
      }
    }

    const productCheck = await pool.request()
      .input('productid', sql.VarChar, productid)
      .query(`
        SELECT COUNT(*) as count
        FROM tbl_products_new
        WHERE productid = @productid AND isactive = 1;
      `);

    if (productCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: 'Product ID does not exist or is inactive.',
      });
    }

    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('variantname', sql.NVarChar(100), variantname || null)
      .input('sku', sql.NVarChar(50), sku)
      .input('weight', sql.Decimal(10, 2), weight || null)
      .input('dimensions', sql.NVarChar(50), dimensions || null)
      .input('packsize', sql.Int, packsize !== undefined ? packsize : 1)
      .input('baseprice', sql.Decimal(10, 2), baseprice)
      .input('sellingprice', sql.Decimal(10, 2), sellingprice)
      .input('discountpercentage', sql.Decimal(5, 2), discountpercentage !== undefined ? discountpercentage : 0)
      .input('stockquantity', sql.Int, stockquantity !== undefined ? stockquantity : 0)
      .input('minstocklevel', sql.Int, minstocklevel !== undefined ? minstocklevel : 5)
      .input('maxorderquantity', sql.Int, maxorderquantity !== undefined ? maxorderquantity : 10)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_productvariants
          (productid, variantname, sku, weight, dimensions, packsize, baseprice, sellingprice,
           discountpercentage, stockquantity, minstocklevel, maxorderquantity, isactive, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@productid, @variantname, @sku, @weight, @dimensions, @packsize, @baseprice, @sellingprice,
           @discountpercentage, @stockquantity, @minstocklevel, @maxorderquantity, @isactive, @rcu);
      `);

    res.status(201).json({
      message: 'Product variant created successfully.',
      variant: result.recordset[0],
    });
  } catch (err) {
    console.error('Error creating product variant:', err);
    next(err);
  }
});

// PUT - Update product variant
router.put('/', async (req, res, next) => {
  try {
    await poolConnect;

    const id = req.body.variantid;

    if (!id) {
      return res.status(400).json({ message: 'Variant ID is required.' });
    }

    const allowedFields = [
      'productid',
      'variantname',
      'sku',
      'weight',
      'dimensions',
      'packsize',
      'baseprice',
      'sellingprice',
      'discountpercentage',
      'stockquantity',
      'minstocklevel',
      'maxorderquantity',
      'isactive',
      'luu',
    ];

    const normalizedSku =
      Object.prototype.hasOwnProperty.call(req.body, 'sku')
        ? normalizeSku(req.body.sku)
        : undefined;

    if (normalizedSku) {
      const checkResult = await pool.request()
        .input('sku', sql.NVarChar(50), normalizedSku)
        .input('variantid', sql.VarChar(sql.MAX), id)
        .query(`
          SELECT COUNT(*) as count
          FROM tbl_productvariants
          WHERE sku = @sku
            AND variantid <> @variantid;
        `);

      if (checkResult.recordset[0].count > 0) {
        return res.status(400).json({
          message: 'SKU already exists. Please use a unique SKU.',
        });
      }
    }

    if (normalizedSku === null) {
      req.body.sku = null;
    } else if (normalizedSku !== undefined) {
      req.body.sku = normalizedSku;
    }

    if (
      req.body.baseprice !== undefined &&
      (isNaN(parseFloat(req.body.baseprice)) || parseFloat(req.body.baseprice) < 0)
    ) {
      return res.status(400).json({ message: 'Base price must be a valid positive number.' });
    }

    if (
      req.body.sellingprice !== undefined &&
      (isNaN(parseFloat(req.body.sellingprice)) || parseFloat(req.body.sellingprice) < 0)
    ) {
      return res.status(400).json({ message: 'Selling price must be a valid positive number.' });
    }

    const updates = [];
    const request = pool.request();

    request.input('variantid', sql.VarChar(sql.MAX), id);

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        switch (field) {
          case 'variantname':
            request.input(field, sql.NVarChar(100), req.body[field]);
            break;
          case 'sku':
            request.input(field, sql.NVarChar(50), req.body[field]);
            break;
          case 'weight':
          case 'baseprice':
          case 'sellingprice':
            request.input(field, sql.Decimal(10, 2), req.body[field]);
            break;
          case 'discountpercentage':
            request.input(field, sql.Decimal(5, 2), req.body[field]);
            break;
          case 'dimensions':
            request.input(field, sql.NVarChar(50), req.body[field]);
            break;
          case 'packsize':
          case 'stockquantity':
          case 'minstocklevel':
          case 'maxorderquantity':
            request.input(field, sql.Int, req.body[field]);
            break;
          case 'isactive':
            request.input(field, sql.Bit, req.body[field]);
            break;
          default:
            request.input(field, sql.VarChar(sql.MAX), req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ') + ', lcm = GETDATE()';

    const result = await request.query(`
      UPDATE tbl_productvariants
      SET ${setClause}
      WHERE variantid = @variantid;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        message: 'Product variant not found with the provided ID.',
      });
    }

    res.json({ message: 'Product variant updated successfully.' });
  } catch (err) {
    console.error('Error updating product variant:', err);
    next(err);
  }
});

// PUT - Update stock quantity
router.put('/stock', async (req, res, next) => {
  try {
    await poolConnect;

    const { variantid, stockquantity, luu } = req.body;

    if (!variantid || stockquantity === undefined || !luu) {
      return res.status(400).json({
        message: 'Variant ID, stock quantity, and luu are required.',
      });
    }

    if (isNaN(parseInt(stockquantity, 10)) || parseInt(stockquantity, 10) < 0) {
      return res.status(400).json({
        message: 'Stock quantity must be a valid non-negative integer.',
      });
    }

    const result = await pool.request()
      .input('variantid', sql.VarChar(sql.MAX), variantid)
      .input('stockquantity', sql.Int, stockquantity)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productvariants
        SET stockquantity = @stockquantity, luu = @luu, lcm = GETDATE()
        WHERE variantid = @variantid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product variant not found.' });
    }

    res.json({ message: 'Stock quantity updated successfully.' });
  } catch (err) {
    console.error('Error updating stock quantity:', err);
    next(err);
  }
});

// PUT - Update variant status
router.put('/status', async (req, res, next) => {
  try {
    await poolConnect;

    const { variantid, isactive, luu } = req.body;

    if (!variantid || isactive === undefined || !luu) {
      return res.status(400).json({
        message: 'Variant ID, isactive status, and luu are required.',
      });
    }

    const result = await pool.request()
      .input('variantid', sql.VarChar(sql.MAX), variantid)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productvariants
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE variantid = @variantid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product variant not found.' });
    }

    res.json({
      message: `Product variant ${isactive ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (err) {
    console.error('Error updating variant status:', err);
    next(err);
  }
});

// PUT - Bulk stock update for multiple variants
router.put('/bulkstock', async (req, res, next) => {
  let transaction;

  try {
    await poolConnect;

    const { variants, luu } = req.body;

    if (!variants || !Array.isArray(variants) || variants.length === 0 || !luu) {
      return res.status(400).json({
        message: 'Variants array and luu are required.',
      });
    }

    for (const variant of variants) {
      if (!variant.variantid || variant.stockquantity === undefined) {
        return res.status(400).json({
          message: 'Each variant must have variantid and stockquantity.',
        });
      }

      if (
        isNaN(parseInt(variant.stockquantity, 10)) ||
        parseInt(variant.stockquantity, 10) < 0
      ) {
        return res.status(400).json({
          message: 'All stock quantities must be valid non-negative integers.',
        });
      }
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let updatedCount = 0;

    for (const variant of variants) {
      const stockRequest = new sql.Request(transaction);
      const result = await stockRequest
        .input('variantid', sql.VarChar(sql.MAX), variant.variantid)
        .input('stockquantity', sql.Int, variant.stockquantity)
        .input('luu', sql.VarChar(sql.MAX), luu)
        .query(`
          UPDATE tbl_productvariants
          SET stockquantity = @stockquantity, luu = @luu, lcm = GETDATE()
          WHERE variantid = @variantid;

          SELECT @@ROWCOUNT AS affected;
        `);

      updatedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({
      message: `Bulk stock update completed. ${updatedCount} variants updated.`,
    });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error during transaction rollback:', rollbackErr);
      }
    }

    console.error('Error in bulk stock update:', err);
    next(err);
  }
});

// DELETE - Soft delete variant
router.delete('/', async (req, res, next) => {
  try {
    await poolConnect;

    const { variantid, luu } = req.body;

    if (!variantid || !luu) {
      return res.status(400).json({
        message: 'Variant ID and luu are required.',
      });
    }

    const result = await pool.request()
      .input('variantid', sql.VarChar(sql.MAX), variantid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productvariants
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE variantid = @variantid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product variant not found.' });
    }

    res.json({ message: 'Product variant deactivated successfully.' });
  } catch (err) {
    console.error('Error deactivating product variant:', err);
    next(err);
  }
});

// DELETE - Hard delete variant
router.delete('/permanent', async (req, res, next) => {
  try {
    await poolConnect;

    const { variantid } = req.body;

    if (!variantid) {
      return res.status(400).json({ message: 'Variant ID is required.' });
    }

    const result = await pool.request()
      .input('variantid', sql.VarChar(sql.MAX), variantid)
      .query(`
        DELETE FROM tbl_productvariants
        WHERE variantid = @variantid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product variant not found.' });
    }

    res.json({ message: 'Product variant deleted permanently.' });
  } catch (err) {
    console.error('Error deleting product variant permanently:', err);
    next(err);
  }
});

module.exports = router;