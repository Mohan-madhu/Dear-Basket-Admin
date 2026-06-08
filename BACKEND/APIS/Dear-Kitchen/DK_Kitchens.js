const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');


// ======================================================
// CREATE KITCHEN
// ======================================================
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()

      // BASIC
      .input('partneruserid', sql.VarChar, req.body.partneruserid)
      .input('kitchenname', sql.NVarChar(100), req.body.kitchenname)
      .input('description', sql.NVarChar(500), req.body.description)
      .input('cuisinetype', sql.NVarChar(100), req.body.cuisinetype)

      // NEW FIELDS
      .input('cookgender', sql.VarChar(36), req.body.cookgender)
      .input('fssainumber', sql.NVarChar(100), req.body.fssainumber)

      // IMAGES
      .input('profileimage', sql.NVarChar(500), req.body.profileimage)
      .input('coverimage', sql.NVarChar(500), req.body.coverimage)

      // ADDRESS
      .input('address', sql.NVarChar(200), req.body.address)
      .input('city', sql.NVarChar(100), req.body.city)
      .input('state', sql.NVarChar(100), req.body.state)
      .input('pincode', sql.NVarChar(10), req.body.pincode)

      // LOCATION
      .input('latitude', sql.VarChar(50), req.body.latitude)
      .input('longitude', sql.VarChar(50), req.body.longitude)

      // STATUS
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('isapproved', sql.Int, req.body.isapproved ?? 0)
      // Default halal/pureveg flags to 0 when not provided
      .input('ishalal', sql.Int, req.body.ishalal ?? 0)
      .input('ispureveg', sql.Int, req.body.ispureveg ?? 0)

      // NEW STATUS FIELDS
      .input('isopen', sql.Int, req.body.isopen ?? 0)
      .input('allowprebooking', sql.Int, req.body.allowprebooking ?? 0)

      // PAYOUT
      .input('payoutaccountname', sql.VarChar(50), req.body.payoutaccountname)
      .input('payoutgpaynumber', sql.VarChar(50), req.body.payoutgpaynumber)
      .input('payoutbankname', sql.VarChar(50), req.body.payoutbankname)
      .input('payoutaccountnumber', sql.VarChar(50), req.body.payoutaccountnumber)
      .input('payoutifsc', sql.VarChar(50), req.body.payoutifsc)

      // AUDIT
      .input('rcu', sql.VarChar(100), req.body.rcu)

      .query(`
        INSERT INTO tbl_dk_kitchens
        (
          kitchenid,
          partneruserid,
          kitchenname,
          description,
          cuisinetype,
          cookgender,
          fssainumber,
          profileimage,
          coverimage,
          address,
          city,
          state,
          pincode,
          latitude,
          longitude,
          isactive,
          isapproved,
          ishalal,
          ispureveg,
          isopen,
          allowprebooking,
          payoutaccountname,
          payoutgpaynumber,
          payoutbankname,
          payoutaccountnumber,
          payoutifsc,
          rcu,
          rcm
        )
        OUTPUT INSERTED.*
        VALUES
        (
          NEWID(),
          @partneruserid,
          @kitchenname,
          @description,
          @cuisinetype,
          @cookgender,
          @fssainumber,
          @profileimage,
          @coverimage,
          @address,
          @city,
          @state,
          @pincode,
          @latitude,
          @longitude,
          @isactive,
          @isapproved,
          @ishalal,
          @ispureveg,
          @isopen,
          @allowprebooking,
          @payoutaccountname,
          @payoutgpaynumber,
          @payoutbankname,
          @payoutaccountnumber,
          @payoutifsc,
          @rcu,
          CONVERT(datetime, switchoffset(sysdatetimeoffset(), '+05:30'))
        )
      `);

    res.status(201).json({
      Status: true,
      Message: 'Kitchen created successfully',
      Response: result.recordset[0]
    });

  } catch (err) {
    next(err);
  }
});


