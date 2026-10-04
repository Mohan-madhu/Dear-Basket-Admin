const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Product Attributes
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productattributes ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET attributes by product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`SELECT * FROM tbl_productattributes 
              WHERE productid = @productid 
              ORDER BY displayorder ASC, rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET attributes with detailed product info (JOIN with products table)
router.get('/detailed', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT a.*, p.productname, p.productcode, p.categoryname, p.typename
              FROM tbl_productattributes a
              INNER JOIN tbl_products_new p ON p.productid = a.productid
              WHERE p.isactive = 1
              ORDER BY a.displayorder ASC, a.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET attributes by product ID with detailed info
router.get('/detailed/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`SELECT a.*, p.productname, p.productcode, p.categoryname, p.typename
              FROM tbl_productattributes a
              INNER JOIN tbl_products_new p ON p.productid = a.productid
              WHERE a.productid = @productid AND p.isactive = 1
              ORDER BY a.displayorder ASC, a.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET attribute by attributeid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('attributeid', sql.VarChar(sql.MAX), req.params.id)
      .query('SELECT * FROM tbl_productattributes WHERE attributeid = @attributeid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET attributes by attribute name
router.get('/name/:attributename', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('attributename', sql.NVarChar(100), req.params.attributename)
      .query(`SELECT a.*, p.productname, p.productcode
              FROM tbl_productattributes a
              INNER JOIN tbl_products_new p ON p.productid = a.productid
              WHERE a.attributename = @attributename AND p.isactive = 1
              ORDER BY a.displayorder ASC, a.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// SEARCH attributes by name or value
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT a.*, p.productname, p.productcode
              FROM tbl_productattributes a
              INNER JOIN tbl_products_new p ON p.productid = a.productid
              WHERE (a.attributename LIKE @searchTerm 
                 OR a.attributevalue LIKE @searchTerm
                 OR p.productname LIKE @searchTerm) 
                AND p.isactive = 1
              ORDER BY a.displayorder ASC, a.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product attribute
router.post('/', async (req, res, next) => {
  try {
    const {
      attributeid,
      productid,
      attributename,
      attributevalue,
      displayorder,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!productid || !attributename || !attributevalue || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productid, attributename, attributevalue, and rcu."
      });
    }

    // Validate attribute name and value length
    if (attributename.length > 100) {
      return res.status(400).json({
        message: "Attribute name cannot exceed 100 characters."
      });
    }

    if (attributevalue.length > 255) {
      return res.status(400).json({
        message: "Attribute value cannot exceed 255 characters."
      });
    }

    // Check if productid exists
    await poolConnect;
    const productCheck = await pool.request()
      .input('productid', sql.VarChar, productid)
      .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
    
    if (productCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Product ID does not exist or is inactive."
      });
    }

    // Check for duplicate attribute name for the same product (only if attributeid is not provided)
    if (!attributeid) {
      const duplicateCheck = await pool.request()
        .input('productid', sql.VarChar(sql.MAX), productid)
        .input('attributename', sql.NVarChar(100), attributename)
        .query(`SELECT COUNT(*) as count FROM tbl_productattributes 
                WHERE productid = @productid AND attributename = @attributename;`);
      
      if (duplicateCheck.recordset[0].count > 0) {
        return res.status(400).json({
          message: "Attribute name already exists for this product. Please use a unique attribute name."
        });
      }
    }if (duplicateCheck.recordset[0].count > 0) {
      return res.status(400).json({
        message: "Attribute name already exists for this product. Please use a unique attribute name."
      });
    }

    // Generate unique attributeid if not provided
    const generatedAttributeId = attributeid || `ATTR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.request()
      .input('attributeid', sql.VarChar(sql.MAX), generatedAttributeId)
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('attributename', sql.NVarChar(100), attributename)
      .input('attributevalue', sql.NVarChar(255), attributevalue)
      .input('displayorder', sql.Int, displayorder || null)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_productattributes
          (attributeid, productid, attributename, attributevalue, displayorder, rcu, rcm)
        VALUES
          (@attributeid, @productid, @attributename, @attributevalue, @displayorder, @rcu, GETDATE());
        
        SELECT * FROM tbl_productattributes WHERE attributeid = @attributeid;
      `);

    res.status(201).json({
      message: "Product attribute created successfully.",
      attribute: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product attribute:", err);
    next(err);
  }
});

// PUT - Update product attribute
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.attributeid;

    if (!id) {
      return res.status(400).json({ message: 'Attribute ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'productid',
      'attributename',
      'attributevalue',
      'displayorder',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input attributeid for WHERE clause
    request.input('attributeid', sql.VarChar(sql.MAX), id);

    // Validate attribute name and value length if being updated
    if (req.body.attributename && req.body.attributename.length > 100) {
      return res.status(400).json({
        message: "Attribute name cannot exceed 100 characters."
      });
    }

    if (req.body.attributevalue && req.body.attributevalue.length > 255) {
      return res.status(400).json({
        message: "Attribute value cannot exceed 255 characters."
      });
    }

    // Check for duplicate attribute name if being updated
    if (req.body.attributename !== undefined) {
      await poolConnect;
      
      // Get current productid to check for duplicates
      const currentRecord = await pool.request()
        .input('attributeid', sql.VarChar(sql.MAX), id)
        .query('SELECT productid FROM tbl_productattributes WHERE attributeid = @attributeid;');
      
      if (currentRecord.recordset.length === 0) {
        return res.status(404).json({ message: 'Product attribute not found.' });
      }

      const currentProductId = req.body.productid || currentRecord.recordset[0].productid;

      const duplicateCheck = await pool.request()
        .input('productid', sql.VarChar, currentProductId)
        .input('attributename', sql.NVarChar(100), req.body.attributename)
        .input('attributeid', sql.VarChar(sql.MAX), id)
        .query(`SELECT COUNT(*) as count FROM tbl_productattributes 
                WHERE productid = @productid AND attributename = @attributename AND attributeid != @attributeid;`);
      
      if (duplicateCheck.recordset[0].count > 0) {
        return res.status(400).json({
          message: "Attribute name already exists for this product. Please use a unique attribute name."
        });
      }
    }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
          case 'attributename':
            request.input(field, sql.NVarChar(100), req.body[field]);
            break;
          case 'attributevalue':
            request.input(field, sql.NVarChar(255), req.body[field]);
            break;
          case 'displayorder':
            request.input(field, sql.Int, req.body[field]);
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

    await poolConnect;
    const result = await request.query(`
        UPDATE tbl_productattributes
        SET ${setClause}
        WHERE attributeid = @attributeid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product attribute not found with the provided ID.' });
    }

    res.json({ message: 'Product attribute updated successfully.' });

  } catch (err) {
    console.error("Error updating product attribute:", err);
    next(err);
  }
});

