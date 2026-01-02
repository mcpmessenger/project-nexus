-- Verify logo_url column exists
-- Run this in Supabase SQL Editor to check if the column was added

-- Check if column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'mcp_servers' 
AND column_name = 'logo_url';

-- Also check the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mcp_servers'
ORDER BY ordinal_position;
