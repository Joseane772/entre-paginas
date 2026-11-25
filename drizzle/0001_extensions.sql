-- Accent- and case-insensitive search ("aneis" finds "Anéis").
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- unaccent() is STABLE, so wrap it as IMMUTABLE to allow indexing.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, lower($1)) $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS works_title_trgm ON works USING gin (f_unaccent(title) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS works_original_title_trgm ON works USING gin (f_unaccent(original_title) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS authors_name_trgm ON authors USING gin (f_unaccent(name) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS series_name_trgm ON series USING gin (f_unaccent(name) gin_trgm_ops);
