-- Add DELETE policy for sandbox_executions to allow clearing execution history
-- This is needed for the "Clear" button in the telemetry dashboard

-- Allow public delete access to sandbox_executions (for clearing execution history)
CREATE POLICY "Allow public delete to sandbox_executions"
  ON sandbox_executions FOR DELETE
  USING (true);
