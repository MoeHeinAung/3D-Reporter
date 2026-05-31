-- =============================================================================
-- Reference DDL — matches SQLAlchemy ORM (backend/database/models.py).
-- The ORM is authoritative. This file is for documentation only.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- 1. DRAWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS draws (
    id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_name             TEXT    NOT NULL,
    house_holding_amount  INTEGER NOT NULL,
    status                TEXT    NOT NULL DEFAULT 'OPEN'
                                  CHECK(status IN ('OPEN','CLOSED','SETTLED')),
    opened_at             DATETIME,
    closed_at             DATETIME,
    settled_at            DATETIME,
    notes                 TEXT
);

-- =============================================================================
-- 2. AGENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id              TEXT NOT NULL PRIMARY KEY,
    name            TEXT NOT NULL,
    commission_rate REAL NOT NULL,
    jp_factor       REAL NOT NULL,
    sp_factor       REAL NOT NULL,
    active          INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME
);

-- =============================================================================
-- 3. MASTER DEALERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS master_dealers (
    id              TEXT NOT NULL PRIMARY KEY,
    name            TEXT NOT NULL,
    commission_rate REAL NOT NULL,
    jp_factor       REAL NOT NULL,
    sp_factor       REAL NOT NULL,
    active          INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME
);

-- =============================================================================
-- 4. BLACKLIST TICKETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS blacklist_tickets (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id          INTEGER NOT NULL,
    ticket           TEXT    NOT NULL CHECK(length(ticket) = 3),
    restriction_type TEXT    NOT NULL CHECK(restriction_type IN ('HALF','BLOCK')),

    FOREIGN KEY (draw_id) REFERENCES draws(id),

    UNIQUE(draw_id, ticket)
);

-- =============================================================================
-- 5. BATCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS batches (
    id           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id      INTEGER NOT NULL,
    agent_id     TEXT    NOT NULL,
    batch_no     TEXT    NOT NULL,
    total_amount INTEGER NOT NULL DEFAULT 0,
    ticket_count INTEGER NOT NULL DEFAULT 0,
    created_at   DATETIME,
    closed_at    DATETIME,
    remarks      TEXT,

    FOREIGN KEY (draw_id)  REFERENCES draws(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),

    UNIQUE(draw_id, batch_no)
);

-- =============================================================================
-- 6. SALES
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    batch_id   INTEGER NOT NULL,
    ticket     TEXT    NOT NULL CHECK(length(ticket) = 3),
    amount     INTEGER NOT NULL CHECK(amount >= 0),
    created_at DATETIME,

    FOREIGN KEY (batch_id) REFERENCES batches(id),

    UNIQUE(batch_id, ticket)
);

-- =============================================================================
-- 7. OFFLOADED
-- =============================================================================
CREATE TABLE IF NOT EXISTS offloaded (
    id                INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id           INTEGER NOT NULL,
    master_dealer_id  TEXT    NOT NULL,
    ticket            TEXT    NOT NULL CHECK(length(ticket) = 3),
    amount            INTEGER NOT NULL CHECK(amount > 0),
    page_no           TEXT,
    created_at        DATETIME,
    notes             TEXT,

    FOREIGN KEY (draw_id)          REFERENCES draws(id),
    FOREIGN KEY (master_dealer_id) REFERENCES master_dealers(id)
);

-- =============================================================================
-- 8. WINNING TICKETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS winning_tickets (
    id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id    INTEGER NOT NULL,
    ticket     TEXT    NOT NULL CHECK(length(ticket) = 3),
    prize_type TEXT    NOT NULL CHECK(prize_type IN ('JACKPOT','MINOR')),

    FOREIGN KEY (draw_id) REFERENCES draws(id),

    UNIQUE(draw_id, ticket)
);

-- =============================================================================
-- 9. DRAW TICKET SNAPSHOT
-- =============================================================================
CREATE TABLE IF NOT EXISTS draw_ticket_snapshot (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id          INTEGER NOT NULL,
    ticket           TEXT    NOT NULL,
    total_sold       INTEGER NOT NULL,
    admin_hold       INTEGER NOT NULL,
    total_offloaded  INTEGER NOT NULL,
    pending          INTEGER NOT NULL,
    restriction_type TEXT,
    created_at       DATETIME,

    FOREIGN KEY (draw_id) REFERENCES draws(id)
);