// PUT - Update display order for multiple attributes
router.put('/displayorder', async (req, res, next) => {
  let transaction;
  try {
    const { attributes, luu } = req.body; // attributes: [{ attributeid, displayorder }]

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0 || !luu) {
      return res.status(400).json({ 
        message: 'Attributes array and luu are required.' 
      });
    }

    // Validate all attributes data
    for (let attr of attributes) {
      if (!attr.attributeid || attr.displayorder === undefined) {
        return res.status(400).json({
          message: 'Each attribute must have attributeid and displayorder.'
        });
      }
      if (isNaN(parseInt(attr.displayorder)) || attr.displayorder < 0) {
        return res.status(400).json({
          message: 'All display orders must be valid non-negative integers.'
        });
      }
    }

    await poolConnect;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let updatedCount = 0;

    for (let attr of attributes) {
      const orderRequest = new sql.Request(transaction);
      const result = await orderRequest
        .input('attributeid', sql.VarChar(sql.MAX), attr.attributeid)
        .input('displayorder', sql.Int, attr.displayorder)
        .input('luu', sql.VarChar(sql.MAX), luu)
        .query(`
          UPDATE tbl_productattributes
          SET displayorder = @displayorder, luu = @luu, lcm = GETDATE()
          WHERE attributeid = @attributeid;
          SELECT @@ROWCOUNT AS affected;
        `);

      updatedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({ 
      message: `Display order update completed. ${updatedCount} attributes updated.` 
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.error("Transaction rolled back due to error:", err);
      } catch (rollbackErr) {
        console.error("Error during transaction rollback:", rollbackErr);
      }
    }
    console.error("Error in display order update:", err);
    next(err);
  }
});

