-- Migration file to create the User table in Cloudflare D1
DROP TABLE IF EXISTS User;

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  did TEXT NOT NULL,
  handle TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to automatically update the updatedAt field on row updates
CREATE TRIGGER IF NOT EXISTS update_updatedAt
AFTER UPDATE ON User
FOR EACH ROW
BEGIN
  UPDATE User SET updatedAt = datetime('now') WHERE id = OLD.id;
END;