// ======================================================
// UPDATE KITCHEN
// ======================================================
router.put('/', async (req, res, next) => {
  try {
    await poolConnect;

    const request = pool.request();

    request.input('kitchenid', sql.VarChar(36), req.body.kitchenid);

    const fields = [
      'partneruserid',
      'kitchenname',
      'description',
      'cuisinetype',
      'cookgender',
      'fssainumber',
      'profileimage',
      'coverimage',
      'address',
      'city',
      'state',
      'pincode',
      'latitude',
      'longitude',
      'isactive',
      'isapproved',
      'ishalal',
      'ispureveg',
      'rating',
      'totalorders',
      'isopen',
      'allowprebooking',
      'payoutaccountname',
      'payoutgpaynumber',
      'payoutbankname',
      'payoutaccountnumber',
      'payoutifsc',
      'luu'
    ];

    const updates = [];

    fields.forEach(field => {

      if (req.body[field] !== undefined) {

        updates.push(`${field} = @${field}`);

        // INT FIELDS
        if (
          [
            'isactive',
            'isapproved',
            'ishalal',
            'ispureveg',
            'totalorders',
            'isopen',
            'allowprebooking'
          ].includes(field)
        ) {
          request.input(field, sql.Int, req.body[field]);
        }

        // DECIMAL
        else if (field === 'rating') {
          request.input(field, sql.Decimal(2, 1), req.body[field]);
        }

        // VARCHAR
        else if (
          [
            'partneruserid',
            'cookgender',
            'latitude',
            'longitude',
            'payoutaccountname',
            'payoutgpaynumber',
            'payoutbankname',
            'payoutaccountnumber',
            'payoutifsc',
            'luu'
          ].includes(field)
        ) {
          request.input(field, sql.VarChar, req.body[field]);
        }

        // NVARCHAR
        else {
          request.input(field, sql.NVarChar, req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        Status: false,
        Message: 'No fields provided for update'
      });
    }

    updates.push(`
      lum = CONVERT(datetime, switchoffset(sysdatetimeoffset(), '+05:30'))
    `);

    const query = `
      UPDATE tbl_dk_kitchens
      SET ${updates.join(', ')}
      WHERE kitchenid = @kitchenid;

      SELECT @@ROWCOUNT AS affected;
    `;

    const result = await request.query(query);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        Status: false,
        Message: 'Kitchen not found'
      });
    }

    res.json({
      Status: true,
      Message: 'Kitchen updated successfully'
    });

  } catch (err) {
    next(err);
  }
});


// ======================================================
// GET ALL KITCHENS
// ======================================================
router.get('/', async (req, res, next) => {
  try {

    await poolConnect;

    const result = await pool.request().query(`
      SELECT *
      FROM tbl_dk_kitchens
      ORDER BY rcm DESC
    `);

    res.json({
      Status: true,
      Response: result.recordset
    });

  } catch (err) {
    next(err);
  }
});


// ======================================================
// GET KITCHEN BY ID
// ======================================================
router.get('/:id', async (req, res, next) => {
  try {

    await poolConnect;

    const result = await pool.request()
      .input('kitchenid', sql.VarChar(36), req.params.id)
      .query(`
        SELECT *
        FROM tbl_dk_kitchens
        WHERE kitchenid = @kitchenid
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        Status: false,
        Message: 'Kitchen not found'
      });
    }

    res.json({
      Status: true,
      Response: result.recordset[0]
    });

  } catch (err) {
    next(err);
  }
});


// ======================================================
// DELETE KITCHEN
// ======================================================
router.delete('/:id', async (req, res, next) => {
  try {

    await poolConnect;

    const result = await pool.request()
      .input('kitchenid', sql.VarChar(36), req.params.id)
      .query(`
        DELETE FROM tbl_dk_kitchens
        WHERE kitchenid = @kitchenid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        Status: false,
        Message: 'Kitchen not found'
      });
    }

    res.json({
      Status: true,
      Message: 'Kitchen deleted successfully'
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;