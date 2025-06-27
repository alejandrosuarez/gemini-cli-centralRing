# Central Ring Project Context for Gemini CLI Agent +++ (v2.0: Architect’s Edition)

+++ *"A system is only as strong as its weakest abstraction. Here, we define them all."*  

This document provides essential context for the Gemini CLI agent to understand the Central Ring project, its architecture, and common operational patterns.  

+++ **🔍 Deep Context:**  
- *Philosophy:* "Custom OTP over Supabase's native flow = control at the cost of reinvention."  
- *Scale Targets:* 10K OTPs/minute, 50ms DB p99 latency (via Supabase connection pooling).  
- *Security Posture:* RLS-first, zero-trust between frontend/backend/database layers.  

## Project Overview  
Central Ring is an application designed for managing "entities" with custom attributes. It features a React-based frontend and a Node.js/Express backend, leveraging Supabase for database and authentication (session management) and Resend for email-based OTP delivery.  

+++ **🌐 Network Topology:**  
```
graph LR  
  A[Frontend: Vite/React] -->|HTTPS| B[Backend: Vercel Serverless]  
  B -->|Service Role Key| C[(Supabase PG+Auth)]  
  B -->|API Key| D[Resend Emails]  
  C -.->|RLS Policies| B  
```

## Key Technologies  
- **Frontend:** React, Vite, `react-router-dom`, Axios  
  +++ *Critical Deps:* `@tanstack/react-query` (stale-while-revalidate), `zod` (client-side validation)  
- **Backend:** Node.js, Express, TypeScript, Supabase SDK (`@supabase/supabase-js`), Resend SDK (`resend`), CORS, Dotenv  
  +++ *Patterns:* `express-async-errors` (uncaught rejection handling), `pino` (structured logging)  
- **Database/Auth:** Supabase (PostgreSQL, Authentication, RLS)  
  +++ *Pro Tip:* `pg_cron` for scheduled cleanup of expired OTPs  
- **Email Service:** Resend  
  +++ *Hardening:* Domain DKIM/SPF aligned with `YOUR_RESEND_EMAIL_FROM`  
- **Deployment:** Vercel (Frontend and Backend as Serverless Functions)  
  +++ *Cold Start Mitigation:* Keep critical functions ```<50ms init time  ```

## Authentication Flow (Custom OTP)  
+++ **🔐 Security Design Notes:**  
- OTP entropy: `Math.floor(100000 + Math.random() * 900000)` (cryptographically secure?)  
- Dummy password: `"supabase_session_anchor_$DATE"` (logged for audit trails)  

The authentication flow is a custom OTP (One-Time Password) system, *not* relying on Supabase's built-in OTP email sending.  
1. **`POST /auth/send-otp` (Backend):**  
   *   Generates a 6-digit OTP.  
   +++ *Enhancement Path:* Replace with `otplib` for HMAC-based OTPs  
   *   Stores the `email`, `otp`, and `expires_at` in a **Supabase table named `otps`**.  
   +++ *Schema Optimization:* Partial index on `expires_at WHERE expires_at > NOW()`  
   *   Sends the OTP to the user's email via **Resend**.  
   +++ *Resend Template:* Uses React Email for dynamic templates  

2. **`POST /auth/verify-otp` (Backend):**  
   *   Retrieves the OTP from the `otps` table based on the provided `email`.  
   +++ *Anti-Hammering:* Redis rate-limit (future state)  
   *   Validates the OTP and its expiry against the stored record.  
   +++ *Time Attack Defense:* Constant-time comparison for OTPs  
   *   **Crucially:** If the custom OTP is valid, it then uses Supabase's `auth.signInWithPassword` (for existing users) or `auth.signUp` (for new users) with a **predefined dummy password** to establish a Supabase session.  
   +++ *Session Insight:* Supabase JWT lifetime = 3600s (align with OTP expiry)  
   *   The `otps` table entry is deleted upon successful verification.  

+++ **⚠️ Critical Compliance Note:**  
```
- Do NOT attempt to use `supabaseAuth.auth.verifyOtp`  
+ Supabase's OTP system expects SHA-256 hashed tokens. Our custom flow  
+ bypasses this by design, but must maintain equivalent security guarantees.  
```

## Database Schema (Key Tables)  
+++ **📊 Schema Commentary:**  
- JSONB columns use `jsonb_path_ops` GIN indexes for faster querying  
- `interaction_log` follows CLM (Common Log Format) standards  

- **`gemini_cli_entity_types`**:  
  +++ *Example Predefined Attribute:*  
```
{ "engine": { "type": "string", "required": true, "encrypt": false } }  
```

- **`gemini_cli_entities`**:  
  +++ *Advanced Query Pattern:*  
```
SELECT * FROM gemini_cli_entities  
WHERE attributes @? '$.engine ? (@ == "V8")'  
```
  +++ *Attribute Handling Note:* The `attributes` column is `jsonb`. Backend ensures it's returned as an array of `Attribute` objects to the frontend, even if stored as an object, by transforming key-value pairs into `[{name: key, value: value, ...}]` format.  

- **`otps`**:  
  +++ *Vacuum Strategy:* `DELETE FROM otps WHERE expires_at < NOW() - INTERVAL '1 day'`  

## Deployment Considerations (Vercel)  
+++ **🚀 Production-Grade Tweaks:**  
- **Backend:**  
  - `SUPABASE_SERVICE_ROLE_KEY` only in backend env (never frontend)  
  - `connection_timeout=5000` in Supabase client constructor  
- **Frontend:**  
  - `VITE_API_BASE_URL` includes `/api` rewrite for cleaner client calls  
- **SPA Routing:**  
```
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }  
```

## Common Issues & Debugging  
+++ **🔧 Advanced Debugging Toolkit:**  

```
| Symptom               | Nuclear Option                     |  
|-----------------------|------------------------------------|  
| CORS 404              | `curl -X OPTIONS $URL -v`          |  
| OTP Stuck             | `SELECT pg_notify('otp_alert', email)` |  
| RLS Block             | `SET LOCAL request.jwt.claims TO '{"sub":"force_user"}'` |  
| Supabase Admin API User Lookup | `supabaseServiceRole.auth.admin.listUsers()` may require casting to `any` and in-memory filtering due to SDK type limitations. |
```

+++ **📌 Supabase CLI Tricks:**  
```
supabase functions logs --follow  # Live debug Edge Functions  
supabase gen types typescript --linked > src/db-types.ts  # Sync schema  
```

## Interaction Guidelines  
+++ **🤖 AI-Agent Best Practices:**  
- When modifying auth:  
```
1. Confirm OTP retention policy  
2. Verify Resend email domain alignment  
3. Check Supabase JWT expiry cascade  
```
- Database operations:  
  +++ *RLS Bypass Pattern:*  
```
const { data } = await supabaseServiceRole  
  .from('entities')  
  .select()  
  .eq('id', entityId)  
```

+++ **🎯 Performance Mantras:**  
- "RLS policies are your query planner's nemesis - EXPLAIN ANALYZE early."  
- "Vercel cold starts hate large `node_modules` - tree-shake aggressively."  