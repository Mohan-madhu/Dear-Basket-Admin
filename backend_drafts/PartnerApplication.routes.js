const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db_dearbasket');

const clean = (value) => String(value || '').trim();

const isAdmin = async (adminid) => {
  if (!adminid) return false;
  const result = await pool.request()
    .input('adminid', sql.VarChar(64), adminid)
    .query(`SELECT TOP 1 transid FROM dbo.tbl_user WHERE transid=@adminid AND UPPER(usertype)='ADMIN' AND ISNULL(status, 1)=1`);
  return Boolean(result.recordset?.[0]);
};

// Public delivery-partner application. This does not create a login account.
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;
    const fullname = clean(req.body.fullname);
    const mobile = clean(req.body.mobile).replace(/\D/g, '');
    const username = mobile;
    const password = String(req.body.password || '');
    const address = clean(req.body.address);
    const vehicle = clean(req.body.vehiclenumber).toUpperCase();
    const licence = clean(req.body.drivinglicensenumber).toUpperCase();

    if (!fullname || mobile.length !== 10 || !address || !vehicle || !licence || password.length < 6) {
      return res.status(400).json({ Message: 'Required partner details are missing or invalid.' });
    }

    const result = await pool.request()
      .input('fullname', sql.NVarChar(150), fullname)
      .input('mobile', sql.VarChar(15), mobile)
      .input('username', sql.VarChar(100), username)
      .input('password', sql.NVarChar(500), password)
      .input('dob', sql.Date, req.body.dob || null)
      .input('address', sql.NVarChar(500), address)
      .input('city', sql.NVarChar(100), clean(req.body.city) || null)
      .input('state', sql.NVarChar(100), clean(req.body.state) || null)
      .input('pincode', sql.VarChar(10), clean(req.body.pincode) || null)
      .input('vehicle', sql.VarChar(50), vehicle)
      .input('licence', sql.VarChar(100), licence)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_login
          WHERE ISNULL(isdeleted, 0) = 0
            AND (username=@mobile OR mobile=@mobile)
        )
            THROW 50001, 'An account already exists for this mobile number.', 1;
        IF EXISTS (SELECT 1 FROM dbo.tbl_partner_applications WHERE mobile=@mobile AND applicationstatus='PENDING')
            THROW 50002, 'A partner application is already pending for this mobile number.', 1;

        INSERT dbo.tbl_partner_applications
          (fullname,mobile,username,[password],dob,[address],city,[state],pincode,vehiclenumber,drivinglicensenumber)
        OUTPUT inserted.applicationid, inserted.applicationstatus, inserted.appliedtime
        VALUES
          (@fullname,@mobile,@username,@password,@dob,@address,@city,@state,@pincode,@vehicle,@licence);
      `);

    return res.status(201).json({ Message: 'Application submitted. Wait for admin approval before logging in.', Response: result.recordset });
  } catch (error) {
    if ([50001, 50002].includes(error.number)) return res.status(409).json({ Message: error.message });
    next(error);
  }
});

// Admin list: pending, approved and rejected applications.
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const adminid = clean(req.query.adminid);
    if (!(await isAdmin(adminid))) return res.status(403).json({ Message: 'Admin access is required.' });

    const result = await pool.request().query(`
      SELECT applicationid,fullname,mobile,username,dob,[address],city,[state],pincode,
             vehiclenumber,drivinglicensenumber,applicationstatus,rejectionreason,
             reviewedby,reviewedtime,createduserid,appliedtime
      FROM dbo.tbl_partner_applications
      ORDER BY CASE applicationstatus WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
               appliedtime DESC;
    `);
    res.json({ Message: 'Partner applications fetched successfully.', Response: result.recordset });
  } catch (error) { next(error); }
});

// Approval atomically creates and activates the PARTNER login.
router.put('/status', async (req, res, next) => {
  try {
    await poolConnect;
    const applicationid = clean(req.body.applicationid);
    const status = clean(req.body.applicationstatus).toUpperCase();
    const reviewedby = clean(req.body.reviewedby);
    const reason = clean(req.body.rejectionreason) || null;
    if (!(await isAdmin(reviewedby))) return res.status(403).json({ Message: 'Admin access is required.' });
    if (!applicationid || !['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ Message: 'Invalid application status.' });
    if (status === 'REJECTED' && !reason) return res.status(400).json({ Message: 'Rejection reason is required.' });

    const result = await pool.request()
      .input('applicationid', sql.VarChar(36), applicationid)
      .input('status', sql.VarChar(20), status)
      .input('reason', sql.NVarChar(500), reason)
      .input('reviewedby', sql.VarChar(64), reviewedby)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;

        DECLARE @current VARCHAR(20), @userid VARCHAR(64);
        SELECT @current=applicationstatus, @userid=createduserid
        FROM dbo.tbl_partner_applications WITH (UPDLOCK, HOLDLOCK)
        WHERE applicationid=@applicationid;

        IF @current IS NULL THROW 50003, 'Partner application was not found.', 1;
        IF @current <> 'PENDING' THROW 50004, 'This partner application has already been reviewed.', 1;

        IF @status='APPROVED'
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM dbo.tbl_partner_applications a
            WHERE a.applicationid=@applicationid
              AND (
                EXISTS (
                  SELECT 1
                  FROM dbo.tbl_login l
                  WHERE ISNULL(l.isdeleted, 0) = 0
                    AND (l.username=a.mobile OR l.mobile=a.mobile)
                )
              )
          ) THROW 50005, 'A user account already exists for this mobile number.', 1;

          SET @userid = CONVERT(VARCHAR(36), NEWID());
          INSERT dbo.tbl_user
            (transid,name,dob,profile,[address],mobile,latitude,longitude,usertype,[status],rcu,rcm,
             deliveryaddress,deliverycity,deliverystate,deliverypincode)
          SELECT @userid,fullname,CONVERT(VARCHAR(30),dob,23),'No File Uploaded',[address],mobile,NULL,NULL,
                 'PARTNER',1,@reviewedby,
                 CONVERT(DATETIME, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))
                 ,[address],city,[state],pincode
          FROM dbo.tbl_partner_applications WHERE applicationid=@applicationid;

          INSERT dbo.tbl_login
            (transid,userid,username,[password],usertype,mobile,lastloginat,failedattempts,islocked,isdeleted,rcu,rcm)
          SELECT CONVERT(VARCHAR(36),NEWID()),@userid,mobile,[password],'PARTNER',mobile,NULL,0,0,0,
                 @reviewedby,CONVERT(DATETIME, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))
          FROM dbo.tbl_partner_applications WHERE applicationid=@applicationid;
        END;

        UPDATE dbo.tbl_partner_applications
        SET applicationstatus=@status,rejectionreason=@reason,reviewedby=@reviewedby,
            reviewedtime=CONVERT(DATETIME2, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30')),
            createduserid=CASE WHEN @status='APPROVED' THEN @userid ELSE NULL END,
            lum=CONVERT(DATETIME2, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))
        WHERE applicationid=@applicationid;

        COMMIT TRANSACTION;
        SELECT applicationid,applicationstatus,createduserid,reviewedtime
        FROM dbo.tbl_partner_applications WHERE applicationid=@applicationid;
      `);

    res.json({ Message: status === 'APPROVED' ? 'Partner approved and account activated.' : 'Partner application rejected.', Response: result.recordset });
  } catch (error) {
    if ([50003, 50004, 50005].includes(error.number)) return res.status(error.number === 50003 ? 404 : 409).json({ Message: error.message });
    next(error);
  }
});

module.exports = router;
