Below is a **TypeScript + Express + PostgreSQL (`pg`)** implementation based directly on your schema.

I am keeping the architecture **simple and fresher/interview-friendly**, while still covering the assessment requirements:

* Controllers
* Routes
* Middlewares
* Types
* Services — **main business logic**
* SQL queries in separate files under `src/query`
* Authentication + RBAC
* Department authorization
* Debtor filtering/pagination
* Agent query orchestration
* Follow-up duplicate prevention
* Feedback
* Audit logging
* Centralized errors

I am assuming you already have a PostgreSQL connection such as `pool` available from `src/config/database.ts`.

---

# 1. Recommended structure

```text
src/
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── redis.ts
│
├── controllers/
│   ├── auth.controller.ts
│   ├── debtor.controller.ts
│   ├── agent.controller.ts
│   ├── session.controller.ts
│   ├── followup.controller.ts
│   ├── feedback.controller.ts
│   └── audit.controller.ts
│
├── middlewares/
│   ├── auth.middleware.ts
│   ├── permission.middleware.ts
│   ├── validate.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── error.middleware.ts
│
├── routes/
│   ├── auth.routes.ts
│   ├── debtor.routes.ts
│   ├── agent.routes.ts
│   ├── session.routes.ts
│   ├── followup.routes.ts
│   ├── feedback.routes.ts
│   └── audit.routes.ts
│
├── services/
│   ├── auth.service.ts
│   ├── debtor.service.ts
│   ├── agent.service.ts
│   ├── session.service.ts
│   ├── followup.service.ts
│   ├── feedback.service.ts
│   └── audit.service.ts
│
├── query/
│   ├── auth.query.ts
│   ├── debtor.query.ts
│   ├── agent.query.ts
│   ├── session.query.ts
│   ├── followup.query.ts
│   ├── feedback.query.ts
│   └── audit.query.ts
│
├── types/
│   ├── auth.types.ts
│   ├── debtor.types.ts
│   ├── agent.types.ts
│   ├── followup.types.ts
│   ├── feedback.types.ts
│   └── express.d.ts
│
├── utils/
│   ├── jwt.ts
│   ├── password.ts
│   ├── token.ts
│   └── async-handler.ts
│
├── app.ts
└── server.ts
```

The important flow is:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Query
  ↓
PostgreSQL
```

The **service layer contains the actual business logic**.

---

# 2. Types

## `src/types/auth.types.ts`

```ts
export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface TokenPayload {
  userId: string;
  role: string;
  departmentId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
```

---

## `src/types/debtor.types.ts`

```ts
export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type Priority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export interface DebtorFilters {
  search?: string;
  riskLevel?: RiskLevel;
  priority?: Priority;
  minAgeing?: number;
  maxAgeing?: number;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
  sortBy: "created_at" | "name" | "credit_limit";
  sortOrder: "asc" | "desc";
}

export interface CreateDebtorInput {
  name: string;
  email?: string;
  phone?: string;
  riskLevel?: RiskLevel;
  priority?: Priority;
  creditLimit?: number;
}
```

---

## `src/types/agent.types.ts`

```ts
export interface AgentQueryInput {
  query: string;
  department: string;
}

export interface AgentResult {
  sessionId: string;
  query: string;
  data: unknown;
}
```

---

## `src/types/followup.types.ts`

```ts
export type FollowUpType =
  | "payment_reminder"
  | "call"
  | "email"
  | "escalation";

export type FollowUpStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "cancelled";

export interface CreateFollowUpInput {
  debtorId: string;
  assignedTo?: string;
  type: FollowUpType;
  followUpDate: string;
  note?: string;
}

export interface UpdateFollowUpInput {
  status?: FollowUpStatus;
  followUpDate?: string;
  assignedTo?: string;
  note?: string;
}
```

---

## `src/types/feedback.types.ts`

```ts
export interface CreateFeedbackInput {
  messageId: string;
  rating: -1 | 1;
  comment?: string;
}
```

---

## `src/types/express.d.ts`

```ts
import { AuthUser } from "./auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
```

---

# 3. Error class

## `src/utils/app-error.ts`

```ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    statusCode: number,
    message: string,
    code = "APP_ERROR"
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

---

# 4. Async handler

## `src/utils/async-handler.ts`

```ts
import { RequestHandler } from "express";

export const asyncHandler = (
  handler: RequestHandler
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
```

---

# 5. Authentication middleware

## `src/middlewares/auth.middleware.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { getUserById } from "../query/auth.query";
import { AppError } from "../utils/app-error";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(
      new AppError(
        401,
        "Authentication required",
        "AUTH_REQUIRED"
      )
    );
  }

  const token = authorization.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);

    const user = await getUserById(payload.userId);

    if (!user || !user.is_active) {
      return next(
        new AppError(
          401,
          "Invalid or inactive user",
          "INVALID_AUTH"
        )
      );
    }

    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      departmentId: user.department_id,
      departmentName: user.department_name,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions: user.permissions,
    };

    next();
  } catch {
    next(
      new AppError(
        401,
        "Invalid or expired access token",
        "INVALID_TOKEN"
      )
    );
  }
};
```

---

# 6. Permission middleware

## `src/middlewares/permission.middleware.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";

