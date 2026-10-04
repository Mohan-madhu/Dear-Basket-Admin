const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

const normalizeRole = (value) => String(value || '').trim().toUpperCase();
const normalizeText = (value) => String(value || '').trim();

const getLatestRegistration = async (userid) => {
  const result = await pool.request()
    .input('userid', sql.VarChar(64), userid)
    .query(`
      SELECT TOP 1 transid, userid, status, rcm
      FROM dbo.tbl_dailymilkregistration
      WHERE userid = @userid
      ORDER BY rcm DESC, transid DESC;
    `);
  return result.recordset?.[0] || null;
};

const validateAdmin = async (adminid) => {
  if (!adminid) return false;
  const result = await pool.request()
    .input('adminid', sql.VarChar(64), adminid)
    .query(`
      SELECT TOP 1 transid
      FROM dbo.tbl_user
      WHERE transid = @adminid
        AND UPPER(ISNULL(usertype, '')) = 'ADMIN';
    `);
  return Boolean(result.recordset?.[0]);
};

const validateReader = async ({ userid, readerid, readerrole }) => {
  const role = normalizeRole(readerrole);
  if (role === 'USER') return String(readerid || '') === String(userid || '');
  if (role === 'ADMIN') return validateAdmin(readerid);
  return false;
};

const ensureConversation = async ({ userid, registrationid, actorid }) => {
  const result = await pool.request()
    .input('userid', sql.VarChar(64), userid)
    .input('registrationid', sql.VarChar(64), registrationid || null)
    .input('actorid', sql.VarChar(100), actorid || userid)
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;

      DECLARE @conversationid UNIQUEIDENTIFIER;

      SELECT @conversationid = conversationid
      FROM dbo.tbl_dailymilk_complaint_conversations WITH (UPDLOCK, HOLDLOCK)
      WHERE userid = @userid;

      IF @conversationid IS NULL
      BEGIN
          SET @conversationid = NEWID();
          INSERT INTO dbo.tbl_dailymilk_complaint_conversations
              (conversationid, userid, dailymilkregistrationid, rcu, rcm)
          VALUES
              (@conversationid, @userid, @registrationid, @actorid, SYSUTCDATETIME());
      END
      ELSE IF @registrationid IS NOT NULL
      BEGIN
          UPDATE dbo.tbl_dailymilk_complaint_conversations
          SET dailymilkregistrationid = @registrationid,
              luu = @actorid,
              lum = SYSUTCDATETIME()
          WHERE conversationid = @conversationid;
      END;

      COMMIT TRANSACTION;

      SELECT *
      FROM dbo.tbl_dailymilk_complaint_conversations
      WHERE conversationid = @conversationid;
    `);
  return result.recordset?.[0] || null;
};

// Admin inbox: includes only users who have started a complaint conversation.
router.get('/admin/conversations', async (req, res, next) => {
  try {
    await poolConnect;
    const adminid = String(req.query.adminid || '').trim();
    if (!(await validateAdmin(adminid))) {
      return res.status(403).json({ message: 'Admin access is required.' });
    }

    const search = normalizeText(req.query.search);
    const result = await pool.request()
      .input('search', sql.NVarChar(200), search || null)
      .query(`
        ;WITH LatestRegistration AS
        (
            SELECT
                dmr.transid AS dailymilkregistrationid,
                dmr.userid,
                dmr.status AS registrationstatus,
                dmr.rcm AS registrationtime,
                ROW_NUMBER() OVER (
                    PARTITION BY dmr.userid
                    ORDER BY dmr.rcm DESC, dmr.transid DESC
                ) AS rn
            FROM dbo.tbl_dailymilkregistration AS dmr
        )
        SELECT
            c.dailymilkregistrationid,
            c.userid,
            lr.registrationstatus,
            lr.registrationtime,
            COALESCE(NULLIF(LTRIM(RTRIM(u.name)), ''), c.userid) AS username,
            u.mobile AS usermobile,
            c.conversationid,
            c.conversationstatus,
            c.lastmessage,
            c.lastmessagetime,
            c.lastsenderrole,
            (
                SELECT COUNT_BIG(1)
                FROM dbo.tbl_dailymilk_complaint_messages AS m
                WHERE m.conversationid = c.conversationid
                  AND m.senderrole = 'USER'
                  AND m.isread = 0
            ) AS unreadcount
        FROM dbo.tbl_dailymilk_complaint_conversations AS c
        INNER JOIN LatestRegistration AS lr
          ON lr.userid = c.userid AND lr.rn = 1
        LEFT JOIN dbo.tbl_user AS u
          ON u.transid = c.userid
        WHERE c.lastmessagetime IS NOT NULL
          AND (
              @search IS NULL
              OR c.userid LIKE '%' + @search + '%'
              OR u.name LIKE '%' + @search + '%'
              OR u.mobile LIKE '%' + @search + '%'
          )
        ORDER BY c.lastmessagetime DESC;
      `);

    res.json({ Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

// One permanent conversation for a Daily Milk user.
router.get('/user/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const userid = String(req.params.userid || '').trim();
    const readerid = String(req.query.readerid || '').trim();
    const readerrole = normalizeRole(req.query.readerrole);

    if (!userid || !(await validateReader({ userid, readerid, readerrole }))) {
      return res.status(403).json({ message: 'You cannot access this conversation.' });
    }

    const registration = await getLatestRegistration(userid);
    if (!registration) {
      return res.status(404).json({ message: 'Daily Milk registration was not found.' });
    }

    const conversationResult = await pool.request()
      .input('userid', sql.VarChar(64), userid)
      .query(`
        SELECT TOP 1
            c.*,
            COALESCE(NULLIF(LTRIM(RTRIM(u.name)), ''), c.userid) AS username,
            u.mobile AS usermobile
        FROM dbo.tbl_dailymilk_complaint_conversations AS c
        LEFT JOIN dbo.tbl_user AS u ON u.transid = c.userid
        WHERE c.userid = @userid;
      `);

    const conversation = conversationResult.recordset?.[0] || null;
    let messages = [];

    if (conversation) {
      const messagesResult = await pool.request()
        .input('conversationid', sql.UniqueIdentifier, conversation.conversationid)
        .query(`
          SELECT messageid, conversationid, senderid, senderrole,
                 messagetext, isread, readat, createdat
          FROM dbo.tbl_dailymilk_complaint_messages
          WHERE conversationid = @conversationid
          ORDER BY createdat ASC, messageid ASC;
        `);
      messages = messagesResult.recordset || [];
    }

    res.json({
      Conversation: conversation,
      Messages: messages,
      Registration: registration,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/message', async (req, res, next) => {
  try {
    await poolConnect;
    const userid = String(req.body.userid || '').trim();
    const senderid = String(req.body.senderid || '').trim();
    const senderrole = normalizeRole(req.body.senderrole);
    const message = normalizeText(req.body.message);

    if (!userid || !senderid || !['USER', 'ADMIN'].includes(senderrole)) {
      return res.status(400).json({ message: 'userid, senderid and senderrole are required.' });
    }
    if (!message) return res.status(400).json({ message: 'Message cannot be empty.' });
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Message cannot exceed 2000 characters.' });
    }
    if (senderrole === 'USER' && senderid !== userid) {
      return res.status(403).json({ message: 'Users can send only to their own conversation.' });
    }
    if (senderrole === 'ADMIN' && !(await validateAdmin(senderid))) {
      return res.status(403).json({ message: 'Admin access is required.' });
    }

    const registration = await getLatestRegistration(userid);
    if (!registration) {
      return res.status(404).json({ message: 'Daily Milk registration was not found.' });
    }

    const conversation = await ensureConversation({
      userid,
      registrationid: registration.transid,
      actorid: senderid,
    });

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const insertResult = await new sql.Request(transaction)
        .input('conversationid', sql.UniqueIdentifier, conversation.conversationid)
        .input('senderid', sql.VarChar(64), senderid)
        .input('senderrole', sql.VarChar(10), senderrole)
        .input('message', sql.NVarChar(2000), message)
        .query(`
          INSERT INTO dbo.tbl_dailymilk_complaint_messages
              (conversationid, senderid, senderrole, messagetext, isread, createdat)
          OUTPUT INSERTED.*
          VALUES
              (@conversationid, @senderid, @senderrole, @message, 0, SYSUTCDATETIME());
        `);

      await new sql.Request(transaction)
        .input('conversationid', sql.UniqueIdentifier, conversation.conversationid)
        .input('senderid', sql.VarChar(64), senderid)
        .input('senderrole', sql.VarChar(10), senderrole)
        .input('message', sql.NVarChar(2000), message)
        .query(`
          UPDATE dbo.tbl_dailymilk_complaint_conversations
          SET lastmessage = @message,
              lastmessagetime = SYSUTCDATETIME(),
              lastsenderrole = @senderrole,
              conversationstatus = 'Open',
              luu = @senderid,
              lum = SYSUTCDATETIME()
          WHERE conversationid = @conversationid;
        `);

      await transaction.commit();
      res.status(201).json({
        message: 'Message sent successfully.',
        Conversation: conversation,
        Response: insertResult.recordset?.[0] || null,
      });
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }
  } catch (err) {
    next(err);
  }
});

router.put('/read', async (req, res, next) => {
  try {
    await poolConnect;
    const userid = String(req.body.userid || '').trim();
    const readerid = String(req.body.readerid || '').trim();
    const readerrole = normalizeRole(req.body.readerrole);

    if (!userid || !(await validateReader({ userid, readerid, readerrole }))) {
      return res.status(403).json({ message: 'You cannot update this conversation.' });
    }

    const result = await pool.request()
      .input('userid', sql.VarChar(64), userid)
      .input('readerrole', sql.VarChar(10), readerrole)
      .query(`
        UPDATE m
        SET m.isread = 1,
            m.readat = SYSUTCDATETIME()
        FROM dbo.tbl_dailymilk_complaint_messages AS m
        INNER JOIN dbo.tbl_dailymilk_complaint_conversations AS c
          ON c.conversationid = m.conversationid
        WHERE c.userid = @userid
          AND m.senderrole <> @readerrole
          AND m.isread = 0;

        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({
      message: 'Conversation marked as read.',
      affected: result.recordset?.[0]?.affected || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
