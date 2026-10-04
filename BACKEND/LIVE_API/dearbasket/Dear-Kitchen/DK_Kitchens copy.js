const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

// GET all kitchens
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('mealtypeid', sql.VarChar, req.query.mealtypeid || null)
      .input('ispureveg', sql.Int, req.query.ispureveg != null ? parseInt(req.query.ispureveg) : null)
      .input('ishalal', sql.Int, req.query.ishalal != null ? parseInt(req.query.ishalal) : null)
      .query('EXEC sp_dk_GetKitchens @mealtypeid, @ispureveg, @ishalal;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET kitchen by kitchenid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, req.params.id)
      .query('EXEC sp_dk_GetKitchenById @kitchenid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE kitchen
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('partneruserid', sql.VarChar, req.body.partneruserid)
      .input('kitchenname', sql.NVarChar, req.body.kitchenname)
      .input('description', sql.NVarChar, req.body.description)
      .input('cuisinetype', sql.NVarChar, req.body.cuisinetype)
      .input('profileimage', sql.NVarChar, req.body.profileimage)
      .input('coverimage', sql.NVarChar, req.body.coverimage)
      .input('addressline1', sql.NVarChar, req.body.addressline1)
      .input('addressline2', sql.NVarChar, req.body.addressline2)
      .input('city', sql.NVarChar, req.body.city)
      .input('pincode', sql.VarChar, req.body.pincode)
      .input('latitude', sql.Decimal(10, 2), req.body.latitude)
      .input('longitude', sql.Decimal(10, 2), req.body.longitude)
      // Default isactive to 1 when not provided
      .input('isactive', sql.Int, req.body.isactive ?? 1)
      .input('isapproved', sql.Int, req.body.isapproved)
      .input('ishalal', sql.Int, req.body.ishalal)
      .input('ispureveg', sql.Int, req.body.ispureveg)
      .input('rcu', sql.VarChar, req.body.rcu)
      .query(`
        INSERT INTO tbl_dk_kitchens
          (kitchenid, partneruserid, kitchenname, description, cuisinetype, profileimage, coverimage, addressline1, addressline2, city, pincode, latitude, longitude, isactive, isapproved, ishalal, ispureveg, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @partneruserid, @kitchenname, @description, @cuisinetype, @profileimage, @coverimage, @addressline1, @addressline2, @city, @pincode, @latitude, @longitude, @isactive, @isapproved, @ishalal, @ispureveg, @rcu, CONVERT(datetime, switchoffset(sysdatetimeoffset(),'+05:30')));
      `);
    res.status(201).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// UPDATE kitchen by kitchenid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.kitchenid;
    const fields = ['partneruserid', 'kitchenname', 'description', 'cuisinetype', 'profileimage', 'coverimage', 'addressline1', 'addressline2', 'city', 'pincode', 'latitude', 'longitude', 'isactive', 'isapproved', 'ishalal', 'ispureveg', 'rating', 'totalorders', 'luu'];
    const updates = [];
    const request = pool.request();

    request.input('kitchenid', sql.VarChar, id);
    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (['isactive', 'isapproved', 'ishalal', 'ispureveg', 'totalorders'].includes(f)) request.input(f, sql.Int, req.body[f]);
        else if (['latitude', 'longitude', 'rating'].includes(f)) request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['partneruserid', 'pincode', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    const setClause = updates.join(', ') + ', lum = GETDATE()';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_kitchens
      SET ${setClause}
      WHERE kitchenid = @kitchenid;
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

// DELETE kitchen by kitchenid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.kitchenid;
    await poolConnect;
    const result = await pool.request()
      .input('kitchenid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_kitchens
        WHERE kitchenid = @kitchenid;
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
