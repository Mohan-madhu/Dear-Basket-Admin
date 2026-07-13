USE [db_dearbasket];
GO

IF OBJECT_ID('dbo.tbl_partner_applications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_partner_applications
    (
        applicationid          VARCHAR(36)    NOT NULL CONSTRAINT PK_tbl_partner_applications PRIMARY KEY DEFAULT CONVERT(VARCHAR(36), NEWID()),
        fullname               NVARCHAR(150)  NOT NULL,
        mobile                 VARCHAR(15)    NOT NULL,
        username               VARCHAR(100)   NOT NULL,
        [password]             NVARCHAR(500)  NOT NULL,
        dob                    DATE           NULL,
        [address]              NVARCHAR(500)  NOT NULL,
        city                   NVARCHAR(100)  NULL,
        [state]                NVARCHAR(100)  NULL,
        pincode                VARCHAR(10)    NULL,
        vehiclenumber          VARCHAR(50)    NOT NULL,
        drivinglicensenumber   VARCHAR(100)   NOT NULL,
        applicationstatus      VARCHAR(20)    NOT NULL CONSTRAINT DF_partner_application_status DEFAULT 'PENDING',
        rejectionreason        NVARCHAR(500)  NULL,
        reviewedby             VARCHAR(64)    NULL,
        reviewedtime           DATETIME2      NULL,
        createduserid          VARCHAR(64)    NULL,
        appliedtime            DATETIME2      NOT NULL CONSTRAINT DF_partner_application_time DEFAULT (CONVERT(DATETIME2, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))),
        lum                    DATETIME2      NULL,
        CONSTRAINT CK_partner_application_status CHECK (applicationstatus IN ('PENDING', 'APPROVED', 'REJECTED'))
    );

    CREATE INDEX IX_partner_applications_status_time
        ON dbo.tbl_partner_applications(applicationstatus, appliedtime DESC);
    CREATE INDEX IX_partner_applications_mobile
        ON dbo.tbl_partner_applications(mobile);
END;
GO

IF COL_LENGTH('dbo.tbl_partner_applications', 'password') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_partner_applications ADD [password] NVARCHAR(500) NULL;
END;
GO
