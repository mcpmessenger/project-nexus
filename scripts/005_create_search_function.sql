-- Create a function for vector similarity search
CREATE OR REPLACE FUNCTION search_tools_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  tool_id uuid,
  tool_name text,
  tool_description text,
  server_name text,
  server_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tool_id,
    t.name as tool_name,
    t.description as tool_description,
    s.name as server_name,
    s.id as server_id,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM tool_embeddings e
  JOIN mcp_tools t ON e.tool_id = t.id
  JOIN mcp_servers s ON t.server_id = s.id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
