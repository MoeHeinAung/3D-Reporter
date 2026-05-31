"""
Convert Excel lottery data to SQLite database with business logic views.
Run: python convert_to_db.py
Output: lottery.db
"""

import pandas as pd
import sqlite3
from datetime import timedelta
import warnings
import re

warnings.filterwarnings("ignore", category=UserWarning, module="pandas")

# ------------------------------
# Helper: Convert column names to snake_case
# ------------------------------
def to_snake_case(name):
    """Convert column name to snake_case (e.g., 'Open Date' -> 'open_date')"""
    name = str(name).strip()
    # Replace spaces with underscore
    name = re.sub(r'\s+', '_', name)
    # Replace hyphens with underscore
    name = name.replace('-', '_')
    # Lowercase everything
    name = name.lower()
    return name

# ------------------------------
# 1. Load and clean data
# ------------------------------
def clean_quotes(val):
    if isinstance(val, str) and val.startswith("'") and val.endswith("'"):
        return val[1:-1]
    return val

xls = pd.ExcelFile('DatabaseTest.xlsx')

# Read all sheets
agent = pd.read_excel(xls, 'Agent')
master_dealer = pd.read_excel(xls, 'Master Dealer')
draw = pd.read_excel(xls, 'Draw')
blacklist = pd.read_excel(xls, 'Blacklist Tickets')
sale = pd.read_excel(xls, 'Sale')
batches = pd.read_excel(xls, 'Batches')
offloaded = pd.read_excel(xls, 'Offloaded')
winning = pd.read_excel(xls, 'Sheet1')

# Rename columns to snake_case for SQL compatibility
agent.columns = [to_snake_case(c) for c in agent.columns]
master_dealer.columns = [to_snake_case(c) for c in master_dealer.columns]
draw.columns = [to_snake_case(c) for c in draw.columns]
blacklist.columns = [to_snake_case(c) for c in blacklist.columns]
sale.columns = [to_snake_case(c) for c in sale.columns]
batches.columns = [to_snake_case(c) for c in batches.columns]
offloaded.columns = [to_snake_case(c) for c in offloaded.columns]
winning.columns = [to_snake_case(c) for c in winning.columns]

# Clean quotes from all string columns
for df in [agent, master_dealer, draw, blacklist, sale, batches, offloaded, winning]:
    for col in df.select_dtypes(include=['object', 'string']).columns:
        df[col] = df[col].apply(clean_quotes)

# Debug: print column names to verify
print("Offloaded columns:", offloaded.columns.tolist())

# Convert datetime columns safely
def safe_convert_dates(df, cols):
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')

# Convert all common date columns
for df in [agent, master_dealer, draw, blacklist, sale, batches, offloaded, winning]:
    if 'created_at' in df.columns:
        safe_convert_dates(df, ['created_at'])
if 'open_date' in draw.columns:
    safe_convert_dates(draw, ['open_date'])
if 'cutoff_time' in draw.columns:
    draw['cutoff_time'] = pd.to_datetime(draw['cutoff_time'], errors='coerce').dt.time

# Drop rows with NaT in critical date columns (only if column exists)
if 'created_at' in offloaded.columns:
    offloaded = offloaded.dropna(subset=['created_at'])
if 'created_at' in sale.columns:
    sale = sale.dropna(subset=['created_at'])

# Convert numeric columns
for col in ['commission', 'jp_factor', 'sp_factor']:
    if col in agent.columns:
        agent[col] = pd.to_numeric(agent[col], errors='coerce')
    if col in master_dealer.columns:
        master_dealer[col] = pd.to_numeric(master_dealer[col], errors='coerce')
if 'house_holding_amount' in draw.columns:
    draw['house_holding_amount'] = pd.to_numeric(draw['house_holding_amount'], errors='coerce')
if 'amount' in sale.columns:
    sale['amount'] = pd.to_numeric(sale['amount'], errors='coerce')
if 'total_amount' in batches.columns:
    batches['total_amount'] = pd.to_numeric(batches['total_amount'], errors='coerce')
if 'amount' in offloaded.columns:
    offloaded['amount'] = pd.to_numeric(offloaded['amount'], errors='coerce')

# ------------------------------
# 2. Adjust offloaded timestamps
# ------------------------------
if 'draw_id' in sale.columns and 'ticket' in sale.columns and 'created_at' in sale.columns:
    latest_sale = sale[sale['draw_id'] == 1].groupby('ticket')['created_at'].max().to_dict()
    
    def adjust_offloaded_time(row):
        ticket = row['ticket']
        if ticket in latest_sale and pd.notna(latest_sale[ticket]):
            return latest_sale[ticket] + timedelta(seconds=1)
        return row['created_at']
    
    if 'created_at' in offloaded.columns:
        offloaded['created_at'] = offloaded.apply(adjust_offloaded_time, axis=1)

# ------------------------------
# 3. Create SQLite database
# ------------------------------
conn = sqlite3.connect('lottery.db')
cursor = conn.cursor()