-- =============================================================================
-- 10. SETTLEMENT — AGENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS draw_settlement_agent (
    id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id               INTEGER NOT NULL,
    agent_id              TEXT    NOT NULL,
    commission_rate_used  REAL    NOT NULL,
    jp_factor_used        REAL    NOT NULL,
    sp_factor_used        REAL    NOT NULL,
    total_sales           INTEGER NOT NULL,
    commission_amount     INTEGER NOT NULL,
    net_collection        INTEGER NOT NULL,
    winning_settlement    INTEGER NOT NULL,
    final_balance         INTEGER NOT NULL,

    FOREIGN KEY (draw_id)  REFERENCES draws(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- =============================================================================
-- 11. SETTLEMENT — MASTER DEALER
-- =============================================================================
CREATE TABLE IF NOT EXISTS draw_settlement_master (
    id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id               INTEGER NOT NULL,
    master_dealer_id      TEXT    NOT NULL,
    commission_rate_used  REAL    NOT NULL,
    jp_factor_used        REAL    NOT NULL,
    sp_factor_used        REAL    NOT NULL,
    total_offloaded       INTEGER NOT NULL,
    commission_amount     INTEGER NOT NULL,
    net_received          INTEGER NOT NULL,
    winning_liability     INTEGER NOT NULL,
    profit_loss           INTEGER NOT NULL,

    FOREIGN KEY (draw_id)          REFERENCES draws(id),
    FOREIGN KEY (master_dealer_id) REFERENCES master_dealers(id)
);

-- =============================================================================
-- 12. SETTLEMENT — PER TICKET
-- =============================================================================
CREATE TABLE IF NOT EXISTS draw_settlement_ticket (
    id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    draw_id               INTEGER NOT NULL,
    ticket                TEXT    NOT NULL,
    prize_type            TEXT,
    total_sold            INTEGER NOT NULL,
    admin_hold            INTEGER NOT NULL,
    offloaded             INTEGER NOT NULL,
    pending               INTEGER NOT NULL,
    admin_agent_settlement INTEGER NOT NULL,
    master_recovery       INTEGER NOT NULL,
    admin_profit_loss     INTEGER NOT NULL,

    FOREIGN KEY (draw_id) REFERENCES draws(id)
);

-- =============================================================================
-- 13. SETTLEMENT — DRAW SUMMARY
-- =============================================================================
CREATE TABLE IF NOT EXISTS draw_settlement_summary (
    draw_id                  INTEGER NOT NULL PRIMARY KEY,
    total_sales              INTEGER NOT NULL,
    total_agent_commission   INTEGER NOT NULL,
    total_agent_settlement   INTEGER NOT NULL,
    total_master_commission  INTEGER NOT NULL,
    total_master_recovery    INTEGER NOT NULL,
    admin_net_profit         INTEGER NOT NULL,
    settled_at               DATETIME NOT NULL,

    FOREIGN KEY (draw_id) REFERENCES draws(id)
);

-- =============================================================================
-- 14. PREFERENCES (key-value store)
-- =============================================================================
CREATE TABLE IF NOT EXISTS preferences (
    key   TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_batches_draw       ON batches(draw_id);
CREATE INDEX IF NOT EXISTS idx_batches_agent      ON batches(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_batch        ON sales(batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_ticket       ON sales(ticket);
CREATE INDEX IF NOT EXISTS idx_offloaded_draw_ticket ON offloaded(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_winners_draw       ON winning_tickets(draw_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_draw     ON blacklist_tickets(draw_id);

-- =============================================================================
-- TRIGGERS (batch total_amount / ticket_count maintenance)
-- These match the trigger block installed by backend/database/connection.py.
-- =============================================================================
CREATE TRIGGER IF NOT EXISTS trg_sales_insert
AFTER INSERT ON sales
BEGIN
    UPDATE batches
    SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id),
        ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = NEW.batch_id)
    WHERE id = NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_update
AFTER UPDATE ON sales
BEGIN
    UPDATE batches
    SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = NEW.batch_id),
        ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = NEW.batch_id)
    WHERE id = NEW.batch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_delete
AFTER DELETE ON sales
BEGIN
    UPDATE batches
    SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE batch_id = OLD.batch_id),
        ticket_count = (SELECT COUNT(*) FROM sales WHERE batch_id = OLD.batch_id)
    WHERE id = OLD.batch_id;
END;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Live agent sales summary
CREATE VIEW IF NOT EXISTS v_agent_sales_live AS
SELECT
    b.draw_id,
    a.id          AS agent_id,
    a.name        AS agent_name,
    SUM(s.amount) AS total_sales,
    ROUND(SUM(s.amount) * a.commission_rate / 100.0, 2) AS commission_amount,
    ROUND(SUM(s.amount) * (1 - a.commission_rate / 100.0), 2) AS net_collection
FROM sales s
JOIN batches b ON b.id = s.batch_id
JOIN agents  a ON a.id = b.agent_id
GROUP BY b.draw_id, a.id;

-- Live master dealer exposure
CREATE VIEW IF NOT EXISTS v_master_exposure_live AS
SELECT
    o.draw_id,
    m.id          AS master_id,
    m.name        AS master_name,
    SUM(o.amount) AS total_offloaded,
    ROUND(SUM(o.amount) * m.commission_rate / 100.0, 2) AS commission_amount,
    ROUND(SUM(o.amount) * (1 - m.commission_rate / 100.0), 2) AS net_received
FROM offloaded o
JOIN master_dealers m ON m.id = o.master_dealer_id
GROUP BY o.draw_id, m.id;

-- Live ticket exposure with risk levels
CREATE VIEW IF NOT EXISTS v_ticket_exposure_live AS
WITH sold AS (
    SELECT b.draw_id, s.ticket, SUM(s.amount) AS total_sold
    FROM sales s
    JOIN batches b ON b.id = s.batch_id
    GROUP BY b.draw_id, s.ticket
),
offs AS (
    SELECT draw_id, ticket, SUM(amount) AS total_offloaded
    FROM offloaded
    GROUP BY draw_id, ticket
)
SELECT
    sold.draw_id,
    sold.ticket,
    sold.total_sold,
    CASE
        WHEN bt.restriction_type = 'BLOCK' THEN 0
        ELSE MIN(sold.total_sold, d.house_holding_amount)
    END AS admin_hold,
    COALESCE(offs.total_offloaded, 0) AS total_offloaded,
    MAX(
        sold.total_sold
        - CASE
            WHEN bt.restriction_type = 'BLOCK' THEN 0
            ELSE MIN(sold.total_sold, d.house_holding_amount)
          END
        - COALESCE(offs.total_offloaded, 0),
        0
    ) AS pending,
    CASE
        WHEN (
            sold.total_sold
            - CASE
                WHEN bt.restriction_type = 'BLOCK' THEN 0
                ELSE MIN(sold.total_sold, d.house_holding_amount)
              END
            - COALESCE(offs.total_offloaded, 0)
        ) >= 100000 THEN 'CRITICAL'
        WHEN (
            sold.total_sold
            - CASE
                WHEN bt.restriction_type = 'BLOCK' THEN 0
                ELSE MIN(sold.total_sold, d.house_holding_amount)
              END
            - COALESCE(offs.total_offloaded, 0)
        ) >= 50000  THEN 'HIGH'
        WHEN (
            sold.total_sold
            - CASE
                WHEN bt.restriction_type = 'BLOCK' THEN 0
                ELSE MIN(sold.total_sold, d.house_holding_amount)
              END
            - COALESCE(offs.total_offloaded, 0)
        ) >= 10000  THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_level
FROM sold
JOIN draws d ON d.id = sold.draw_id
LEFT JOIN offs ON offs.draw_id = sold.draw_id AND offs.ticket = sold.ticket
LEFT JOIN blacklist_tickets bt ON bt.draw_id = sold.draw_id AND bt.ticket = sold.ticket;
