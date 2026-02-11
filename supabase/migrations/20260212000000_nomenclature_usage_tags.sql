-- Add usage_tags to nomenclatures for filtering media/reagents by operation purpose
-- Tags: FEED, DISSOCIATION, WASH, SEED, FREEZING, THAW
ALTER TABLE nomenclatures
  ADD COLUMN IF NOT EXISTS usage_tags TEXT[] DEFAULT '{}';

-- GIN index for array contains queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_nomenclatures_usage_tags
  ON nomenclatures USING gin (usage_tags);

COMMENT ON COLUMN nomenclatures.usage_tags IS 'Operation usage tags: FEED, DISSOCIATION, WASH, SEED, FREEZING, THAW';