# Create tables with snake_case column names
cursor.executescript('''
DROP TABLE IF EXISTS Agent;
CREATE TABLE Agent (
    id TEXT PRIMARY KEY,
    name TEXT,
    commission REAL,
    jp_factor INTEGER,
    sp_factor INTEGER,
    notes TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS MasterDealer;
CREATE TABLE MasterDealer (
    id TEXT PRIMARY KEY,
    name TEXT,
    commission REAL,
    jp_factor INTEGER,
    sp_factor INTEGER,
    note TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS Draw;
CREATE TABLE Draw (
    id INTEGER PRIMARY KEY,
    open_date TEXT,
    cutoff_time TEXT,
    status TEXT,
    house_holding_amount INTEGER,
    note TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS BlacklistTickets;
CREATE TABLE BlacklistTickets (
    id INTEGER PRIMARY KEY,
    draw_id INTEGER,
    ticket TEXT,
    type TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS Sale;
CREATE TABLE Sale (
    id INTEGER PRIMARY KEY,
    draw_id INTEGER,
    agent_id TEXT,
    batch_id INTEGER,
    ticket TEXT,
    amount INTEGER,
    note TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS Batches;
CREATE TABLE Batches (
    id INTEGER PRIMARY KEY,
    draw_id INTEGER,
    agent_id TEXT,
    total_amount INTEGER,
    note TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS Offloaded;
CREATE TABLE Offloaded (
    id INTEGER PRIMARY KEY,
    draw_id INTEGER,
    master_dealer_id TEXT,
    page_no INTEGER,
    ticket TEXT,
    amount INTEGER,
    note TEXT,
    created_at TEXT
);

DROP TABLE IF EXISTS WinningTickets;
CREATE TABLE WinningTickets (
    id INTEGER PRIMARY KEY,
    draw_id INTEGER,
    ticket TEXT,
    type TEXT,
    notes TEXT,
    created_at TEXT
);
''')

# Insert data (use replace to avoid duplicates)
agent.to_sql('Agent', conn, if_exists='replace', index=False)
master_dealer.to_sql('MasterDealer', conn, if_exists='replace', index=False)
draw.to_sql('Draw', conn, if_exists='replace', index=False)
blacklist.to_sql('BlacklistTickets', conn, if_exists='replace', index=False)
sale.to_sql('Sale', conn, if_exists='replace', index=False)
batches.to_sql('Batches', conn, if_exists='replace', index=False)
offloaded.to_sql('Offloaded', conn, if_exists='replace', index=False)
winning.to_sql('WinningTickets', conn, if_exists='replace', index=False)

# ------------------------------
# 4. Create indexes
# ------------------------------
cursor.executescript('''
CREATE INDEX IF NOT EXISTS idx_sale_draw_ticket ON Sale(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_sale_agent ON Sale(agent_id);
CREATE INDEX IF NOT EXISTS idx_offloaded_draw_ticket ON Offloaded(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_offloaded_master ON Offloaded(master_dealer_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_draw_ticket ON BlacklistTickets(draw_id, ticket);
CREATE INDEX IF NOT EXISTS idx_winning_draw_ticket ON WinningTickets(draw_id, ticket);
''')

