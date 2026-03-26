-- Already executed in Supabase SQL Editor
-- 프로젝트 모니터링 스냅샷 테이블

CREATE TABLE project_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  og_image TEXT,
  tech_stack JSONB,
  features JSONB,
  content_hash TEXT,
  suggested_changelog TEXT,
  suggested_version_name TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, content_hash)
);

CREATE INDEX idx_snapshots_project ON project_snapshots(project_id);
CREATE INDEX idx_snapshots_crawled ON project_snapshots(crawled_at DESC);
