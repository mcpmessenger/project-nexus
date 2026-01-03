-- Verify RLS policies for mcp_server_instances table
-- This script checks and documents the RLS policies needed for instance status updates

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'mcp_server_instances';

-- 2. List all policies on mcp_server_instances
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'mcp_server_instances'
ORDER BY policyname;

-- 3. Check if service_role can update (service_role bypasses RLS, but let's verify policies exist for users)
-- Note: Service role key bypasses RLS entirely, so these policies are for regular user operations

-- Expected policies (from 004_create_rls_policies.sql):
-- - "Users can view their own instances" (SELECT)
-- - "Users can insert their own instances" (INSERT)  
-- - "Users can update their own instances" (UPDATE)
-- - "Users can delete their own instances" (DELETE)

-- 4. Verify UPDATE policy exists and allows status updates
-- The policy should allow: auth.uid() = user_id
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'mcp_server_instances' 
  AND cmd = 'UPDATE'
  AND (qual LIKE '%user_id%' OR with_check LIKE '%user_id%');

-- 5. Test query to verify a user can update their own instance status
-- (This is informational - actual updates should use service_role on server-side)
-- Replace 'user-uuid-here' with actual user ID
/*
SELECT 
    id,
    user_id,
    server_id,
    status,
    updated_at
FROM mcp_server_instances
WHERE user_id = 'user-uuid-here'
LIMIT 1;
*/

-- 6. If UPDATE policy is missing, create it:
/*
CREATE POLICY "Users can update their own instances"
ON mcp_server_instances
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
*/
