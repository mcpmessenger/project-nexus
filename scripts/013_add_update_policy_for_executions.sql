-- Add UPDATE policy for sandbox_executions to allow updating execution status
-- This is needed for the execution route to update status from "pending" -> "running" -> "completed"/"failed"

-- Drop the policy if it exists (to allow re-running this migration)
DROP POLICY IF EXISTS "Allow public update to sandbox_executions" ON sandbox_executions;

-- Allow public update access to sandbox_executions (for updating execution status)
CREATE POLICY "Allow public update to sandbox_executions"
  ON sandbox_executions FOR UPDATE
  USING (true)
  WITH CHECK (true);
