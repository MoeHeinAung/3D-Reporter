-- =============================================================================
-- 3D Reporter — SQLite3 Database Schema
-- Generated: 2026-05-28
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =============================================================================
-- 1. AGENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id          TEXT NOT NULL PRIMARY KEY CHECK(length(id) <= 3),
    name        TEXT NOT NULL,
    commission  INTEGER NOT NULL DEFAULT 0,
    jp_factor   INTEGER NOT NULL DEFAULT 0,
    sp_factor   INTEGER NOT NULL DEFAULT 0,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- 2. MASTER DEALERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS master_dealers (
    id          TEXT NOT NULL PRIMARY KEY CHECK(length(id) <= 3),
    name        TEXT NOT NULL,
    commission  INTEGER NOT NULL DEFAULT 0,
    jp_factor   INTEGER NOT NULL DEFAULT 0,
    sp_factor   INTEGER NOT NULL DEFAULT 0,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- 3. DRAWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS draws (
    id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    open_date             TEXT    NOT NULL,
    cutoff_time           TEXT    NOT NULL,
    status                TEXT    NOT NULL DEFAULT 'OPEN'
                                  CHECK(status IN ('OPEN', 'CLOSED', 'SETTLED')),
    house_holding_amount  INTEGER NOT NULL DEFAULT 0,
    note                  TEXT,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- 4. BATCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS batches (
    id           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id      INTEGER NOT NULL,
    agent_id     TEXT    NOT NULL,
    total_amount INTEGER NOT NULL DEFAULT 0,
    note         TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (draw_id)  REFERENCES draws(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- =============================================================================
-- 5. SALES
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id    INTEGER NOT NULL,
    agent_id   TEXT    NOT NULL,
    batch_id   INTEGER NOT NULL,
    ticket     TEXT    NOT NULL CHECK(ticket GLOB '[0-9]*' AND length(ticket) BETWEEN 1 AND 3),
    amount     INTEGER NOT NULL CHECK(amount > 0),
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (draw_id)  REFERENCES draws(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- =============================================================================
-- 6. OFFLOADED
-- =============================================================================
CREATE TABLE IF NOT EXISTS offloaded (
    id                INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id           INTEGER NOT NULL,
    master_dealer_id  TEXT    NOT NULL,
    page_no           INTEGER NOT NULL,
    ticket            TEXT    NOT NULL CHECK(ticket GLOB '[0-9]*' AND length(ticket) BETWEEN 1 AND 3),
    amount            INTEGER NOT NULL CHECK(amount > 0),
    note              TEXT,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (draw_id)           REFERENCES draws(id),
    FOREIGN KEY (master_dealer_id)  REFERENCES master_dealers(id)
);

-- =============================================================================
-- 7. BLACKLIST TICKETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS blacklist_tickets (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id    INTEGER NOT NULL,
    ticket     TEXT    NOT NULL CHECK(ticket GLOB '[0-9]*' AND length(ticket) BETWEEN 1 AND 3),
    type       TEXT    NOT NULL CHECK(type IN ('HALF', 'BLOCK')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (draw_id) REFERENCES draws(id),

    UNIQUE(draw_id, ticket, type)
);

-- =============================================================================
-- 8. WINNING TICKETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS winning_tickets (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id    INTEGER NOT NULL,
    ticket     TEXT    NOT NULL CHECK(ticket GLOB '[0-9]*' AND length(ticket) BETWEEN 1 AND 3),
    type       TEXT    NOT NULL CHECK(type IN ('Jackpot', 'Minor')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (draw_id) REFERENCES draws(id),

    UNIQUE(draw_id, ticket, type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_batches_draw_id      ON batches(draw_id);
CREATE INDEX IF NOT EXISTS idx_batches_agent_id      ON batches(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_draw_id         ON sales(draw_id);
CREATE INDEX IF NOT EXISTS idx_sales_agent_id        ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_batch_id        ON sales(batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_ticket          ON sales(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_offloaded_draw_id     ON offloaded(draw_id);
CREATE INDEX IF NOT EXISTS idx_offloaded_dealer      ON offloaded(master_dealer_id);
CREATE INDEX IF NOT EXISTS idx_offloaded_ticket      ON offloaded(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_blacklist_draw_id     ON blacklist_tickets(draw_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_ticket      ON blacklist_tickets(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_winning_draw_id       ON winning_tickets(draw_id);
CREATE INDEX IF NOT EXISTS idx_draws_status          ON draws(status);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Only one draw may be OPEN at a time
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_draws_one_open_insert
BEFORE INSERT ON draws
WHEN NEW.status = 'OPEN'
BEGIN
    SELECT RAISE(ABORT, 'Cannot open a new draw: another draw is already OPEN.')
    FROM draws
    WHERE status = 'OPEN' AND id != NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_draws_one_open_update
BEFORE UPDATE OF status ON draws
WHEN NEW.status = 'OPEN' AND OLD.status != 'OPEN'
BEGIN
    SELECT RAISE(ABORT, 'Cannot set draw to OPEN: another draw is already OPEN.')
    FROM draws
    WHERE status = 'OPEN' AND id != NEW.id;
END;

-- ---------------------------------------------------------------------------
-- Status transitions must be OPEN → CLOSED → SETTLED (no backwards moves)
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_draws_status_transition
BEFORE UPDATE OF status ON draws
WHEN NEW.status != OLD.status
  AND NOT (
    (OLD.status = 'OPEN'   AND NEW.status = 'CLOSED')
    OR
    (OLD.status = 'CLOSED' AND NEW.status = 'SETTLED')
  )
BEGIN
    SELECT RAISE(ABORT,
        'Invalid status transition: ' || OLD.status || ' → ' || NEW.status
        || '. Allowed: OPEN→CLOSED, CLOSED→SETTLED.'
    );
END;

-- ---------------------------------------------------------------------------
-- Sales: draw must be OPEN and cutoff_time must not have passed
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_sales_check_draw_open
BEFORE INSERT ON sales
BEGIN
    SELECT RAISE(ABORT, 'Sales are only allowed when the draw is OPEN.')
    FROM draws
    WHERE id = NEW.draw_id AND status != 'OPEN';

    SELECT RAISE(ABORT, 'Sales are closed: cutoff time has passed.')
    FROM draws
    WHERE id = NEW.draw_id
      AND status = 'OPEN'
      AND datetime('now') > datetime(cutoff_time);
END;

-- ---------------------------------------------------------------------------
-- Sales: batch must belong to the same draw and agent
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_sales_check_batch
BEFORE INSERT ON sales
BEGIN
    SELECT RAISE(ABORT,
        'Batch ' || NEW.batch_id || ' does not match draw ' || NEW.draw_id
        || ' and agent ' || NEW.agent_id || '.'
    )
    FROM batches
    WHERE id = NEW.batch_id
      AND (draw_id != NEW.draw_id OR agent_id != NEW.agent_id);
END;

-- ---------------------------------------------------------------------------
-- Sales: BLOCK-listed tickets prevent direct sale (must go through offloaded)
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_sales_block_blacklist
BEFORE INSERT ON sales
BEGIN
    SELECT RAISE(ABORT,
        'Ticket ' || NEW.ticket || ' is BLOCK-listed for draw ' || NEW.draw_id
        || '. Sale amount must be offloaded to a master dealer instead.'
    )
    FROM blacklist_tickets
    WHERE draw_id = NEW.draw_id
      AND ticket  = NEW.ticket
      AND type    = 'BLOCK';
END;

-- ---------------------------------------------------------------------------
-- Batches: keep total_amount in sync with sum of sales
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_sales_insert_total
AFTER INSERT ON sales
BEGIN
    UPDATE batches
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id
    )
    WHERE id = NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_update_total
AFTER UPDATE OF amount ON sales
BEGIN
    UPDATE batches
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id
    )
    WHERE id = NEW.batch_id;

    UPDATE batches
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = OLD.batch_id
    )
    WHERE id = OLD.batch_id AND OLD.batch_id != NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_delete_total
AFTER DELETE ON sales
BEGIN
    UPDATE batches
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = OLD.batch_id
    )
    WHERE id = OLD.batch_id;
END;

-- ---------------------------------------------------------------------------
-- Offloaded: draw must not be SETTLED
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_offloaded_check_draw
BEFORE INSERT ON offloaded
BEGIN
    SELECT RAISE(ABORT, 'Cannot offload to a SETTLED draw.')
    FROM draws
    WHERE id = NEW.draw_id AND status = 'SETTLED';
END;

-- ---------------------------------------------------------------------------
-- Winning tickets: draw must exist and not already be SETTLED (prevent dupes)
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_winning_check_draw
BEFORE INSERT ON winning_tickets
BEGIN
    SELECT RAISE(ABORT, 'Winning tickets can only be assigned to non-SETTLED draws.')
    FROM draws
    WHERE id = NEW.draw_id AND status = 'SETTLED';
END;