export const requirePermission = (
  permission: string
) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(
        new AppError(401, "Authentication required")
      );
    }

    if (!req.user.permissions.includes(permission)) {
      return next(
        new AppError(
          403,
          "You do not have permission to perform this action",
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};
```

This gives you:

```text
JWT authentication
       ↓
identify user
       ↓
load permissions
       ↓
check permission
```

---

# 7. Authentication queries

## `src/query/auth.query.ts`

```ts
import { pool } from "../config/database";

export const findUserForLogin = async (
  email: string
) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.password_hash,
      u.department_id,
      d.name AS department_name,
      u.role_id,
      r.name AS role_name,
      u.is_active,
      u.failed_login_attempts,
      u.locked_until
    FROM users u
    JOIN departments d
      ON d.id = u.department_id
    JOIN roles r
      ON r.id = u.role_id
    WHERE u.email = $1
    `,
    [email]
  );

  return result.rows[0];
};

export const getUserPermissions = async (
  roleId: string
) => {
  const result = await pool.query(
    `
    SELECT p.name
    FROM role_permissions rp
    JOIN permissions p
      ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    `,
    [roleId]
  );

  return result.rows.map((row) => row.name);
};

export const getUserById = async (
  userId: string
) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.department_id,
      d.name AS department_name,
      u.role_id,
      r.name AS role_name,
      u.is_active,
      ARRAY(
        SELECT p.name
        FROM role_permissions rp
        JOIN permissions p
          ON p.id = rp.permission_id
        WHERE rp.role_id = u.role_id
      ) AS permissions
    FROM users u
    JOIN departments d
      ON d.id = u.department_id
    JOIN roles r
      ON r.id = u.role_id
    WHERE u.id = $1
    `,
    [userId]
  );

  return result.rows[0];
};

export const updateLoginSuccess = async (
  userId: string
) => {
  await pool.query(
    `
    UPDATE users
    SET
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [userId]
  );
};

export const updateLoginFailure = async (
  userId: string
) => {
  await pool.query(
    `
    UPDATE users
    SET
      failed_login_attempts = failed_login_attempts + 1,
      locked_until = CASE
        WHEN failed_login_attempts + 1 >= 5
        THEN NOW() + INTERVAL '15 minutes'
        ELSE locked_until
      END,
      updated_at = NOW()
    WHERE id = $1
    `,
    [userId]
  );
};

export const createRefreshToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date
) => {
  const result = await pool.query(
    `
    INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
    RETURNING id, expires_at
    `,
    [userId, tokenHash, expiresAt]
  );

  return result.rows[0];
};

export const findRefreshToken = async (
  tokenHash: string
) => {
  const result = await pool.query(
    `
    SELECT
      rt.id,
      rt.user_id,
      rt.expires_at,
      rt.revoked_at
    FROM refresh_tokens rt
    WHERE rt.token_hash = $1
    `,
    [tokenHash]
  );

  return result.rows[0];
};

export const revokeRefreshToken = async (
  tokenHash: string
) => {
  await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = $1
    `,
    [tokenHash]
  );
};
```

---

# 8. Auth service

## `src/services/auth.service.ts`

```ts
import {
  findUserForLogin,
  getUserPermissions,
  updateLoginFailure,
  updateLoginSuccess,
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  getUserById,
} from "../query/auth.query";

import {
  comparePassword,
  hashPassword,
} from "../utils/password";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt";

import {
  hashToken,
  generateRandomToken,
} from "../utils/token";

import { AppError } from "../utils/app-error";

export const login = async (
  email: string,
  password: string
) => {
  const user = await findUserForLogin(email);

  if (!user) {
    throw new AppError(
      401,
      "Invalid email or password",
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.is_active) {
    throw new AppError(
      403,
      "User account is inactive",
      "ACCOUNT_INACTIVE"
    );
  }

  if (
    user.locked_until &&
    new Date(user.locked_until) > new Date()
  ) {
    throw new AppError(
      423,
      "Account temporarily locked",
      "ACCOUNT_LOCKED"
    );
  }

  const passwordValid = await comparePassword(
    password,
    user.password_hash
  );

  if (!passwordValid) {
    await updateLoginFailure(user.id);

    throw new AppError(
      401,
      "Invalid email or password",
      "INVALID_CREDENTIALS"
    );
  }

  await updateLoginSuccess(user.id);

  const permissions = await getUserPermissions(
    user.role_id
  );

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role_name,
    departmentId: user.department_id,
  });

  const refreshToken = generateRandomToken();

  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await createRefreshToken(
    user.id,
    refreshTokenHash,
    expiresAt
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      departmentId: user.department_id,
      departmentName: user.department_name,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions,
    },
  };
};
```

---

# 9. Debtor queries

## `src/query/debtor.query.ts`

```ts
import { pool } from "../config/database";
import { DebtorFilters } from "../types/debtor.types";

