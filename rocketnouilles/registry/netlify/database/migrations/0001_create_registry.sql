CREATE TABLE noodle_tables (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE peers (
  table_code TEXT NOT NULL REFERENCES noodle_tables(code),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (table_code, name)
);

CREATE INDEX peers_last_seen_idx ON peers (table_code, last_seen_at);

INSERT INTO noodle_tables (code, name, position) VALUES
  ('RAMEN', 'Ramen Rockets', 1),
  ('UDON', 'Udon Orbiters', 2),
  ('SOBA', 'Soba Satellites', 3);
