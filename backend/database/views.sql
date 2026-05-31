-- ============================================================================
-- Database Views for 3D Reporter
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Live Agent Sales — per-agent sales & commission for each draw
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_agent_sales_live AS
SELECT
    b.draw_id,
    a.id         AS agent_id,
    a.name       AS agent_name,
    SUM(s.amount) AS total_sales,
    ROUND(SUM(s.amount) * a.commission_rate / 100.0, 2) AS commission_amount,
    ROUND(SUM(s.amount) * (1 - a.commission_rate / 100.0), 2) AS net_collection
FROM sales s
JOIN batches b ON b.id = s.batch_id
JOIN agents a ON a.id = b.agent_id
GROUP BY b.draw_id, a.id;

-- ----------------------------------------------------------------------------
-- 2. Live Master Dealer Exposure — per-dealer offloads & commission for each draw
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_master_exposure_live AS
SELECT
    o.draw_id,
    m.id         AS master_id,
    m.name       AS master_name,
    SUM(o.amount) AS total_offloaded,
    ROUND(SUM(o.amount) * m.commission_rate / 100.0, 2) AS commission_amount,
    ROUND(SUM(o.amount) * (1 - m.commission_rate / 100.0), 2) AS net_received
FROM offloaded o
JOIN master_dealers m ON m.id = o.master_dealer_id
GROUP BY o.draw_id, m.id;

-- ----------------------------------------------------------------------------
-- 3. Ticket Exposure Live — per-ticket risk with admin_hold, pending, risk level
-- ----------------------------------------------------------------------------
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
        ) >= 50000 THEN 'HIGH'
        WHEN (
            sold.total_sold
            - CASE
                  WHEN bt.restriction_type = 'BLOCK' THEN 0
                  ELSE MIN(sold.total_sold, d.house_holding_amount)
              END
            - COALESCE(offs.total_offloaded, 0)
        ) >= 10000 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_level
FROM sold
JOIN draws d ON d.id = sold.draw_id
LEFT JOIN offs ON offs.draw_id = sold.draw_id AND offs.ticket = sold.ticket
LEFT JOIN blacklist_tickets bt ON bt.draw_id = sold.draw_id AND bt.ticket = sold.ticket;

-- ----------------------------------------------------------------------------
-- 4. Current draw ticket sales (for the OPEN draw)
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_current_draw_ticket_sales AS
SELECT
    d.id           AS draw_id,
    s.ticket,
    SUM(s.amount)  AS total_sale_amount
FROM sales s
JOIN batches b ON b.id = s.batch_id
JOIN draws d ON d.id = b.draw_id
WHERE d.status = 'OPEN'
GROUP BY d.id, s.ticket;

-- ----------------------------------------------------------------------------
-- 5. Current draw ticket offloads (for the OPEN draw)
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_current_draw_ticket_offloads AS
SELECT
    d.id           AS draw_id,
    o.ticket,
    SUM(o.amount)  AS total_offloaded_amount
FROM offloaded o
JOIN draws d ON d.id = o.draw_id
WHERE d.status = 'OPEN'
GROUP BY d.id, o.ticket;