export const getDebtors = async (
  departmentId: string,
  filters: DebtorFilters
) => {
  const values: unknown[] = [departmentId];

  const conditions = [
    `d.department_id = $1`,
    `d.is_active = TRUE`,
  ];

  if (filters.search) {
    values.push(`%${filters.search}%`);

    conditions.push(`
      (
        d.name ILIKE $${values.length}
        OR d.email ILIKE $${values.length}
        OR d.phone ILIKE $${values.length}
      )
    `);
  }

  if (filters.riskLevel) {
    values.push(filters.riskLevel);

    conditions.push(
      `d.risk_level = $${values.length}`
    );
  }

  if (filters.priority) {
    values.push(filters.priority);

    conditions.push(
      `d.priority = $${values.length}`
    );
  }

  if (filters.minAgeing !== undefined) {
    values.push(filters.minAgeing);

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.debtor_id = d.id
        AND t.outstanding_amount > 0
        AND CURRENT_DATE - t.due_date >= $${values.length}
      )
    `);
  }

  if (filters.maxAgeing !== undefined) {
    values.push(filters.maxAgeing);

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.debtor_id = d.id
        AND t.outstanding_amount > 0
        AND CURRENT_DATE - t.due_date <= $${values.length}
      )
    `);
  }

  if (filters.fromDate) {
    values.push(filters.fromDate);

    conditions.push(
      `d.created_at >= $${values.length}`
    );
  }

  if (filters.toDate) {
    values.push(filters.toDate);

    conditions.push(
      `d.created_at <= $${values.length}`
    );
  }

  const offset =
    (filters.page - 1) * filters.limit;

  values.push(filters.limit);
  const limitParam = values.length;

  values.push(offset);
  const offsetParam = values.length;

  const allowedSortColumns = {
    created_at: "d.created_at",
    name: "d.name",
    credit_limit: "d.credit_limit",
  };

  const sortColumn =
    allowedSortColumns[filters.sortBy];

  const sortOrder =
    filters.sortOrder === "desc"
      ? "DESC"
      : "ASC";

  const query = `
    SELECT
      d.id,
      d.name,
      d.email,
      d.phone,
      d.risk_level,
      d.priority,
      d.credit_limit,
      d.created_at,

      COALESCE(
        SUM(
          CASE
            WHEN t.outstanding_amount > 0
            THEN t.outstanding_amount
            ELSE 0
          END
        ),
        0
      ) AS total_outstanding,

      COALESCE(
        MAX(
          CASE
            WHEN t.outstanding_amount > 0
            THEN CURRENT_DATE - t.due_date
            ELSE 0
          END
        ),
        0
      ) AS max_ageing

    FROM debtors d

    LEFT JOIN transactions t
      ON t.debtor_id = d.id

    WHERE ${conditions.join(" AND ")}

    GROUP BY d.id

    ORDER BY ${sortColumn} ${sortOrder}

    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);

  return result.rows;
};

export const countDebtors = async (
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT COUNT(*)
    FROM debtors
    WHERE department_id = $1
    AND is_active = TRUE
    `,
    [departmentId]
  );

  return Number(result.rows[0].count);
};

export const getDebtorById = async (
  debtorId: string,
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT
      d.id,
      d.name,
      d.email,
      d.phone,
      d.risk_level,
      d.priority,
      d.credit_limit,
      d.is_active,
      d.created_at,
      d.updated_at
    FROM debtors d
    WHERE d.id = $1
    AND d.department_id = $2
    `,
    [debtorId, departmentId]
  );

  return result.rows[0];
};

export const getDebtorTransactions = async (
  debtorId: string,
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t.type,
      t.reference_no,
      t.amount,
      t.outstanding_amount,
      t.issue_date,
      t.due_date,
      t.status,
      CASE
        WHEN t.due_date IS NULL THEN 0
        ELSE CURRENT_DATE - t.due_date
      END AS ageing
    FROM transactions t
    JOIN debtors d
      ON d.id = t.debtor_id
    WHERE t.debtor_id = $1
    AND d.department_id = $2
    ORDER BY t.issue_date DESC
    `,
    [debtorId, departmentId]
  );

  return result.rows;
};
```

### Important security point

Notice this:

```sql
WHERE d.id = $1
AND d.department_id = $2
```

That prevents:

```text
Finance employee
    ↓
/api/debtors/<HR debtor ID>
    ↓
Data returned
```

The department check happens **inside the database query**, not just in the frontend.

This is your BOLA/IDOR protection.

---

# 10. Debtor service

## `src/services/debtor.service.ts`

```ts
import {
  getDebtors,
  getDebtorById,
  getDebtorTransactions,
} from "../query/debtor.query";

import { DebtorFilters } from "../types/debtor.types";
import { AppError } from "../utils/app-error";

export const listDebtors = async (
  departmentId: string,
  filters: DebtorFilters
) => {
  const data = await getDebtors(
    departmentId,
    filters
  );

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      count: data.length,
    },
  };
};

export const getDebtor = async (
  debtorId: string,
  departmentId: string
) => {
  const debtor = await getDebtorById(
    debtorId,
    departmentId
  );

  if (!debtor) {
    throw new AppError(
      404,
      "Debtor not found",
      "DEBTOR_NOT_FOUND"
    );
  }

  return debtor;
};

export const getTransactions = async (
  debtorId: string,
  departmentId: string
) => {
  const debtor = await getDebtorById(
    debtorId,
    departmentId
  );

  if (!debtor) {
    throw new AppError(
      404,
      "Debtor not found",
      "DEBTOR_NOT_FOUND"
    );
  }

  return getDebtorTransactions(
    debtorId,
    departmentId
  );
};
```

---

# 11. Debtor controller

## `src/controllers/debtor.controller.ts`

```ts
import { Request, Response } from "express";
import * as debtorService from "../services/debtor.service";
import { asyncHandler } from "../utils/async-handler";

