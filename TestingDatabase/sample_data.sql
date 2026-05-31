-- Sample Data Generation

-- 1. Draws
INSERT INTO draws (id, draw_name, house_holding_amount) VALUES (1, 'Draw-2026-05-31', 500);

-- 2. Agents
INSERT INTO agents (id, name, commission_rate, jp_factor, sp_factor) VALUES 
('A001', 'Agent One', 10.0, 1.0, 0.5),
('A002', 'Agent Two', 12.0, 1.0, 0.5);

-- 3. Master Dealers
INSERT INTO master_dealers (id, name, commission_rate, jp_factor, sp_factor) VALUES 
('M001', 'Master One', 5.0, 1.0, 0.5);

-- 4. Batches
INSERT INTO batches (id, draw_id, agent_id, batch_no) VALUES 
(1, 1, 'A001', 'B001'),
(2, 1, 'A002', 'B002');

-- 5. Sales (Triggers will auto-update batches)
INSERT INTO sales (batch_id, ticket, amount) VALUES 
(1, '123', 100),
(1, '456', 200),
(2, '123', 150),
(2, '789', 300);

-- 6. Offloads
INSERT INTO offloaded (draw_id, master_dealer_id, ticket, amount) VALUES 
(1, 'M001', '123', 50);

-- 7. Blacklist
INSERT INTO blacklist_tickets (draw_id, ticket, restriction_type) VALUES 
(1, '999', 'BLOCK');
