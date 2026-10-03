basic understanding of database:

Departments are floors (Finance, HR, Sales).
Employees work on a floor and have a role (manager, executive).
A role decides what you're allowed to do (permissions).
Finance keeps a list of debtors, the customers who owe money.
Each debtor has transactions: invoices and payments.
Employees chat with the AI Agent, and every chat is saved as a session with messages.
Employees create follow-ups ("call this customer on Monday").
Everything important is written in a logbook (audit logs).

=======================
TABLES:
===============
Department:
id | name | craeated_at
1 | IT | 2026-10-03
2 | HR | 2026-10-03
3 | FINANCE | 2026-10-03

===============
USERS/ EMPLOYEES:
id | name | email | department_id
1 | John | john@gmail.com | 1
2 | Mary | mary@gmail.com | 2
3 | David | david@gmail.com | 3
4 | Peter | peter@gmail.com | 3

---

Relationships: department ---(1)-------(n)-> employee

---

===============
ROLES: 