export const listDebtors = asyncHandler(
  async (req: Request, res: Response) => {
    const filters = {
      search:
        typeof req.query.search === "string"
          ? req.query.search
          : undefined,

      riskLevel:
        typeof req.query.riskLevel === "string"
          ? req.query.riskLevel as any
          : undefined,

      priority:
        typeof req.query.priority === "string"
          ? req.query.priority as any
          : undefined,

      minAgeing:
        req.query.minAgeing
          ? Number(req.query.minAgeing)
          : undefined,

      maxAgeing:
        req.query.maxAgeing
          ? Number(req.query.maxAgeing)
          : undefined,

      fromDate:
        typeof req.query.fromDate === "string"
          ? req.query.fromDate
          : undefined,

      toDate:
        typeof req.query.toDate === "string"
          ? req.query.toDate
          : undefined,

      page:
        req.query.page
          ? Number(req.query.page)
          : 1,

      limit:
        req.query.limit
          ? Math.min(Number(req.query.limit), 100)
          : 20,

      sortBy:
        req.query.sortBy === "name" ||
        req.query.sortBy === "credit_limit"
          ? req.query.sortBy
          : "created_at",

      sortOrder:
        req.query.sortOrder === "desc"
          ? "desc"
          : "asc",
    };

    const result = await debtorService.listDebtors(
      req.user!.departmentId,
      filters
    );

    res.json({
      success: true,
      ...result,
    });
  }
);

export const getDebtor = asyncHandler(
  async (req: Request, res: Response) => {
    const debtor = await debtorService.getDebtor(
      req.params.id,
      req.user!.departmentId
    );

    res.json({
      success: true,
      data: debtor,
    });
  }
);

export const getTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const transactions =
      await debtorService.getTransactions(
        req.params.id,
        req.user!.departmentId
      );

    res.json({
      success: true,
      data: transactions,
    });
  }
);
```

---

# 12. Debtor routes

## `src/routes/debtor.routes.ts`

```ts
import { Router } from "express";

import {
  listDebtors,
  getDebtor,
  getTransactions,
} from "../controllers/debtor.controller";

import { authenticate } from "../middlewares/auth.middleware";

import {
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("debtor:read"),
  listDebtors
);

router.get(
  "/:id",
  requirePermission("debtor:read"),
  getDebtor
);

router.get(
  "/:id/transactions",
  requirePermission("transaction:read"),
  getTransactions
);

export default router;
```

---

# 13. Session queries

## `src/query/session.query.ts`

```ts
import { pool } from "../config/database";

export const createSession = async (
  userId: string,
  departmentId: string,
  title?: string
) => {
  const result = await pool.query(
    `
    INSERT INTO agent_sessions (
      user_id,
      department_id,
      title
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [userId, departmentId, title ?? null]
  );

  return result.rows[0];
};

export const getSessionById = async (
  sessionId: string,
  userId: string,
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.user_id,
      s.department_id,
      s.title,
      s.status,
      s.created_at,
      s.updated_at
    FROM agent_sessions s
    WHERE s.id = $1
    AND s.user_id = $2
    AND s.department_id = $3
    `,
    [sessionId, userId, departmentId]
  );

  return result.rows[0];
};

export const getSessionMessages = async (
  sessionId: string
) => {
  const result = await pool.query(
    `
    SELECT
      id,
      sender,
      content,
      created_at
    FROM agent_messages
    WHERE session_id = $1
    ORDER BY created_at ASC
    `,
    [sessionId]
  );

  return result.rows;
};

export const createMessage = async (
  sessionId: string,
  sender: "user" | "agent",
  content: string
) => {
  const result = await pool.query(
    `
    INSERT INTO agent_messages (
      session_id,
      sender,
      content
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [sessionId, sender, content]
  );

  return result.rows[0];
};
```

---

# 14. Session service

## `src/services/session.service.ts`

```ts
import {
  getSessionById,
  getSessionMessages,
} from "../query/session.query";

import { AppError } from "../utils/app-error";

export const getSession = async (
  sessionId: string,
  userId: string,
  departmentId: string
) => {
  const session = await getSessionById(
    sessionId,
    userId,
    departmentId
  );

  if (!session) {
    throw new AppError(
      404,
      "Session not found",
      "SESSION_NOT_FOUND"
    );
  }

  const messages = await getSessionMessages(
    sessionId
  );

  return {
    ...session,
    messages,
  };
};
```

---

# 15. Session controller

## `src/controllers/session.controller.ts`

```ts
import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as sessionService from "../services/session.service";

export const getSession = asyncHandler(
  async (req: Request, res: Response) => {
    const session = await sessionService.getSession(
      req.params.id,
      req.user!.id,
      req.user!.departmentId
    );

    res.json({
      success: true,
      data: session,
    });
  }
);
```

---

# 16. Session routes

## `src/routes/session.routes.ts`

```ts
import { Router } from "express";

import { getSession } from "../controllers/session.controller";

import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/:id", getSession);

export default router;
```

---

# 17. Follow-up queries

## `src/query/followup.query.ts`

```ts
import { pool } from "../config/database";

export const findDuplicateFollowUp = async (
  debtorId: string,
  type: string,
  followUpDate: string
) => {
  const result = await pool.query(
    `
    SELECT id
    FROM followups
    WHERE debtor_id = $1
    AND type = $2
    AND follow_up_date = $3
    AND status IN ('pending', 'in_progress')
    LIMIT 1
    `,
    [debtorId, type, followUpDate]
  );

  return result.rows[0];
};

export const createFollowUp = async (
  debtorId: string,
  assignedTo: string | null,
  createdBy: string,
  type: string,
  followUpDate: string,
  note: string | null
) => {
  const result = await pool.query(
    `
    INSERT INTO followups (
      debtor_id,
      assigned_to,
      created_by,
      type,
      follow_up_date,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      debtorId,
      assignedTo,
      createdBy,
      type,
      followUpDate,
      note,
    ]
  );

  return result.rows[0];
};

