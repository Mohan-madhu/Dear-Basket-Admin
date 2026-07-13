USE [db_dearbasket];
GO

IF OBJECT_ID('dbo.tbl_dailymilk_complaint_messages', 'U') IS NOT NULL
    AND OBJECT_ID('dbo.tbl_dailymilk_complaint_conversations', 'U') IS NULL
BEGIN
    THROW 50001, 'Message table exists without conversation table. Review the database manually.', 1;
END;
GO

IF OBJECT_ID('dbo.tbl_dailymilk_complaint_conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_dailymilk_complaint_conversations
    (
        conversationid          UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_dm_complaint_conversationid DEFAULT NEWID(),
        userid                  VARCHAR(64) NOT NULL,
        dailymilkregistrationid VARCHAR(64) NULL,
        conversationstatus      VARCHAR(20) NOT NULL
            CONSTRAINT DF_dm_complaint_status DEFAULT 'Open',
        lastmessage             NVARCHAR(2000) NULL,
        lastmessagetime         DATETIME2(3) NULL,
        lastsenderrole          VARCHAR(10) NULL,
        rcu                     VARCHAR(100) NULL,
        rcm                     DATETIME2(3) NOT NULL
            CONSTRAINT DF_dm_complaint_rcm DEFAULT SYSUTCDATETIME(),
        luu                     VARCHAR(100) NULL,
        lum                     DATETIME2(3) NULL,

        CONSTRAINT PK_dm_complaint_conversations
            PRIMARY KEY CLUSTERED (conversationid),
        CONSTRAINT UQ_dm_complaint_conversations_userid
            UNIQUE (userid),
        CONSTRAINT CK_dm_complaint_conversation_status
            CHECK (conversationstatus IN ('Open', 'Closed')),
        CONSTRAINT CK_dm_complaint_last_sender_role
            CHECK (lastsenderrole IS NULL OR lastsenderrole IN ('USER', 'ADMIN'))
    );
END;
GO

IF OBJECT_ID('dbo.tbl_dailymilk_complaint_messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_dailymilk_complaint_messages
    (
        messageid       BIGINT IDENTITY(1,1) NOT NULL,
        conversationid  UNIQUEIDENTIFIER NOT NULL,
        senderid        VARCHAR(64) NOT NULL,
        senderrole      VARCHAR(10) NOT NULL,
        messagetext     NVARCHAR(2000) NOT NULL,
        isread          BIT NOT NULL
            CONSTRAINT DF_dm_complaint_message_isread DEFAULT 0,
        readat          DATETIME2(3) NULL,
        createdat       DATETIME2(3) NOT NULL
            CONSTRAINT DF_dm_complaint_message_createdat DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_dm_complaint_messages
            PRIMARY KEY CLUSTERED (messageid),
        CONSTRAINT FK_dm_complaint_messages_conversation
            FOREIGN KEY (conversationid)
            REFERENCES dbo.tbl_dailymilk_complaint_conversations(conversationid)
            ON DELETE CASCADE,
        CONSTRAINT CK_dm_complaint_sender_role
            CHECK (senderrole IN ('USER', 'ADMIN')),
        CONSTRAINT CK_dm_complaint_message_not_blank
            CHECK (LEN(LTRIM(RTRIM(messagetext))) > 0)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_dm_complaint_conversations_lastmessage'
      AND object_id = OBJECT_ID('dbo.tbl_dailymilk_complaint_conversations')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_dm_complaint_conversations_lastmessage
        ON dbo.tbl_dailymilk_complaint_conversations(lastmessagetime DESC)
        INCLUDE (userid, conversationstatus, lastsenderrole);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_dm_complaint_messages_conversation_created'
      AND object_id = OBJECT_ID('dbo.tbl_dailymilk_complaint_messages')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_dm_complaint_messages_conversation_created
        ON dbo.tbl_dailymilk_complaint_messages(conversationid, createdat, messageid)
        INCLUDE (senderid, senderrole, isread);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_dm_complaint_messages_unread'
      AND object_id = OBJECT_ID('dbo.tbl_dailymilk_complaint_messages')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_dm_complaint_messages_unread
        ON dbo.tbl_dailymilk_complaint_messages(conversationid, senderrole, isread)
        INCLUDE (createdat);
END;
GO

SELECT
    OBJECT_ID('dbo.tbl_dailymilk_complaint_conversations') AS conversation_table_id,
    OBJECT_ID('dbo.tbl_dailymilk_complaint_messages') AS message_table_id;
GO
