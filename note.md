# GET ALL DEBTORS

### Controller

- Filters come from `req.query`:

```ts
const filters = {
  page: 1,
  limit: 10,
  search: 'ABC',
  riskLevel: 'high',
};
```

- We send **user role, user department ID, and filters** to the query function.
- It returns all matching debtors, then we modify the response:
  - If no transaction is found → `total_outstanding = 0`
  - Same for `ageing_days` → how old the unpaid/overdue invoice is.

```text
Invoice 1 → Due: October 1 → 3 days overdue
Invoice 2 → Due: September 20 → 14 days overdue
Invoice 3 → Due: September 5 → 29 days overdue
```

- We also convert `credit_limit` to a number.
  - Example: ABC company has a maximum credit limit of ₹1 lakh.

### Query Function

- First, we get the filters.
- Calculate the pagination `offset`.
- If the user is `admin` → can see debtors from **all departments**.
- Otherwise → can see only debtors from **their own department**.
- So, `departmentId` is set to `null` for admin.
- Store all values that will be passed to `$1`, `$2`, `$3`, etc.

> Important: `%${search}%` → `%Rahul%` for better searching by name/email/phone.

### Main SQL Query

**Total Outstanding:**

- Find all transactions belonging to the current debtor.
- Take their `outstanding_amount` and calculate the total.

**Ageing Days:**

- Find the **maximum overdue days**.
- Only consider `invoice` transactions.

```text
Invoice A → 5 days overdue
Invoice B → 10 days overdue
Invoice C → 30 days overdue

MAX() → 30
```

- If there is no outstanding amount → `total_outstanding = 0`.

### WHERE Conditions

1. `departmentId` → `null` for admin, otherwise user's department.
2. `search` → search by name, email, or phone.
3. `riskLevel` → `high`, `medium`, etc. / `null`.
4. `priority` → `urgent`, `high`, etc. / `null`.
5. `dateFrom` → filter by `created_at` / `null`.
6. `dateTo` → filter by `created_at` / `null`.
7. `limit` → pagination.
8. `offset` → pagination.

# GET SINGLE DEBTOR BY ID

Main thing here if user is `admin` → can see debtors from **all departments**.
Otherwise → can see only debtors from **their own department**.

```
CASE
  WHEN t.due_date IS NOT NULL
    AND t.due_date < CURRENT_DATE
    AND t.outstanding_amount > 0
  THEN CURRENT_DATE - t.due_date
  ELSE 0
END AS ageing_days
```

=> If the transaction has a due date, the due date has already passed, and some money is still outstanding, then calculate how many days overdue it is. Otherwise, return 0 an store it in the `ageing_days` column.

```
AND (
  $6::INTEGER IS NULL
  OR (
    t.type = 'invoice'
    AND t.outstanding_amount > 0
    AND t.due_date IS NOT NULL
    AND CURRENT_DATE - t.due_date >= $6::INTEGER
  )
)
```

->

```
Is it an invoice?
       ↓
Is money still outstanding / not paid?
       ↓
Does it have a due date/ last payment date?
       ↓
Is it overdue by at least 30 days / last payment date exceeds 30 days?
```

SEED DOCUMENT :

docker compose run --rm server bun run src/seed/seedDepartments.ts