export const getFollowUpById = async (
  followUpId: string
) => {
  const result = await pool.query(
    `
    SELECT *
    FROM followups
    WHERE id = $1
    `,
    [followUpId]
  );

  return result.rows[0];
};

export const updateFollowUp = async (
  followUpId: string,
  data: {
    status?: string;
    followUpDate?: string;
    assignedTo?: string;
    note?: string;
  }
) => {
  const values: unknown[] = [];
  const updates: string[] = [];

  if (data.status !== undefined) {
    values.push(data.status);

    updates.push(
      `status = $${values.length}`
    );
  }

  if (data.followUpDate !== undefined) {
    values.push(data.followUpDate);

    updates.push(
      `follow_up_date = $${values.length}`
    );
  }

  if (data.assignedTo !== undefined) {
    values.push(data.assignedTo);

    updates.push(
      `assigned_to = $${values.length}`
    );
  }

  if (data.note !== undefined) {
    values.push(data.note);

    updates.push(
      `note = $${values.length}`
    );
  }

  if (updates.length === 0) {
    return getFollowUpById(followUpId);
  }

  values.push(followUpId);

  const result = await pool.query(
    `
    UPDATE followups
    SET
      ${updates.join(", ")},
      updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING *
    `,
    values
  );

  return result.rows[0];
};

export const getPendingFollowUps = async (
  userId: string,
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT
      f.*,
      d.name AS debtor_name
    FROM followups f
    JOIN debtors d
      ON d.id = f.debtor_id
    WHERE d.department_id = $1
    AND f.assigned_to = $2
    AND f.status IN ('pending', 'in_progress')
    ORDER BY f.follow_up_date ASC
    `,
    [departmentId, userId]
  );

  return result.rows;
};
```

---

# 18. Audit query

## `src/query/audit.query.ts`

```ts
import { pool } from "../config/database";

export const createAuditLog = async (
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object
) => {
  await pool.query(
    `
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      userId,
      action,
      entityType ?? null,
      entityId ?? null,
      metadata ?? null,
    ]
  );
};

export const getAuditLogs = async (
  departmentId: string
) => {
  const result = await pool.query(
    `
    SELECT
      a.id,
      a.user_id,
      u.full_name AS user_name,
      a.action,
      a.entity_type,
      a.entity_id,
      a.metadata,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u
      ON u.id = a.user_id
    LEFT JOIN departments d
      ON d.id = u.department_id
    WHERE d.id = $1
    ORDER BY a.created_at DESC
    LIMIT 100
    `,
    [departmentId]
  );

  return result.rows;
};
```

---

# 19. Audit service

## `src/services/audit.service.ts`

```ts
import {
  createAuditLog,
  getAuditLogs as getLogs,
} from "../query/audit.query";

export const log = async (
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object
) => {
  await createAuditLog(
    userId,
    action,
    entityType,
    entityId,
    metadata
  );
};

export const getAuditLogs = async (
  departmentId: string
) => {
  return getLogs(departmentId);
};
```

---

# 20. Follow-up service

This is one of the most important service layers because it handles the **business rules**.

## `src/services/followup.service.ts`

```ts
import {
  createFollowUp,
  findDuplicateFollowUp,
  getFollowUpById,
  updateFollowUp,
  getPendingFollowUps,
} from "../query/followup.query";

import { getDebtorById } from "../query/debtor.query";

import {
  CreateFollowUpInput,
  UpdateFollowUpInput,
} from "../types/followup.types";

import { AppError } from "../utils/app-error";
import * as auditService from "./audit.service";

export const create = async (
  input: CreateFollowUpInput,
  userId: string,
  departmentId: string
) => {
  const debtor = await getDebtorById(
    input.debtorId,
    departmentId
  );

  if (!debtor) {
    throw new AppError(
      404,
      "Debtor not found",
      "DEBTOR_NOT_FOUND"
    );
  }

  const duplicate =
    await findDuplicateFollowUp(
      input.debtorId,
      input.type,
      input.followUpDate
    );

  if (duplicate) {
    throw new AppError(
      409,
      "A similar active follow-up already exists",
      "DUPLICATE_FOLLOWUP"
    );
  }

  const followUp = await createFollowUp(
    input.debtorId,
    input.assignedTo ?? userId,
    userId,
    input.type,
    input.followUpDate,
    input.note ?? null
  );

  await auditService.log(
    userId,
    "FOLLOWUP_CREATED",
    "followup",
    followUp.id,
    {
      debtorId: input.debtorId,
      type: input.type,
    }
  );

  return followUp;
};

export const update = async (
  followUpId: string,
  input: UpdateFollowUpInput,
  userId: string,
  departmentId: string
) => {
  const followUp =
    await getFollowUpById(followUpId);

  if (!followUp) {
    throw new AppError(
      404,
      "Follow-up not found",
      "FOLLOWUP_NOT_FOUND"
    );
  }

  const debtor = await getDebtorById(
    followUp.debtor_id,
    departmentId
  );

  if (!debtor) {
    throw new AppError(
      403,
      "You cannot modify this follow-up",
      "FORBIDDEN"
    );
  }

  const updated = await updateFollowUp(
    followUpId,
    input
  );

  await auditService.log(
    userId,
    "FOLLOWUP_UPDATED",
    "followup",
    followUpId,
    {
      previousStatus: followUp.status,
      newStatus: input.status,
    }
  );

  return updated;
};

