-- ============================================================================
-- Database Views for 3D Reporter
-- ============================================================================
-- The "current draw" is the single draw whose status is 'OPEN'.
-- These views join against that draw so they always reflect the active draw
-- without requiring the caller to pass a draw_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Total sale amount per ticket in the current (OPEN) draw
-- ----------------------------------------------------------------------------
CREATE VIEW v_current_draw_ticket_sales AS
SELECT
    d.id         AS draw_id,
    s.ticket,
    SUM(s.amount) AS total_sale_amount
FROM sales s
JOIN draws d ON d.id = s.draw_id
WHERE d.status = 'OPEN'
GROUP BY d.id, s.ticket;

-- ----------------------------------------------------------------------------
-- 2. Total offloaded amount per ticket in the current (OPEN) draw
-- ----------------------------------------------------------------------------
CREATE VIEW v_current_draw_ticket_offloads AS
SELECT
    d.id         AS draw_id,
    o.ticket,
    SUM(o.amount) AS total_offloaded_amount
FROM offloaded o
JOIN draws d ON d.id = o.draw_id
WHERE d.status = 'OPEN'
GROUP BY d.id, o.ticket;
