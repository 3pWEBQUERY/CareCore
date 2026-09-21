CREATE TABLE IF NOT EXISTS carecore_users (
  id UUID PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'user',
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  archive_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL;
ALTER TABLE carecore_users ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS carecore_users_username_lower_idx
  ON carecore_users (LOWER(username));
CREATE INDEX IF NOT EXISTS carecore_users_archived_idx ON carecore_users (archived_at DESC) WHERE archived_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS carecore_sessions (
  id UUID PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carecore_sessions_expiry_idx
  ON carecore_sessions (expires_at);

-- CareCore domain model. IDs are created in the application layer so the schema
-- works equally with Neon pooled and direct connections.

CREATE TABLE IF NOT EXISTS carecore_organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(220),
  organization_number VARCHAR(80),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Zurich',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_sites (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  address_line1 VARCHAR(180),
  address_line2 VARCHAR(180),
  postal_code VARCHAR(20),
  city VARCHAR(120),
  phone VARCHAR(60),
  email VARCHAR(160),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS carecore_care_units (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES carecore_sites(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(32),
  floor VARCHAR(80),
  capacity SMALLINT CHECK (capacity IS NULL OR capacity >= 0),
  specialty VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS carecore_rooms (
  id UUID PRIMARY KEY,
  care_unit_id UUID NOT NULL REFERENCES carecore_care_units(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  room_number VARCHAR(32),
  beds SMALLINT NOT NULL DEFAULT 1 CHECK (beds > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (care_unit_id, name)
);

CREATE TABLE IF NOT EXISTS carecore_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES carecore_users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES carecore_organizations(id) ON DELETE SET NULL,
  employee_number VARCHAR(80),
  job_title VARCHAR(140),
  phone VARCHAR(60),
  avatar_url TEXT,
  primary_care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  locale VARCHAR(16) NOT NULL DEFAULT 'de-CH',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kept separately so existing Neon installations receive the column as well.
ALTER TABLE carecore_user_profiles
  ADD COLUMN IF NOT EXISTS primary_care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS carecore_user_dashboard_layouts (
  user_id UUID PRIMARY KEY REFERENCES carecore_users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '{"order":[],"hidden":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_user_unit_assignments (
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  care_unit_id UUID NOT NULL REFERENCES carecore_care_units(id) ON DELETE CASCADE,
  assignment_role VARCHAR(80) NOT NULL DEFAULT 'member',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  starts_on DATE,
  ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, care_unit_id)
);

CREATE TABLE IF NOT EXISTS carecore_residents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE RESTRICT,
  external_number VARCHAR(80),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(120),
  date_of_birth DATE,
  gender VARCHAR(32),
  language VARCHAR(32) NOT NULL DEFAULT 'de-CH',
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'transferred', 'discharged', 'deceased', 'archived')),
  admitted_on DATE,
  discharged_on DATE,
  deceased_on DATE,
  primary_care_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, external_number)
);

-- Biography is deliberately separate from clinical notes: it is a resident-owned
-- narrative that supports person-centred care and is updated independently.
CREATE TABLE IF NOT EXISTS carecore_resident_biographies (
  resident_id UUID PRIMARY KEY REFERENCES carecore_residents(id) ON DELETE CASCADE,
  life_story TEXT NOT NULL DEFAULT '',
  important_people TEXT NOT NULL DEFAULT '',
  daily_routines TEXT NOT NULL DEFAULT '',
  preferences TEXT NOT NULL DEFAULT '',
  strengths TEXT NOT NULL DEFAULT '',
  sensitive_topics TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_resident_stays (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  room_id UUID REFERENCES carecore_rooms(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  stay_type VARCHAR(40) NOT NULL DEFAULT 'permanent',
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE IF NOT EXISTS carecore_resident_contacts (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(60),
  email VARCHAR(160),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_resident_clinical_flags (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  category VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  severity VARCHAR(24) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'attention', 'critical')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  details TEXT,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carecore_documentation_entries (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  category VARCHAR(80) NOT NULL,
  title VARCHAR(220),
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  importance VARCHAR(32) NOT NULL DEFAULT 'standard' CHECK (importance IN ('standard', 'important', 'visit', 'observation', 'critical')),
  visibility VARCHAR(32) NOT NULL DEFAULT 'care_team',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  amended_from_id UUID REFERENCES carecore_documentation_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_care_plans (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'review', 'closed', 'archived')),
  care_level VARCHAR(80),
  focus TEXT,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  review_on DATE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_care_goals (
  id UUID PRIMARY KEY,
  care_plan_id UUID NOT NULL REFERENCES carecore_care_plans(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  statement TEXT NOT NULL,
  target_date DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'achieved', 'not_achieved', 'cancelled')),
  evaluation_note TEXT,
  evaluated_at TIMESTAMPTZ,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_interventions (
  id UUID PRIMARY KEY,
  care_goal_id UUID NOT NULL REFERENCES carecore_care_goals(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  instructions TEXT,
  frequency VARCHAR(100),
  responsible_role VARCHAR(100),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_assessments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  version VARCHAR(40),
  category VARCHAR(100),
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code, version)
);

CREATE TABLE IF NOT EXISTS carecore_assessment_records (
  id UUID PRIMARY KEY,
  assessment_id UUID REFERENCES carecore_assessments(id) ON DELETE SET NULL,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  assessor_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'superseded')),
  due_on DATE,
  completed_at TIMESTAMPTZ,
  score NUMERIC(10,2),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_vital_measurements (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  measured_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric VARCHAR(80) NOT NULL,
  value NUMERIC(12,3) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  secondary_value NUMERIC(12,3),
  status VARCHAR(24) NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'attention', 'critical')),
  note TEXT,
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_vital_thresholds (
  id UUID PRIMARY KEY,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  metric VARCHAR(80) NOT NULL,
  lower_bound NUMERIC(12,3),
  upper_bound NUMERIC(12,3),
  warning_lower NUMERIC(12,3),
  warning_upper NUMERIC(12,3),
  unit VARCHAR(32) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (resident_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS carecore_medications (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  name VARCHAR(220) NOT NULL,
  active_ingredient VARCHAR(220),
  form VARCHAR(80),
  strength VARCHAR(80),
  atc_code VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name, strength)
);

CREATE TABLE IF NOT EXISTS carecore_medication_orders (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES carecore_medications(id) ON DELETE SET NULL,
  prescribed_by VARCHAR(160),
  indication VARCHAR(240),
  dosage JSONB NOT NULL DEFAULT '{}'::jsonb,
  route VARCHAR(80),
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_prn BOOLEAN NOT NULL DEFAULT FALSE,
  prn_instructions TEXT,
  start_on DATE,
  end_on DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'stopped', 'completed')),
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_medication_administrations (
  id UUID PRIMARY KEY,
  medication_order_id UUID NOT NULL REFERENCES carecore_medication_orders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  administered_at TIMESTAMPTZ,
  administered_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'administered', 'declined', 'omitted', 'delayed')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_medication_stock (
  id UUID PRIMARY KEY,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  medication_id UUID NOT NULL REFERENCES carecore_medications(id) ON DELETE CASCADE,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit VARCHAR(32) NOT NULL,
  minimum_quantity NUMERIC(12,3),
  expires_on DATE,
  batch_number VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_wounds (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  body_location VARCHAR(160) NOT NULL,
  diagnosis VARCHAR(180),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'healing', 'closed', 'archived')),
  severity VARCHAR(32) NOT NULL DEFAULT 'attention' CHECK (severity IN ('info', 'attention', 'critical')),
  discovered_at TIMESTAMPTZ,
  responsible_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_wound_entries (
  id UUID PRIMARY KEY,
  wound_id UUID NOT NULL REFERENCES carecore_wounds(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  length_cm NUMERIC(8,2),
  width_cm NUMERIC(8,2),
  depth_cm NUMERIC(8,2),
  tissue VARCHAR(120),
  exudate VARCHAR(120),
  pain_score SMALLINT CHECK (pain_score BETWEEN 0 AND 10),
  treatment TEXT,
  note TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_nutrition_plans (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  diet VARCHAR(160),
  texture VARCHAR(120),
  allergies TEXT,
  daily_fluid_target_ml INTEGER CHECK (daily_fluid_target_ml IS NULL OR daily_fluid_target_ml >= 0),
  daily_calorie_target INTEGER CHECK (daily_calorie_target IS NULL OR daily_calorie_target >= 0),
  instructions TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_fluid_entries (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  entered_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
  beverage VARCHAR(120),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_shifts (
  id UUID PRIMARY KEY,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS carecore_shift_assignments (
  id UUID PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES carecore_shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  role VARCHAR(100),
  status VARCHAR(24) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'absent', 'completed')),
  absence_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS carecore_tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE SET NULL,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  description TEXT,
  priority VARCHAR(24) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_handovers (
  id UUID PRIMARY KEY,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES carecore_shifts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  priority VARCHAR(24) NOT NULL DEFAULT 'normal',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_conversations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  title VARCHAR(180),
  kind VARCHAR(32) NOT NULL DEFAULT 'group' CHECK (kind IN ('direct', 'group', 'channel')),
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_conversation_members (
  conversation_id UUID NOT NULL REFERENCES carecore_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS carecore_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES carecore_conversations(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carecore_documents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE SET NULL,
  title VARCHAR(220) NOT NULL,
  category VARCHAR(100),
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(120),
  version VARCHAR(40),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  uploaded_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_trainings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  valid_for_months SMALLINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_training_enrollments (
  id UUID PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES carecore_trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'expired')),
  due_on DATE,
  completed_at TIMESTAMPTZ,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (training_id, user_id)
);

CREATE TABLE IF NOT EXISTS carecore_quality_events (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE SET NULL,
  care_unit_id UUID REFERENCES carecore_care_units(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(24) NOT NULL DEFAULT 'attention',
  status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_rai_assessments (
  id UUID PRIMARY KEY,
  resident_id UUID NOT NULL REFERENCES carecore_residents(id) ON DELETE CASCADE,
  responsible_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  assessment_type VARCHAR(80) NOT NULL DEFAULT 'interRAI',
  status VARCHAR(32) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'current', 'overdue', 'archived')),
  due_on DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_ai_drafts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES carecore_organizations(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES carecore_residents(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  type VARCHAR(80) NOT NULL,
  prompt TEXT,
  content TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'accepted', 'discarded')),
  reviewed_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES carecore_users(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  body TEXT,
  type VARCHAR(80) NOT NULL,
  priority VARCHAR(24) NOT NULL DEFAULT 'normal',
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_audit_log (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES carecore_organizations(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  request_id UUID,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carecore_roles (
  id UUID PRIMARY KEY,
  key VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES carecore_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carecore_sites_organization_idx ON carecore_sites (organization_id);
CREATE INDEX IF NOT EXISTS carecore_dashboard_layouts_updated_idx ON carecore_user_dashboard_layouts (updated_at DESC);
CREATE INDEX IF NOT EXISTS carecore_units_site_idx ON carecore_care_units (site_id);
CREATE INDEX IF NOT EXISTS carecore_user_profiles_primary_unit_idx ON carecore_user_profiles (primary_care_unit_id);
CREATE INDEX IF NOT EXISTS carecore_rooms_unit_idx ON carecore_rooms (care_unit_id);
CREATE INDEX IF NOT EXISTS carecore_residents_organization_status_idx ON carecore_residents (organization_id, status);
CREATE INDEX IF NOT EXISTS carecore_residents_name_idx ON carecore_residents (last_name, first_name);
CREATE INDEX IF NOT EXISTS carecore_stays_resident_active_idx ON carecore_resident_stays (resident_id, started_at DESC) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS carecore_documentation_resident_time_idx ON carecore_documentation_entries (resident_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS carecore_care_plans_resident_status_idx ON carecore_care_plans (resident_id, status);
CREATE INDEX IF NOT EXISTS carecore_assessment_records_due_idx ON carecore_assessment_records (resident_id, due_on) WHERE status IN ('draft', 'in_progress');
CREATE INDEX IF NOT EXISTS carecore_vitals_resident_metric_time_idx ON carecore_vital_measurements (resident_id, metric, measured_at DESC);
CREATE INDEX IF NOT EXISTS carecore_medication_orders_resident_status_idx ON carecore_medication_orders (resident_id, status);
CREATE INDEX IF NOT EXISTS carecore_medication_administrations_due_idx ON carecore_medication_administrations (resident_id, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS carecore_wounds_resident_status_idx ON carecore_wounds (resident_id, status);
CREATE INDEX IF NOT EXISTS carecore_wound_entries_wound_time_idx ON carecore_wound_entries (wound_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS carecore_fluid_entries_resident_time_idx ON carecore_fluid_entries (resident_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS carecore_tasks_assignee_status_due_idx ON carecore_tasks (assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS carecore_handovers_unit_time_idx ON carecore_handovers (care_unit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carecore_messages_conversation_time_idx ON carecore_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carecore_quality_events_status_time_idx ON carecore_quality_events (organization_id, status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS carecore_rai_resident_status_idx ON carecore_rai_assessments (resident_id, status, due_on);
CREATE INDEX IF NOT EXISTS carecore_notifications_user_unread_idx ON carecore_notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS carecore_audit_entity_idx ON carecore_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carecore_roles_key_idx ON carecore_roles (key);

INSERT INTO carecore_roles (id, key, name, description, permissions, system_role) VALUES
  ('00000000-0000-4000-8000-000000000701', 'admin', 'Administration', 'Vollzugriff auf Organisation und Verwaltung.', '["residents.read","residents.write","documentation.write","medication.manage","schedule.manage","team.manage","quality.manage","insights.read","administration.manage","rai.manage","ai.use"]'::jsonb, TRUE),
  ('00000000-0000-4000-8000-000000000702', 'leitung', 'Leitung', 'Leitung, Auswertungen und Teamsteuerung.', '["residents.read","residents.write","documentation.write","schedule.manage","team.manage","quality.manage","insights.read"]'::jsonb, TRUE),
  ('00000000-0000-4000-8000-000000000703', 'pflege', 'Pflege', 'Pflegearbeitsplatz mit Dokumentation.', '["residents.read","residents.write","documentation.write","medication.manage"]'::jsonb, TRUE),
  ('00000000-0000-4000-8000-000000000704', 'arzt', 'Ärztlicher Dienst', 'Medizinischer Fachzugriff.', '["residents.read","documentation.write","medication.manage"]'::jsonb, TRUE),
  ('00000000-0000-4000-8000-000000000705', 'mitarbeitende:r', 'Mitarbeitende:r', 'Eingeschränkter Fachzugriff.', '["residents.read"]'::jsonb, TRUE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO carecore_users (id, username, display_name, role, password_hash)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Admin',
  'CareCore Administrator',
  'admin',
  'scrypt:01a0fdc66a4455589c11381adeb7f306:653cb4f3ad74171c86dd33e71582ab3cca7c7f75734302e64fac4cc60c99033911bb3f981397df4e0049ccbc72a1d40adf5824bcb710ee1e4c8c4ea537ba372f'
)
ON CONFLICT DO NOTHING;