export const getPending = async (
  userId: string,
  departmentId: string
) => {
  return getPendingFollowUps(
    userId,
    departmentId
  );
};
```

---

# 21. Follow-up controller

## `src/controllers/followup.controller.ts`

```ts
import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";

import * as followupService from "../services/followup.service";

export const createFollowUp = asyncHandler(
  async (req: Request, res: Response) => {
    const followUp =
      await followupService.create(
        req.body,
        req.user!.id,
        req.user!.departmentId
      );

    res.status(201).json({
      success: true,
      data: followUp,
    });
  }
);

export const updateFollowUp = asyncHandler(
  async (req: Request, res: Response) => {
    const followUp =
      await followupService.update(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.departmentId
      );

    res.json({
      success: true,
      data: followUp,
    });
  }
);

export const getFollowUps = asyncHandler(
  async (req: Request, res: Response) => {
    const followUps =
      await followupService.getPending(
        req.user!.id,
        req.user!.departmentId
      );

    res.json({
      success: true,
      data: followUps,
    });
  }
);
```

---

# 22. Follow-up routes

## `src/routes/followup.routes.ts`

```ts
import { Router } from "express";

import {
  createFollowUp,
  updateFollowUp,
  getFollowUps,
} from "../controllers/followup.controller";

import { authenticate } from "../middlewares/auth.middleware";

import {
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requirePermission("followup:create"),
  createFollowUp
);

router.get(
  "/",
  requirePermission("followup:read"),
  getFollowUps
);

router.patch(
  "/:id",
  requirePermission("followup:update"),
  updateFollowUp
);

export default router;
```

---

# 23. Feedback query

## `src/query/feedback.query.ts`

```ts
import { pool } from "../config/database";

