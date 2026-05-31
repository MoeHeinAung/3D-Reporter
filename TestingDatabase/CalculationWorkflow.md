## Corrected Workflow – Based on Your Example and Clarifications

After carefully analyzing your example, I now understand the exact logic. Below is the **corrected step‑by‑step workflow** for the lottery system, including multiple master dealers and the proper profit/loss formulas.

---

### 1. Master Data Setup

- **Draw**: has a `House_Holding_Amount` (e.g., 20,000) per ticket.
- **Agents** (multiple): each has `Commission%`, `JP_Factor`, `SP_Factor`.
- **Master Dealers** (multiple): each has `Commission%`, `JP_Factor`, `SP_Factor`.
- **Blacklist**: tickets marked `'HALF'` (payouts halved) or `'BLOCK'` (Admin holds 0, full amount offloaded).
- **Winning Tickets**: after draw closes, each has a type `'Jackpot'` or `'Minor'`.

---

### 2. Ticket Sales

- Agents sell tickets. Each sale record: `(Draw_ID, Agent_ID, Batch_ID, Ticket, Amount, Timestamp)`.
- A ticket can be sold many times by the same or different agents.

---

### 3. Aggregation per Ticket (Admin & Offload)

For each ticket number `t` within the draw:

```
Total_Sold[t] = sum of all sale amounts for t
```

Admin_Hold[t] =  
- If ticket is blacklisted as `'BLOCK'` → `0`  
- Else → `min(Total_Sold[t], House_Holding_Amount)`

Offloaded_Amount[t] = `Total_Sold[t] - Admin_Hold[t]`

The offloaded amount can be **split among multiple master dealers** (each master dealer receives a portion, recorded in the `Offloaded` table with their ID and amount).

---

### 4. Offloading

For each ticket, Admin tracks Pending[t] in real time.

When Admin decides to offload an amount X (≤ Pending[t]) to a master dealer m, it creates an offloaded record with that amount, master dealer ID, and a new page number (or timestamp).

Admin then:

Increases Total_Offloaded[t] by X

Decreases Pending[t] by X

Records the transfer so that future winning payouts for that ticket will allocate the offloaded portion to master dealer m.

Multiple master dealers can receive portions of the same ticket’s pending amount over time.

---

### 5. Winning Payouts

When a ticket `t` wins (type = Jackpot or Minor):

#### 5.1 Admin Pays Agents (full amount of agent’s sale)

For each agent `a` who sold amount `S_a` of ticket `t`:

```
Agent_Payout[a] = S_a × Factor × Half_Flag
```
- Factor = Agent’s `JP_Factor` (Jackpot) or `SP_Factor` (Minor)
- Half_Flag = 0.5 if ticket is blacklisted `'HALF'`, else 1

**Total Admin_Payout_To_Agents** = sum over all agents of `Agent_Payout[a]`

#### 5.2 Master Dealers Pay Admin (on their offloaded portion)

For each master dealer `m` who received offloaded amount `O_m` of ticket `t`:

```
Master_Payout_To_Admin[m] = O_m × Master_Factor × Half_Flag
```
- Master_Factor = Master Dealer’s `JP_Factor` or `SP_Factor`
- Half_Flag as above

**Total Master_Payout_To_Admin** = sum over all master dealers of `Master_Payout_To_Admin[m]`

---

### 6. Commission Settlements

#### 6.1 Agent Commission (paid by Admin to agents)

```
Agent_Commission[a] = (Agent_Commission_Rate[a] / 100) × Total_Sales_of_Agent[a]
```
Total_Sales_of_Agent[a] = sum of all amounts sold by that agent (all tickets, regardless of winning/losing).

#### 6.2 Master Dealer Commission (paid by master dealer to Admin)

For each master dealer `m`:

```
Master_Commission_To_Admin[m] = (Master_Commission_Rate[m] / 100) × Total_Offloaded_To_Master[m]
```
Where `Total_Offloaded_To_Master[m]` = sum of all offloaded amounts received by that master dealer (over all tickets).

---

### 7. Net Cash Flow Between Admin and Each Master Dealer

For a given master dealer `m`:

```
Gross_Offloaded = Total_Offloaded_To_Master[m]
Net_Offloaded_Received_By_Master = Gross_Offloaded – Master_Commission_To_Admin[m]
```

Then, after winning tickets are resolved:

```
Master_Net_Profit_Loss[m] = Net_Offloaded_Received_By_Master – Total_Master_Payout_To_Admin[m]
```

- If positive → master dealer makes a net profit (receives money from Admin after all settlements).
- If negative → master dealer pays the absolute amount to Admin.

In practice, the net transfer from Admin to master dealer is exactly `Master_Net_Profit_Loss[m]`.  
If negative, the master dealer pays that amount to Admin.

---

### 8. Admin Profit/Loss for the Entire Draw

```
Admin_Net_Profit = 
    Total_Sales_All_Agents
    – Total_Agent_Commission
    – Total_Admin_Payout_To_Agents
    + ∑(Master_Net_Profit_Loss[m]) over all master dealers
```

Because `Master_Net_Profit_Loss[m]` already includes the commission paid to Admin and the master dealer’s payout to Admin, the above formula works.

Alternatively, expand:

```
Admin_Net_Profit = 
    Total_Sales_All_Agents
    – Total_Agent_Commission
    – Total_Admin_Payout_To_Agents
    + ∑(Gross_Offloaded[m] – Master_Commission_To_Admin[m] – Total_Master_Payout_To_Admin[m])
```

---

### 9. Purpose of Admin_Hold

The `Admin_Hold` determines **how much of each ticket’s total sales the Admin keeps on its own books**.  
- If the ticket loses, Admin collects the full sales amount from agents (after agent commission) and pays the master dealer only the net offloaded amount (after master commission). The Admin keeps the `Admin_Hold` portion plus the commissions from both agents and master dealers as profit.  
- If the ticket wins, Admin is responsible for paying the agents the full prize on the entire sales amount, but the master dealer pays Admin the prize on the offloaded portion (minus the master dealer’s commission effect). The Admin’s net loss on a winning ticket is therefore limited by the fact that the master dealer bears the risk on the excess portion.  

Thus `Admin_Hold` is the **maximum amount per ticket that Admin is willing to risk directly**. Anything above that is transferred to master dealers.

---

### 10. Example Verification (from your numbers)

Given:
- House_Holding_Amount = 20,000
- Agent commission rate = 15% (0.15)
- Master dealer commission rate = 40% (0.40)
- JP_Factor = 500 for both agents and master dealer
- Ticket `123`: Agent-1 sold 30,000, Agent-2 sold 70,000 → Total = 100,000
- Admin_Hold = 20,000, Offloaded = 80,000 (all to one master dealer)

**Losing scenario (ticket not winning):**
- Agents pay Admin: Agent-1 = 30,000×(1-0.15)=25,500; Agent-2 = 70,000×0.85=59,500; total = 85,000
- Master dealer receives net offloaded = 80,000×(1-0.40)=48,000 (Admin pays master)
- Admin net from this ticket = 85,000 – 48,000 = 37,000

**Winning scenario (jackpot):**
- Admin pays agents: Agent-1 = 30,000×500 – 25,500 = 14,974,500; Agent-2 = 70,000×500 – 59,500 = 34,940,500; total paid = 49,915,000
- Master dealer pays Admin: 80,000×500 – 48,000 = 39,952,000
- Admin net from this ticket = –49,915,000 + 39,952,000 = –9,963,000 (loss)

This matches your example exactly. The `Admin_Hold` of 20,000 is the threshold that separates the portion kept by Admin from the portion offloaded, but the actual profit/loss depends on the full sales due to the prize factor.

---

### 11. Multiple Master Dealers

If the offloaded amount of a ticket is split among several master dealers, each master dealer’s portion is treated independently:
- Each pays its own commission to Admin.
- Each pays its own winning payout to Admin (based on its offloaded amount).
- Admin aggregates all master dealer net profits/losses into its total.

The formulas for each master dealer remain the same, substituting their respective offloaded amount and commission rate.

---

This workflow is now fully consistent with your corrections and example. I will update the SQLite database schema and views accordingly if you need the implementation.