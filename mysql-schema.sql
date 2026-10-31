-- GroupLinks.app - Production MySQL High-Performance Schema & Indexes
-- Optimized for Sub-10ms Queries, Nginx Edge Caching, and Hostinger Deployment

-- 1. Main Directory Communities Table
CREATE TABLE IF NOT EXISTS groups_dir (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  language VARCHAR(50) DEFAULT 'English',
  region VARCHAR(100) DEFAULT 'Global',
  customTags JSON,
  imageUrl TEXT,
  bannerUrl TEXT,
  memberCount INT DEFAULT 0,
  growthRate DECIMAL(10,2) DEFAULT 0,
  clicks INT DEFAULT 0,
  upvotes INT DEFAULT 0,
  shares INT DEFAULT 0,
  bookmarks INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  ratingCount INT DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  isNsfw BOOLEAN DEFAULT false,
  isSticky BOOLEAN DEFAULT false,
  stickyUntil DATETIME DEFAULT NULL,
  stickyOrder INT DEFAULT 999,
  isPromoted BOOLEAN DEFAULT false,
  safetyScore INT DEFAULT 95,
  rankScore INT DEFAULT 88,
  dailyRankScore INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  publishedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  authorName VARCHAR(255) DEFAULT 'Community Member',
  authorEmail VARCHAR(255) DEFAULT NULL,
  claimedByUserId VARCHAR(255) DEFAULT NULL,
  owner_id VARCHAR(255) DEFAULT NULL,
  isClaimed BOOLEAN DEFAULT false,
  rulesSummary TEXT DEFAULT NULL,
  comments JSON DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'approved',
  isActive BOOLEAN DEFAULT true,
  metadataSource VARCHAR(50) DEFAULT NULL,
  fallbackMetadata BOOLEAN DEFAULT false,
  lastMetadataFetchAt VARCHAR(100) DEFAULT NULL,
  metadataFetchError TEXT DEFAULT NULL,
  normalizedUrl TEXT DEFAULT NULL,
  platformHandle VARCHAR(255) DEFAULT NULL,
  onlineCount INT DEFAULT 0,
  
  -- Optimized Composite & Lookup Indexes for Homepage & Listing Pages
  INDEX idx_groups_slug (slug),
  INDEX idx_groups_active_created (isActive, createdAt, id),
  INDEX idx_groups_active_clicks (isActive, clicks, upvotes, id),
  INDEX idx_groups_active_upvotes (isActive, upvotes, id),
  INDEX idx_groups_active_members (isActive, memberCount, id),
  INDEX idx_groups_active_rank (isActive, rankScore, id),
  INDEX idx_groups_active_category (isActive, category, createdAt),
  INDEX idx_groups_active_platform (isActive, platform, createdAt),
  INDEX idx_groups_active_language (isActive, language, createdAt),
  INDEX idx_groups_active_region (isActive, region, createdAt),
  INDEX idx_groups_active_nsfw (isActive, isNsfw),
  INDEX idx_groups_sticky (isActive, isSticky, stickyOrder),
  INDEX idx_groups_leaderboard_upvotes (isActive, isNsfw, upvotes DESC),
  INDEX idx_groups_leaderboard_clicks (isActive, isNsfw, clicks DESC),
  INDEX idx_groups_leaderboard_rank (isActive, isNsfw, rankScore DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Group Actions & Analytics Ledger
CREATE TABLE IF NOT EXISTS group_actions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(100) NOT NULL,
  user_agent TEXT,
  user_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ga_group_action_created (group_id, action_type, created_at),
  INDEX idx_ga_created_action (created_at, action_type),
  INDEX idx_ga_ip_action (ip_address, action_type),
  INDEX idx_ga_created_action_group_ip (created_at, action_type, group_id, ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(500) DEFAULT NULL,
  display_name VARCHAR(255) DEFAULT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  role VARCHAR(50) DEFAULT 'user',
  credits DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  referral_code VARCHAR(100) UNIQUE DEFAULT NULL,
  referred_by VARCHAR(100) DEFAULT NULL,
  reputation_score INT DEFAULT 0,
  is_banned TINYINT(1) DEFAULT 0,
  claimed_community_ids JSON DEFAULT NULL,
  saved_group_ids JSON DEFAULT NULL,
  linked_accounts JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_referral (referral_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(100) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Credit & Points Ledger Table
CREATE TABLE IF NOT EXISTS credit_ledger (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cl_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Community Ownership Claims Table
CREATE TABLE IF NOT EXISTS community_claims (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  community_id VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) DEFAULT 'bio_code',
  verification_code VARCHAR(100) DEFAULT NULL,
  proof_url VARCHAR(500) DEFAULT NULL,
  proof_details TEXT DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  INDEX idx_cc_user (user_id),
  INDEX idx_cc_community (community_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Password Resets & OTP Tokens Table
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(20) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_email_otp (email, otp_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Web Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  platform VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ps_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
