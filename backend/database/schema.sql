-- Create Users table for Admin Panel
-- Run this script in SQL Server Management Studio (SSMS) on your AdminPanelDB database

USE [AdminPanelDB];
GO

-- Create AuditLogs table for application actions
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AuditLogs] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [actor_id] INT NULL,
        [actor_username] NVARCHAR(50) NULL,
        [actor_role] NVARCHAR(50) NULL,
        [action_type] NVARCHAR(100) NOT NULL,
        [target_type] NVARCHAR(100) NULL,
        [target_id] INT NULL,
        [summary] NVARCHAR(255) NULL,
        [details] NVARCHAR(MAX) NULL,
        [ip_address] NVARCHAR(45) NULL,
        [user_agent] NVARCHAR(255) NULL
    );
    CREATE INDEX [IX_AuditLogs_created_at] ON [dbo].[AuditLogs]([created_at] DESC);
    CREATE INDEX [IX_AuditLogs_actor_id] ON [dbo].[AuditLogs]([actor_id]);
    CREATE INDEX [IX_AuditLogs_action_type] ON [dbo].[AuditLogs]([action_type]);
    PRINT 'AuditLogs table created successfully';
END
ELSE
BEGIN
    PRINT 'AuditLogs table already exists';
END
GO

-- Create Users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(50) NOT NULL UNIQUE,
        [password_hash] NVARCHAR(255) NOT NULL,
        [role] NVARCHAR(50) NOT NULL,
        [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME NULL,
        [is_active] BIT NOT NULL DEFAULT 1
    );
    
    -- Create index on username for faster lookups
    CREATE INDEX [IX_Users_Username] ON [dbo].[Users]([username]);
    
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END
GO

-- Verify table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;
GO

-- Ensure Records.username is unique to prevent duplicate sentinel usernames
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Records' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    IF NOT EXISTS (
        SELECT * FROM sys.indexes i
        JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.name = 'UQ_Records_Username' AND OBJECT_NAME(i.object_id) = 'Records'
    )
    BEGIN
        PRINT 'Adding unique constraint UQ_Records_Username on Records(username)';
        ALTER TABLE [dbo].[Records]
        ADD CONSTRAINT UQ_Records_Username UNIQUE ([username]);
    END
    ELSE
    BEGIN
        PRINT 'Unique constraint UQ_Records_Username already exists';
    END
END
GO