export const createFeedback = async (
  messageId: string,
  userId: string,
  rating: number,
  comment?: string
) => {
  const result = await pool.query(
    `
    INSERT INTO feedback (
      message_id,
      user_id,
      rating,
      comment
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      messageId,
      userId,
      rating,
      comment ?? null,
    ]
  );

  return result.rows[0];
};

export const findMessageForUser = async (
  messageId: string,
  userId: string
) => {
  const result = await pool.query(
    `
    SELECT m.id
    FROM agent_messages m
    JOIN agent_sessions s
      ON s.id = m.session_id
    WHERE m.id = $1
    AND s.user_id = $2
    AND m.sender = 'agent'
    `,
    [messageId, userId]
  );

  return result.rows[0];
};
```

---

# 24. Feedback service

## `src/services/feedback.service.ts`

```ts
import {
  createFeedback,
  findMessageForUser,
} from "../query/feedback.query";

import { CreateFeedbackInput } from "../types/feedback.types";

import { AppError } from "../utils/app-error";

import * as auditService from "./audit.service";

export const create = async (
  input: CreateFeedbackInput,
  userId: string
) => {
  const message =
    await findMessageForUser(
      input.messageId,
      userId
    );

  if (!message) {
    throw new AppError(
      404,
      "Agent message not found",
      "MESSAGE_NOT_FOUND"
    );
  }

  try {
    const feedback = await createFeedback(
      input.messageId,
      userId,
      input.rating,
      input.comment
    );

    await auditService.log(
      userId,
      "FEEDBACK_CREATED",
      "feedback",
      feedback.id
    );

    return feedback;
  } catch (error: any) {
    if (error.code === "23505") {
      throw new AppError(
        409,
        "Feedback already submitted for this message",
        "DUPLICATE_FEEDBACK"
      );
    }

    throw error;
  }
};
```

---

# 25. Feedback controller

## `src/controllers/feedback.controller.ts`

```ts
import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";

import * as feedbackService from "../services/feedback.service";

export const createFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const feedback =
      await feedbackService.create(
        req.body,
        req.user!.id
      );

    res.status(201).json({
      success: true,
      data: feedback,
    });
  }
);
```

---

# 26. Feedback routes

## `src/routes/feedback.routes.ts`

```ts
import { Router } from "express";

import {
  createFeedback,
} from "../controllers/feedback.controller";

import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  createFeedback
);

export default router;
```

---

# 27. Agent query

This is the interesting part.

The assessment says:

```http
POST /api/agent/query
```

with:

```json
{
  "query": "Show debtors above 90 days ageing",
  "department": "finance"
}
```

You don't need an actual LLM.

The backend can perform basic query classification/orchestration.

---

## `src/query/agent.query.ts`

```ts
import { pool } from "../config/database";

export const getDebtorsAboveAgeing = async (
  departmentId: string,
  ageing: number
) => {
  const result = await pool.query(
    `
    SELECT
      d.id,
      d.name,
      d.email,
      d.risk_level,
      d.priority,
      COALESCE(
        SUM(t.outstanding_amount),
        0
      ) AS total_outstanding,
      MAX(
        CURRENT_DATE - t.due_date
      ) AS max_ageing

    FROM debtors d

    JOIN transactions t
      ON t.debtor_id = d.id

    WHERE d.department_id = $1
    AND t.outstanding_amount > 0
    AND t.due_date IS NOT NULL
    AND CURRENT_DATE - t.due_date >= $2

    GROUP BY d.id

    ORDER BY max_ageing DESC
    `,
    [departmentId, ageing]
  );

  return result.rows;
};
```

---

# 28. Agent service

## `src/services/agent.service.ts`

```ts
import {
  createSession,
  createMessage,
} from "../query/session.query";

import {
  getDebtorsAboveAgeing,
} from "../query/agent.query";

import { AgentQueryInput } from "../types/agent.types";

import { AppError } from "../utils/app-error";

import * as auditService from "./audit.service";

export const processQuery = async (
  input: AgentQueryInput,
  userId: string,
  departmentId: string,
  departmentName: string
) => {
  if (
    input.department.toLowerCase() !==
    departmentName.toLowerCase()
  ) {
    throw new AppError(
      403,
      "You cannot query another department",
      "DEPARTMENT_ACCESS_DENIED"
    );
  }

  const session = await createSession(
    userId,
    departmentId,
    "Finance Agent Query"
  );

  await createMessage(
    session.id,
    "user",
    input.query
  );

  const query = input.query.toLowerCase();

  let data: unknown = [];
  let responseText = "";

  /*
   * Simple orchestration.
   *
   * Later this can be replaced with an LLM/Agent layer.
   */

  const ageingMatch =
    query.match(
      /(?:above|over|greater than)\s+(\d+)\s+days/
    );

  if (
    query.includes("ageing") ||
    query.includes("aging")
  ) {
    const ageing = ageingMatch
      ? Number(ageingMatch[1])
      : 90;

    data = await getDebtorsAboveAgeing(
      departmentId,
      ageing
    );

    responseText =
      `Found ${Array.isArray(data) ? data.length : 0} ` +
      `debtors with ageing above ${ageing} days.`;
  } else {
    responseText =
      "I could not identify a supported finance query.";
  }

  const agentMessage =
    await createMessage(
      session.id,
      "agent",
      responseText
    );

  await auditService.log(
    userId,
    "AGENT_QUERY",
    "agent_session",
    session.id,
    {
      query: input.query,
    }
  );

  return {
    sessionId: session.id,
    messageId: agentMessage.id,
    query: input.query,
    response: responseText,
    data,
  };
};
```

This is enough for the assessment because the requirement explicitly says:

> You do NOT need to build or train an LLM.

Later, you can replace this:

```ts
const ageingMatch = ...
```

with:

```text
User query
    ↓
LLM / Agent
    ↓
Structured intent
    ↓
Finance service
    ↓
PostgreSQL
```

without changing your API architecture.

---

# 29. Agent controller

## `src/controllers/agent.controller.ts`

```ts
import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";

import * as agentService from "../services/agent.service";

export const queryAgent = asyncHandler(
  async (req: Request, res: Response) => {
    const result =
      await agentService.processQuery(
        req.body,
        req.user!.id,
        req.user!.departmentId,
        req.user!.departmentName
      );

    res.json({
      success: true,
      data: result,
    });
  }
);
```

---

# 30. Agent route

## `src/routes/agent.routes.ts`

```ts
import { Router } from "express";

import {
  queryAgent,
} from "../controllers/agent.controller";

import { authenticate } from "../middlewares/auth.middleware";

import {
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

router.use(authenticate);

router.post(
  "/query",
  requirePermission("agent:query"),
  queryAgent
);

export default router;
```

---

# 31. Audit controller

## `src/controllers/audit.controller.ts`

```ts
import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";

import * as auditService from "../services/audit.service";

export const getAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const logs =
      await auditService.getAuditLogs(
        req.user!.departmentId
      );

    res.json({
      success: true,
      data: logs,
    });
  }
);
```

---

# 32. Audit route

## `src/routes/audit.routes.ts`

```ts
import { Router } from "express";

import {
  getAuditLogs,
} from "../controllers/audit.controller";

import { authenticate } from "../middlewares/auth.middleware";

import {
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("audit:read"),
  getAuditLogs
);

export default router;
```

---

# 33. Auth controller

## `src/controllers/auth.controller.ts`

```ts
import { Request, Response } from "express";

import { asyncHandler } from "../utils/async-handler";

import * as authService from "../services/auth.service";

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.login(
      req.body.email,
      req.body.password
    );

    res.json({
      success: true,
      data: result,
    });
  }
);
```

---

# 34. Auth routes

## `src/routes/auth.routes.ts`

```ts
import { Router } from "express";

import {
  login,
} from "../controllers/auth.controller";

const router = Router();

router.post("/login", login);

export default router;
```

For `/refresh`, you will add the refresh-token rotation logic next. I would keep that separate from the login implementation rather than putting everything into one large controller.

---

# 35. Centralized error middleware

## `src/middlewares/error.middleware.ts`

```ts
import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../utils/app-error";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
```

The client gets:

```json
{
  "success": false,
  "error": {
    "code": "DEBTOR_NOT_FOUND",
    "message": "Debtor not found"
  }
}
```

instead of a PostgreSQL stack trace.

---

# 36. Validation middleware

I recommend using **Zod** rather than manually checking every request.

## `src/middlewares/validate.middleware.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (
  schema: ZodSchema
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: result.error.flatten(),
        },
      });
    }

    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;

    next();
  };
};
```

---

# 37. Validation schemas

Create:

```text
src/validators/
├── auth.validator.ts
├── agent.validator.ts
├── followup.validator.ts
└── feedback.validator.ts
```

## `src/validators/auth.validator.ts`

```ts
import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email(),

    password: z
      .string()
      .min(8)
      .max(100),
  }),

  params: z.object({}),

  query: z.object({}),
});
```

---

## `src/validators/agent.validator.ts`

```ts
import { z } from "zod";

