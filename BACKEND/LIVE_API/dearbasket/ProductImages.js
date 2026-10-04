const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Product Images
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productimages ORDER BY sortorder ASC, rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all active product images
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productimages WHERE isactive = 1 ORDER BY sortorder ASC, rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET images by product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`SELECT * FROM tbl_productimages 
              WHERE productid = @productid AND isactive = 1 
              ORDER BY sortorder ASC, rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET images by variant ID
router.get('/variant/:variantid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('variantid', sql.VarChar, req.params.variantid)
      .query(`SELECT * FROM tbl_productimages 
              WHERE variantid = @variantid AND isactive = 1 
              ORDER BY sortorder ASC, rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET images with detailed product info (JOIN with products and variants)
router.get('/detailed', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT img.*, p.productname, p.productcode, p.categoryname, 
                     v.variantname, v.sku
              FROM tbl_productimages img
              INNER JOIN tbl_products_new p ON p.productid = img.productid
              LEFT JOIN tbl_productvariants v ON v.variantid = img.variantid
              WHERE img.isactive = 1 AND p.isactive = 1
              ORDER BY img.sortorder ASC, img.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET images by product ID with detailed info
router.get('/detailed/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.productid)
      .query(`SELECT img.*, p.productname, p.productcode, p.categoryname, 
                     v.variantname, v.sku
              FROM tbl_productimages img
              INNER JOIN tbl_products_new p ON p.productid = img.productid
              LEFT JOIN tbl_productvariants v ON v.variantid = img.variantid
              WHERE img.productid = @productid AND img.isactive = 1 AND p.isactive = 1
              ORDER BY img.sortorder ASC, img.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET images by type
router.get('/type/:imagetype', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('imagetype', sql.NVarChar(20), req.params.imagetype)
      .query(`SELECT img.*, p.productname, p.productcode
              FROM tbl_productimages img
              INNER JOIN tbl_products_new p ON p.productid = img.productid
              WHERE img.imagetype = @imagetype AND img.isactive = 1 AND p.isactive = 1
              ORDER BY img.sortorder ASC, img.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET primary/first image for each product
router.get('/primary', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT DISTINCT ON (img.productid) img.*, p.productname, p.productcode
              FROM tbl_productimages img
              INNER JOIN tbl_products_new p ON p.productid = img.productid
              WHERE img.isactive = 1 AND p.isactive = 1
              ORDER BY img.productid, img.sortorder ASC, img.rcm ASC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET image by imageid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_productimages WHERE imageid = @imageid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product image
router.post('/', async (req, res, next) => {
  try {
    const {
      productid,
      variantid,
      imageurl,
      imagetype,
      sortorder,
      isactive,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!productid || !imageurl || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productid, imageurl, and rcu."
      });
    }

    // // Validate URL format (basic validation)
    // const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    // if (!urlPattern.test(imageurl)) {
    //   return res.status(400).json({
    //     message: "Invalid image URL format."
    //   });
    // }

    // const urlPattern = /^~\/Uploads(?:\/[A-Za-z0-9._-]+)*\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i;

    // if (!urlPattern.test(imageurl)) {
    //   return res.status(400).json({
    //     message: "Invalid image URL format. Must be like ~/Uploads/.../file.jpeg"
    //   });
    // }


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

    // Check if variantid exists (if provided)
    if (variantid) {
      const variantCheck = await pool.request()
        .input('variantid', sql.VarChar, variantid)
        .input('productid', sql.VarChar, productid)
        .query(`SELECT COUNT(*) as count FROM tbl_productvariants 
                WHERE variantid = @variantid AND productid = @productid AND isactive = 1;`);

      if (variantCheck.recordset[0].count === 0) {
        return res.status(400).json({
          message: "Variant ID does not exist, is inactive, or does not belong to the specified product."
        });
      }
    }

    // If no sortorder provided, get the next available sortorder for the product
    let finalSortOrder = sortorder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrderResult = await pool.request()
        .input('productid', sql.VarChar, productid)
        .query(`SELECT ISNULL(MAX(sortorder), -1) + 1 as nextOrder 
                FROM tbl_productimages 
                WHERE productid = @productid;`);
      finalSortOrder = maxOrderResult.recordset[0].nextOrder;
    }

    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('variantid', sql.VarChar(sql.MAX), variantid || null)
      .input('imageurl', sql.NVarChar(255), imageurl)
      .input('imagetype', sql.NVarChar(20), imagetype || 'product')
      .input('sortorder', sql.Int, finalSortOrder)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_productimages
          (productid, variantid, imageurl, imagetype, sortorder, isactive, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@productid, @variantid, @imageurl, @imagetype, @sortorder, @isactive, @rcu);
      `);

    res.status(201).json({
      message: "Product image created successfully.",
      image: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product image:", err);
    next(err);
  }
});

// POST - Bulk upload images for a product
router.post('/bulk', async (req, res, next) => {
  let transaction;
  try {
    const { productid, variantid, images, rcu } = req.body;
    // images: [{ imageurl, imagetype?, sortorder? }]

    if (!productid || !images || !Array.isArray(images) || images.length === 0 || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productid, images array, and rcu."
      });
    }

    // Validate all images data
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    for (let img of images) {
      if (!img.imageurl) {
        return res.status(400).json({
          message: "All images must have imageurl."
        });
      }
      if (!urlPattern.test(img.imageurl)) {
        return res.status(400).json({
          message: `Invalid image URL format: ${img.imageurl}`
        });
      }
    }

    await poolConnect;

    // Check if productid exists
    const productCheck = await pool.request()
      .input('productid', sql.VarChar, productid)
      .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');

    if (productCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Product ID does not exist or is inactive."
      });
    }

    // Get starting sortorder
    const maxOrderResult = await pool.request()
      .input('productid', sql.VarChar, productid)
      .query(`SELECT ISNULL(MAX(sortorder), -1) + 1 as nextOrder 
              FROM tbl_productimages 
              WHERE productid = @productid;`);
    let currentSortOrder = maxOrderResult.recordset[0].nextOrder;

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const insertedImages = [];

    for (let img of images) {
      const imgRequest = new sql.Request(transaction);
      const finalSortOrder = img.sortorder !== undefined ? img.sortorder : currentSortOrder++;

      const result = await imgRequest
        .input('productid', sql.VarChar(sql.MAX), productid)
        .input('variantid', sql.VarChar(sql.MAX), variantid || null)
        .input('imageurl', sql.NVarChar(255), img.imageurl)
        .input('imagetype', sql.NVarChar(20), img.imagetype || 'product')
        .input('sortorder', sql.Int, finalSortOrder)
        .input('isactive', sql.Bit, img.isactive !== undefined ? img.isactive : true)
        .input('rcu', sql.VarChar(sql.MAX), rcu)
        .query(`
          INSERT INTO tbl_productimages
            (productid, variantid, imageurl, imagetype, sortorder, isactive, rcu)
          OUTPUT INSERTED.*
          VALUES
            (@productid, @variantid, @imageurl, @imagetype, @sortorder, @isactive, @rcu);
        `);

      insertedImages.push(result.recordset[0]);
    }

    await transaction.commit();

    res.status(201).json({
      message: `${insertedImages.length} product images created successfully.`,
      images: insertedImages
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
    console.error("Error in bulk image upload:", err);
    next(err);
  }
});

// PUT - Update product image
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.imageid;

    if (!id) {
      return res.status(400).json({ message: 'Image ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'productid',
      'variantid',
      'imageurl',
      'imagetype',
      'sortorder',
      'isactive',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input imageid for WHERE clause
    request.input('imageid', sql.VarChar(sql.MAX), id);

    // Validate URL if being updated
    if (req.body.imageurl !== undefined) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(req.body.imageurl)) {
        return res.status(400).json({
          message: "Invalid image URL format."
        });
      }
    }

    // Validate sortorder if being updated
    if (req.body.sortorder !== undefined && (isNaN(parseInt(req.body.sortorder)) || req.body.sortorder < 0)) {
      return res.status(400).json({
        message: "Sort order must be a valid non-negative integer."
      });
    }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
          case 'imageurl':
            request.input(field, sql.NVarChar(255), req.body[field]);
            break;
          case 'imagetype':
            request.input(field, sql.NVarChar(20), req.body[field]);
            break;
          case 'sortorder':
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

    await poolConnect;
    const result = await request.query(`
        UPDATE tbl_productimages
        SET ${setClause}
        WHERE imageid = @imageid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product image not found with the provided ID.' });
    }

    res.json({ message: 'Product image updated successfully.' });

  } catch (err) {
    console.error("Error updating product image:", err);
    next(err);
  }
});

