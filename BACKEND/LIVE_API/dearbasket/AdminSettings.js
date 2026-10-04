const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');




const FEATURE_DEFAULTS = [
  ['demo_daily_milk_enabled', '1'],
  ['daily_milk_enabled', '1'],
  ['dear_kitchen_enabled', '1'],
  ['fast_delivery_enabled', '1'],
  ['daily_milk_grocery_enabled', '1'],
];

const seedFeatureDefaults = async () => {
  for (const [key, value] of FEATURE_DEFAULTS) {
    await pool.request()
      .input('setting_key', sql.VarChar(255), key)
      .input('setting_value', sql.VarChar(sql.MAX), value)
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM dbo.tbl_admin_settings
          WHERE setting_key = @setting_key
        )
        BEGIN
          INSERT INTO dbo.tbl_admin_settings
            (setting_key, setting_value, rcu, rcm)
          VALUES
            (@setting_key, @setting_value, 'SYSTEM', GETDATE());
        END
      `);
  }
};

router.get('/features', async (req, res, next) => {
  try {
    await poolConnect;
    await seedFeatureDefaults();

    const result = await pool.request().query(`
      SELECT
        setting_id,
        setting_key,
        setting_value,
        rcu,
        rcm,
        luu,
        lcm
      FROM dbo.tbl_admin_settings
      WHERE setting_key IN (
        'demo_daily_milk_enabled',
        'daily_milk_enabled',
        'dear_kitchen_enabled',
        'fast_delivery_enabled',
        'daily_milk_grocery_enabled'
      )
      ORDER BY setting_key ASC;
    `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.put('/features', async (req, res, next) => {
  try {
    await poolConnect;

    const settingKey = String(req.body.settingkey || req.body.setting_key || '').trim();
    const rawValue = req.body.settingvalue ?? req.body.setting_value;
    const settingValue = ['1', 'true', 'yes', 'on', 'enabled'].includes(String(rawValue).trim().toLowerCase())
      ? '1'
      : '0';
    const updatedBy = String(req.body.luu || req.body.rcu || 'ADMIN').trim();
    const allowedKeys = FEATURE_DEFAULTS.map(([key]) => key);

    if (!allowedKeys.includes(settingKey)) {
      return res.status(400).json({ message: 'Invalid setting key.' });
    }

    const result = await pool.request()
      .input('setting_key', sql.VarChar(255), settingKey)
      .input('setting_value', sql.VarChar(sql.MAX), settingValue)
      .input('luu', sql.VarChar(100), updatedBy)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_admin_settings
          WHERE setting_key = @setting_key
        )
        BEGIN
          UPDATE dbo.tbl_admin_settings
          SET
            setting_value = @setting_value,
            luu = @luu,
            lcm = GETDATE()
          WHERE setting_key = @setting_key;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.tbl_admin_settings
            (setting_key, setting_value, rcu, rcm)
          VALUES
            (@setting_key, @setting_value, @luu, GETDATE());
        END

        SELECT
          setting_id,
          setting_key,
          setting_value,
          rcu,
          rcm,
          luu,
          lcm
        FROM dbo.tbl_admin_settings
        WHERE setting_key = @setting_key;
      `);

    res.json({
      message: 'Setting updated successfully.',
      Response: result.recordset,
    });
  } catch (err) {
    next(err);
  }
});



// GET all admin settings
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_admin_settings ORDER BY rcm DESC;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET admin setting by setting_id
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('setting_id', sql.VarChar(36), req.params.id)
      .query('SELECT * FROM tbl_admin_settings WHERE setting_id = @setting_id;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET admin setting by setting_key
router.get('/key/:setting_key', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('setting_key', sql.VarChar(255), req.params.setting_key)
      .query('SELECT * FROM tbl_admin_settings WHERE setting_key = @setting_key;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// CREATE admin setting
router.post('/', async (req, res, next) => {
  try {
    const {
      setting_key,
      setting_value,
      rcu
    } = req.body;

    await poolConnect;
    const result = await pool.request()
      .input('setting_key', sql.VarChar(255), setting_key)
      .input('setting_value', sql.VarChar(sql.MAX), setting_value)
      .input('rcu', sql.VarChar(100), rcu)
      .query(`
        INSERT INTO tbl_admin_settings
          (setting_key, setting_value, rcu, rcm)
        OUTPUT INSERTED.*
        VALUES
          (@setting_key, @setting_value, @rcu, GETDATE());
      `);

    res.status(201).json({ Response: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

// UPDATE admin setting by setting_id in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.setting_id;

    if (!id) {
      return res.status(400).json({ Response: 'setting_id required' });
    }

    const fields = ['setting_key', 'setting_value', 'luu'];
    const updates = [];
    const request = pool.request();

    await poolConnect;

    request.input('setting_id', sql.VarChar(36), id);

    fields.forEach((f) => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);

        if (f === 'setting_key') {
          request.input(f, sql.VarChar(255), req.body[f]);
        } else if (f === 'setting_value') {
          request.input(f, sql.VarChar(sql.MAX), req.body[f]);
        } else {
          request.input(f, sql.VarChar(100), req.body[f]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ Response: 'No fields provided to update' });
    }

    updates.push('lcm = GETDATE()');

    const result = await request.query(`
      UPDATE tbl_admin_settings
      SET ${updates.join(', ')}
      WHERE setting_id = @setting_id;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (!result.recordset[0].affected) {
      return res.status(404).json({ Response: 'Not found' });
    }

    res.json({ Response: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE admin setting by setting_id in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.setting_id;

    if (!id) {
      return res.status(400).json({ Response: 'setting_id required' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('setting_id', sql.VarChar(36), id)
      .query(`
        DELETE FROM tbl_admin_settings
        WHERE setting_id = @setting_id;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (!result.recordset[0].affected) {
      return res.status(404).json({ Response: 'Not found' });
    }

    res.json({ Response: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});


module.exports = router;