# ------------------------------
# 5. Create business logic views
# ------------------------------
cursor.executescript('''
CREATE VIEW IF NOT EXISTS v_agent_commission AS
SELECT id, commission/100.0 AS rate FROM Agent;

CREATE VIEW IF NOT EXISTS v_master_commission AS
SELECT id, commission/100.0 AS rate FROM MasterDealer;

CREATE VIEW IF NOT EXISTS v_blacklist_half AS
SELECT draw_id, ticket, 0.5 AS half_factor
FROM BlacklistTickets WHERE type = 'HALF'
UNION ALL
SELECT draw_id, ticket, 1.0 AS half_factor
FROM (SELECT DISTINCT draw_id, ticket FROM Sale WHERE draw_id = 1)
WHERE ticket NOT IN (SELECT ticket FROM BlacklistTickets WHERE draw_id = 1 AND type = 'HALF');

CREATE VIEW IF NOT EXISTS v_agent_winning_payout AS
SELECT
    s.agent_id,
    s.batch_id,
    s.ticket,
    s.amount,
    w.type,
    s.amount *
        CASE w.type
            WHEN 'Jackpot' THEN a.jp_factor
            WHEN 'Minor'   THEN a.sp_factor
        END *
        COALESCE(bh.half_factor, 1.0) AS payout
FROM Sale s
JOIN WinningTickets w ON s.draw_id = w.draw_id AND s.ticket = w.ticket
JOIN Agent a ON s.agent_id = a.id
LEFT JOIN v_blacklist_half bh ON bh.draw_id = s.draw_id AND bh.ticket = s.ticket
WHERE s.draw_id = 1;

CREATE VIEW IF NOT EXISTS v_master_winning_payout AS
SELECT
    o.master_dealer_id,
    o.ticket,
    o.amount AS offloaded_amount,
    w.type,
    o.amount *
        CASE w.type
            WHEN 'Jackpot' THEN md.jp_factor
            WHEN 'Minor'   THEN md.sp_factor
        END *
        COALESCE(bh.half_factor, 1.0) AS payout_to_admin
FROM Offloaded o
JOIN WinningTickets w ON o.draw_id = w.draw_id AND o.ticket = w.ticket
JOIN MasterDealer md ON o.master_dealer_id = md.id
LEFT JOIN v_blacklist_half bh ON bh.draw_id = o.draw_id AND bh.ticket = o.ticket
WHERE o.draw_id = 1;

CREATE VIEW IF NOT EXISTS v_agent_final AS
SELECT
    a.id AS agent_id,
    a.name,
    COALESCE(SUM(s.amount), 0) AS total_sales,
    COALESCE(SUM(s.amount), 0) * (a.commission/100.0) AS commission,
    COALESCE(SUM(awp.payout), 0) AS winning_payout,
    COALESCE(SUM(s.amount), 0) * (a.commission/100.0) + COALESCE(SUM(awp.payout), 0) AS net_amount
FROM Agent a
LEFT JOIN Sale s ON a.id = s.agent_id AND s.draw_id = 1
LEFT JOIN v_agent_winning_payout awp ON a.id = awp.agent_id
GROUP BY a.id;

CREATE VIEW IF NOT EXISTS v_master_final AS
SELECT
    md.id AS master_dealer_id,
    md.name,
    COALESCE(SUM(o.amount), 0) AS total_offloaded,
    COALESCE(SUM(o.amount), 0) * (md.commission/100.0) AS commission_to_admin,
    COALESCE(SUM(o.amount), 0) - COALESCE(SUM(o.amount), 0) * (md.commission/100.0) AS net_received,
    COALESCE(SUM(mwp.payout_to_admin), 0) AS winning_payout_to_admin,
    (COALESCE(SUM(o.amount), 0) - COALESCE(SUM(o.amount), 0) * (md.commission/100.0))
        - COALESCE(SUM(mwp.payout_to_admin), 0) AS net_profit
FROM MasterDealer md
LEFT JOIN Offloaded o ON md.id = o.master_dealer_id AND o.draw_id = 1
LEFT JOIN v_master_winning_payout mwp ON md.id = mwp.master_dealer_id
GROUP BY md.id;

CREATE VIEW IF NOT EXISTS v_admin_summary AS
SELECT
    (SELECT SUM(total_sales) FROM v_agent_final) AS total_sales,
    (SELECT SUM(commission) FROM v_agent_final) AS total_agent_commission,
    (SELECT SUM(winning_payout) FROM v_agent_final) AS total_agent_winning_payout,
    (SELECT SUM(net_profit) FROM v_master_final) AS total_master_profit;

CREATE VIEW IF NOT EXISTS v_admin_profit_loss AS
SELECT
    total_sales - total_agent_commission - total_agent_winning_payout + total_master_profit AS admin_net_profit
FROM v_admin_summary;

CREATE VIEW IF NOT EXISTS v_winning_ticket_details AS
SELECT
    w.ticket,
    w.type,
    s.agent_id,
    a.name AS agent_name,
    s.batch_id,
    s.amount AS sale_amount,
    a.jp_factor,
    a.sp_factor,
    COALESCE(bh.half_factor, 1.0) AS half_factor,
    s.amount *
        CASE w.type
            WHEN 'Jackpot' THEN a.jp_factor
            WHEN 'Minor'   THEN a.sp_factor
        END *
        COALESCE(bh.half_factor, 1.0) AS admin_payout_to_agent
FROM WinningTickets w
JOIN Sale s ON w.draw_id = s.draw_id AND w.ticket = s.ticket
JOIN Agent a ON s.agent_id = a.id
LEFT JOIN v_blacklist_half bh ON bh.draw_id = s.draw_id AND bh.ticket = s.ticket
WHERE w.draw_id = 1
ORDER BY w.ticket, s.agent_id, s.batch_id;
''')

# ------------------------------
# 6. Verification
# ------------------------------
print("Database 'lottery.db' created successfully.")
print("\n--- Agent Summary ---")
for row in cursor.execute("SELECT agent_id, total_sales, commission, winning_payout, net_amount FROM v_agent_final").fetchall():
    print(row)
print("\n--- Master Dealer Summary ---")
for row in cursor.execute("SELECT master_dealer_id, total_offloaded, commission_to_admin, net_received, winning_payout_to_admin, net_profit FROM v_master_final").fetchall():
    print(row)
print("\n--- Admin Profit/Loss ---")
result = cursor.execute("SELECT * FROM v_admin_profit_loss").fetchone()
if result:
    print(result[0])
else:
    print("No data")
conn.close()
print("\nDone.")