// PUT - Bulk update attributes for a product
router.put('/bulk', async (req, res, next) => {
  let transaction;
  try {
    const { productid, attributes, luu } = req.body; // attributes: [{ attributeid?, attributename, attributevalue, displayorder? }]

    if (!productid || !attributes || !Array.isArray(attributes) || attributes.length === 0 || !luu) {
      return res.status(400).json({ 
        message: 'Product ID, attributes array, and luu are required.' 
      });
    }

    // Validate product exists
    await poolConnect;
    const productCheck = await pool.request()
      .input('productid', sql.VarChar, productid)
      .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
    
    if (productCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Product ID does not exist or is inactive."
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let processedCount = 0;

    for (let attr of attributes) {
      if (!attr.attributename || !attr.attributevalue) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'Each attribute must have attributename and attributevalue.'
        });
      }

      const bulkRequest = new sql.Request(transaction);
      
      if (attr.attributeid) {
        // Update existing attribute
        const result = await bulkRequest
          .input('attributeid', sql.VarChar(sql.MAX), attr.attributeid)
          .input('attributename', sql.NVarChar(100), attr.attributename)
          .input('attributevalue', sql.NVarChar(255), attr.attributevalue)
          .input('displayorder', sql.Int, attr.displayorder || 1)
          .input('luu', sql.VarChar(sql.MAX), luu)
          .query(`
            UPDATE tbl_productattributes
            SET attributename = @attributename, attributevalue = @attributevalue, 
                displayorder = @displayorder, luu = @luu, lcm = GETDATE()
            WHERE attributeid = @attributeid;
            SELECT @@ROWCOUNT AS affected;
          `);
        processedCount += result.recordset[0].affected;
      } else {
        // Insert new attribute
        await bulkRequest
          .input('productid', sql.VarChar(sql.MAX), productid)
          .input('attributename', sql.NVarChar(100), attr.attributename)
          .input('attributevalue', sql.NVarChar(255), attr.attributevalue)
          .input('displayorder', sql.Int, attr.displayorder || 1)
          .input('rcu', sql.VarChar(sql.MAX), luu)
          .query(`
            INSERT INTO tbl_productattributes
              (productid, attributename, attributevalue, displayorder, rcu, rcm)
            VALUES
              (@productid, @attributename, @attributevalue, @displayorder, @rcu, GETDATE());
          `);
        processedCount++;
      }
    }

    await transaction.commit();

    res.json({ 
      message: `Bulk attribute update completed. ${processedCount} attributes processed.` 
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.error("Transaction rolled back due to error:", err);
      } catch (rollbackErr) {
        console.error("Error during transaction rollback:", rollbackErr);
      }
    }
    console.error("Error in bulk attribute update:", err);
    next(err);
  }
});

// DELETE - Delete attribute
router.delete('/', async (req, res, next) => {
  try {
    const { attributeid } = req.body;

    if (!attributeid) {
      return res.status(400).json({ 
        message: 'Attribute ID is required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('attributeid', sql.VarChar(sql.MAX), attributeid)
      .query(`
        DELETE FROM tbl_productattributes
        WHERE attributeid = @attributeid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product attribute not found.' });
    }

    res.json({ message: 'Product attribute deleted successfully.' });

  } catch (err) {
    console.error("Error deleting product attribute:", err);
    next(err);
  }
});

// DELETE - Delete all attributes for a product
router.delete('/product', async (req, res, next) => {
  try {
    const { productid } = req.body;

    if (!productid) {
      return res.status(400).json({ 
        message: 'Product ID is required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .query(`
        DELETE FROM tbl_productattributes
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} product attributes deleted successfully.` 
    });

  } catch (err) {
    console.error("Error deleting product attributes:", err);
    next(err);
  }
});

// DELETE - Bulk delete multiple attributes
router.delete('/bulk', async (req, res, next) => {
  let transaction;
  try {
    const { attributeids } = req.body; // attributeids: [id1, id2, id3...]

    if (!attributeids || !Array.isArray(attributeids) || attributeids.length === 0) {
      return res.status(400).json({ 
        message: 'Attribute IDs array is required.' 
      });
    }

    await poolConnect;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let deletedCount = 0;

    for (let attributeid of attributeids) {
      const deleteRequest = new sql.Request(transaction);
      const result = await deleteRequest
        .input('attributeid', sql.VarChar(sql.MAX), attributeid)
        .query(`
          DELETE FROM tbl_productattributes
          WHERE attributeid = @attributeid;
          SELECT @@ROWCOUNT AS affected;
        `);

      deletedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({ 
      message: `Bulk delete completed. ${deletedCount} attributes deleted.` 
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.error("Transaction rolled back due to error:", err);
      } catch (rollbackErr) {
        console.error("Error during transaction rollback:", rollbackErr);
      }
    }
    console.error("Error in bulk delete:", err);
    next(err);
  }
});

module.exports = router;