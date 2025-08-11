-- This migration previously contained an incomplete statement. Replaced with a no-op to avoid breaking deployments.
-- Use subsequent migrations to manage email-related tables, RLS and grants.

-- Ensure crypto extension exists (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;