-- ============================================================
-- ECNET AI Smart Email Agent — MySQL Schema v2.0.0
-- Run: mysql -u root -p < schema/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecnet_email_agent
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecnet_email_agent;

-- ── Organizations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          VARCHAR(64)  NOT NULL, -- e.g. "org_acme_corp"
  name        VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36)     NOT NULL,                -- UUID
  organization_id VARCHAR(64)  NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,                -- bcrypt
  display_name    VARCHAR(255),
  signature       TEXT,
  business_context TEXT,
  role            ENUM('admin','user') NOT NULL DEFAULT 'user',
  status          ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          CHAR(64)     NOT NULL,  -- random hex token used as Bearer JWT
  user_id     CHAR(36)     NOT NULL,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── GCP OAuth Configs (per-org) ───────────────────────────────
CREATE TABLE IF NOT EXISTS gcp_configs (
  organization_id  VARCHAR(64)  NOT NULL,
  client_id        TEXT         NOT NULL,
  client_secret    TEXT         NOT NULL,  -- AES-256 encrypted
  redirect_uri     VARCHAR(500),
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Gmail Accounts (connected mailboxes) ──────────────────────
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id               CHAR(36)     NOT NULL,  -- UUID
  organization_id  VARCHAR(64)  NOT NULL,
  email            VARCHAR(255) NOT NULL,
  access_token     TEXT         NOT NULL,  -- AES-256 encrypted
  refresh_token    TEXT,                   -- AES-256 encrypted
  token_type       VARCHAR(50)  DEFAULT 'Bearer',
  expires_at       DATETIME,
  scope            TEXT,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gmail_accounts_email_org (email, organization_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               VARCHAR(255) NOT NULL,  -- Gmail message ID
  organization_id  VARCHAR(64)  NOT NULL,
  gmail_account_id CHAR(36)     NOT NULL,
  thread_id        VARCHAR(255) NOT NULL,
  subject          VARCHAR(1000),
  from_email       VARCHAR(255),
  from_name        VARCHAR(255),
  body_text        LONGTEXT,
  received_at      DATETIME,
  synced_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, organization_id),
  KEY idx_messages_org (organization_id),
  KEY idx_messages_received (received_at DESC),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (gmail_account_id) REFERENCES gmail_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── AI Classifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classifications (
  message_id       VARCHAR(255) NOT NULL,
  organization_id  VARCHAR(64)  NOT NULL,
  category         ENUM('sales','support','billing','spam','general') NOT NULL DEFAULT 'general',
  urgency          ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  sentiment        ENUM('positive','neutral','negative') NOT NULL DEFAULT 'neutral',
  intent           TEXT,
  summary          TEXT,
  sender_name      VARCHAR(255),
  sender_email     VARCHAR(255),
  company_name     VARCHAR(255),
  requested_action TEXT,
  requires_human_review TINYINT(1) NOT NULL DEFAULT 0,
  confidence       DECIMAL(5,4) DEFAULT NULL,
  classified_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, organization_id),
  KEY idx_class_org (organization_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tone Personas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personas (
  id               CHAR(36)     NOT NULL,
  organization_id  VARCHAR(64)  NOT NULL,
  name             VARCHAR(255) NOT NULL,
  tone             VARCHAR(100) NOT NULL,
  description      TEXT,
  is_default       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Reply Drafts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drafts (
  id               CHAR(36)     NOT NULL,
  message_id       VARCHAR(255) NOT NULL,
  organization_id  VARCHAR(64)  NOT NULL,
  persona_id       CHAR(36),
  draft_text       LONGTEXT     NOT NULL,
  status           ENUM('draft','approved','rejected','sent') NOT NULL DEFAULT 'draft',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at          DATETIME,
  PRIMARY KEY (id),
  KEY idx_drafts_message (message_id),
  KEY idx_drafts_org (organization_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