export const agentQuerySchema = z.object({
  body: z.object({
    query: z
      .string()
      .min(1)
      .max(2000),

    department: z
      .string()
      .min(1)
      .max(100),
  }),

  params: z.object({}),

  query: z.object({}),
});
```

---

## `src/validators/followup.validator.ts`

```ts
import { z } from "zod";

export const createFollowUpSchema = z.object({
  body: z.object({
    debtorId: z.string().uuid(),

    assignedTo: z
      .string()
      .uuid()
      .optional(),

    type: z.enum([
      "payment_reminder",
      "call",
      "email",
      "escalation",
    ]),

    followUpDate: z
      .string()
      .date(),

    note: z
      .string()
      .max(2000)
      .optional(),
  }),

  params: z.object({}),

  query: z.object({}),
});

export const updateFollowUpSchema = z.object({
  body: z.object({
    status: z
      .enum([
        "pending",
        "in_progress",
        "done",
        "cancelled",
      ])
      .optional(),

    followUpDate: z
      .string()
      .date()
      .optional(),

    assignedTo: z
      .string()
      .uuid()
      .optional(),

    note: z
      .string()
      .max(2000)
      .optional(),
  }),

  params: z.object({
    id: z.string().uuid(),
  }),

  query: z.object({}),
});
```

---

# 38. Routes with validation

For example:

```ts
router.post(
  "/",
  authenticate,
  requirePermission("followup:create"),
  validate(createFollowUpSchema),
  createFollowUp
);
```

And:

```ts
router.patch(
  "/:id",
  authenticate,
  requirePermission("followup:update"),
  validate(updateFollowUpSchema),
  updateFollowUp
);
```

The order is:

```text
Request
   ↓
authenticate
   ↓
permission
   ↓
validation
   ↓
controller
   ↓
service
   ↓
query
   ↓
PostgreSQL
```

---

# 39. Password utility

## `src/utils/password.ts`

```ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = async (
  password: string
) => {
  return bcrypt.hash(
    password,
    SALT_ROUNDS
  );
};

export const comparePassword = async (
  password: string,
  passwordHash: string
) => {
  return bcrypt.compare(
    password,
    passwordHash
  );
};
```

---

# 40. Token utility

## `src/utils/token.ts`

```ts
import crypto from "crypto";

export const generateRandomToken = () => {
  return crypto
    .randomBytes(64)
    .toString("hex");
};

export const hashToken = (
  token: string
) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
```

Important:

```text
Client
  ↓
refresh token

Database
  ↓
ONLY hash(refresh token)
```

You don't store the raw refresh token.

---

# 41. JWT utility

## `src/utils/jwt.ts`

```ts
import jwt from "jsonwebtoken";

import {
  TokenPayload,
} from "../types/auth.types";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET!;

export const generateAccessToken = (
  payload: TokenPayload
) => {
  return jwt.sign(
    payload,
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m",
    }
  );
};

export const verifyAccessToken = (
  token: string
) => {
  return jwt.verify(
    token,
    ACCESS_TOKEN_SECRET
  ) as TokenPayload;
};
```

---

# 42. Main route registration

## `src/app.ts`

```ts
import express from "express";

import authRoutes from "./routes/auth.routes";
import debtorRoutes from "./routes/debtor.routes";
import agentRoutes from "./routes/agent.routes";
import sessionRoutes from "./routes/session.routes";
import followupRoutes from "./routes/followup.routes";
import feedbackRoutes from "./routes/feedback.routes";
import auditRoutes from "./routes/audit.routes";

import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());

app.get(
  "/health",
  (_req, res) => {
    res.json({
      success: true,
      message: "Server is healthy",
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/debtors",
  debtorRoutes
);

app.use(
  "/api/agent",
  agentRoutes
);

app.use(
  "/api/sessions",
  sessionRoutes
);

app.use(
  "/api/followups",
  followupRoutes
);

app.use(
  "/api/feedback",
  feedbackRoutes
);

app.use(
  "/api/audit-logs",
  auditRoutes
);

app.use(errorHandler);

export default app;
```

---

# 43. Your API architecture now

The complete backend flow becomes:

```text
                         ┌──────────────────┐
                         │      Client      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │      Routes      │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │       Middleware         │
                    │                          │
                    │ JWT                      │
                    │ Permission               │
                    │ Validation               │
                    │ Rate Limit               │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │    Controller    │
                       │                  │
                       │ HTTP handling    │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │     Service      │
                       │                  │
                       │ Business Logic   │
                       │ Authorization    │
                       │ Duplicate check  │
                       │ Audit            │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │      Query       │
                       │                  │
                       │ Parameterized    │
                       │ SQL              │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       └──────────────────┘
```

## Most important interview explanation

If they ask:

> **"Why did you separate controller, service and query?"**

Answer:

> **Controller handles HTTP requests and responses. Service contains business rules and authorization decisions. Query files contain only database operations and parameterized SQL. This keeps the business logic independent from the HTTP and database layers and makes the code easier to test and maintain.**

For example:

```text
POST /api/followups
        │
        ▼
followup.controller.ts
        │
        ▼
followup.service.ts
        │
        ├── Verify debtor belongs to department
        │
        ├── Check duplicate follow-up
        │
        ├── Create follow-up
        │
        └── Create audit log
        │
        ▼
followup.query.ts
        │
        ▼
PostgreSQL
```

That is the **main service-oriented structure** I would use for this assessment.

The next pieces that should be implemented around this are **refresh-token rotation, Redis rate limiting, WebSocket follow-up events, transaction-safe follow-up creation/audit logging, and the exact Zod validation for every endpoint**.