// PUT - Update image status (activate/deactivate)
router.put('/status', async (req, res, next) => {
  try {
    const { imageid, imageurl, isactive, luu } = req.body;

    if (isactive === undefined || !luu) {
      return res.status(400).json({
        message: 'Image ID, isactive status, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar(sql.MAX), imageid)
      .input('imageurl', sql.VarChar(sql.MAX), imageurl)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productimages
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE imageid = @imageid or imageurl = @imageurl;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product image not found.' });
    }

    res.json({
      message: `Product image ${isactive ? 'activated' : 'deactivated'} successfully.`
    });

  } catch (err) {
    console.error("Error updating image status:", err);
    next(err);
  }
});

// PUT - Reorder images for a product
router.put('/reorder', async (req, res, next) => {
  let transaction;
  try {
    const { productid, imageOrders, luu } = req.body;
    // imageOrders: [{ imageid, sortorder }]

    if (!productid || !imageOrders || !Array.isArray(imageOrders) || imageOrders.length === 0 || !luu) {
      return res.status(400).json({
        message: 'Product ID, image orders array, and luu are required.'
      });
    }

    // Validate all image order data
    for (let order of imageOrders) {
      if (!order.imageid || order.sortorder === undefined) {
        return res.status(400).json({
          message: 'Each image order must have imageid and sortorder.'
        });
      }
      if (isNaN(parseInt(order.sortorder)) || order.sortorder < 0) {
        return res.status(400).json({
          message: 'All sort orders must be valid non-negative integers.'
        });
      }
    }

    await poolConnect;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let updatedCount = 0;

    for (let order of imageOrders) {
      const orderRequest = new sql.Request(transaction);
      const result = await orderRequest
        .input('imageid', sql.VarChar(sql.MAX), order.imageid)
        .input('productid', sql.VarChar(sql.MAX), productid)
        .input('sortorder', sql.Int, order.sortorder)
        .input('luu', sql.VarChar(sql.MAX), luu)
        .query(`
          UPDATE tbl_productimages
          SET sortorder = @sortorder, luu = @luu, lcm = GETDATE()
          WHERE imageid = @imageid AND productid = @productid;
          SELECT @@ROWCOUNT AS affected;
        `);

      updatedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({
      message: `Image reordering completed. ${updatedCount} images updated.`
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
    console.error("Error in image reordering:", err);
    next(err);
  }
});

// DELETE - Soft delete (deactivate) image
router.delete('/', async (req, res, next) => {
  try {
    const { imageid, luu } = req.body;

    if (!imageid || !luu) {
      return res.status(400).json({
        message: 'Image ID and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar(sql.MAX), imageid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productimages
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE imageid = @imageid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product image not found.' });
    }

    res.json({ message: 'Product image deactivated successfully.' });

  } catch (err) {
    console.error("Error deactivating product image:", err);
    next(err);
  }
});

// DELETE - Hard delete image (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { imageid } = req.body;

    if (!imageid) {
      return res.status(400).json({ message: 'Image ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('imageid', sql.VarChar(sql.MAX), imageid)
      .query(`
        DELETE FROM tbl_productimages
        WHERE imageid = @imageid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product image not found.' });
    }

    res.json({ message: 'Product image deleted permanently.' });

  } catch (err) {
    console.error("Error deleting product image permanently:", err);
    next(err);
  }
});

// DELETE - Delete all images for a product
router.delete('/product', async (req, res, next) => {
  try {
    const { productid, luu, permanent } = req.body;

    if (!productid || !luu) {
      return res.status(400).json({
        message: 'Product ID and luu are required.'
      });
    }

    await poolConnect;
    let query, message;

    if (permanent) {
      query = `
        DELETE FROM tbl_productimages
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `;
      message = 'All product images deleted permanently.';
    } else {
      query = `
        UPDATE tbl_productimages
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `;
      message = 'All product images deactivated successfully.';
    }

    const request = pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid);

    if (!permanent) {
      request.input('luu', sql.VarChar(sql.MAX), luu);
    }

    const result = await request.query(query);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'No images found for this product.' });
    }

    res.json({
      message: message,
      affectedRows: result.recordset[0].affected
    });

  } catch (err) {
    console.error("Error deleting product images:", err);
    next(err);
  }
});

module.exports = router;