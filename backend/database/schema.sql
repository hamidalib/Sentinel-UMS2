-- Create Users table for Admin Panel
-- Run this script in SQL Server Management Studio (SSMS) on your AdminPanelDB database

USE [AdminPanelDB];
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

