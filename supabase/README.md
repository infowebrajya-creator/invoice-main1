# WebRajya Billing POS - Supabase PostgreSQL Migrations

This folder contains version-controlled SQL migrations, database functions, RLS security policies, and TypeScript interfaces for the production database of **WebRajya Billing POS**.

## ⚡ Quick 1-Click Setup for a New Client / Supabase Account

If you are setting up the database for a **new client** or a **new Supabase account**, you do **not** need to run individual migration files one by one.

1. Open your new Supabase Project Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** -> **New query**.
3. Copy the entire contents of [`supabase/NEW_DATABASE_SETUP.sql`](file:///Users/aryanrajput/Desktop/work%20/the%20second%20shop/supabase/NEW_DATABASE_SETUP.sql) and paste it.
4. Click **Run** (Green button).
5. Go to **Project Settings** -> **Data API**:
   - Copy the **Project URL**
   - Copy the **anon / publishable key**
6. Paste them into `.env` (`VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`) or in the app's **Settings -> Cloud Sync & Backup** panel!

---

## 📁 Migration Files & Setup Architecture

| Migration File | Description |
| :--- | :--- |
| `20261009000001_create_tables.sql` | Creates all 9 tables (`store_settings`, `profiles`, `categories`, `products`, `invoices`, `invoice_items`, `payments`, `stock_movements`, `audit_logs`), column constraints, numeric types, and partial unique indexes. |
| `20261009000002_functions_and_triggers.sql` | Implements server-side invoice sequence counter `generate_invoice_number()`, updated_at triggers, and the atomic `complete_sale()` transaction function with stock locking & idempotency protection. |
| `20261009000003_rls_and_permissions.sql` | Enables Row Level Security (RLS) across all 9 tables, owner/cashier permissions, read/write policies, and protects completed invoices from direct REST API modification. |

---

## 🚀 How to Apply Migrations to Supabase

### Method A: Using Supabase CLI (Recommended)

1. **Link your local repository to your Supabase Project**:
   ```bash
   npx supabase link --project-ref your-supabase-project-ref
   ```

2. **Apply migrations to production PostgreSQL**:
   ```bash
   npx supabase db push
   ```

---

### Method B: Using Supabase Web Dashboard (SQL Editor)

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy and execute the contents of each migration file in chronological order:
   - Run `supabase/migrations/20261009000001_create_tables.sql`
   - Run `supabase/migrations/20261009000002_functions_and_triggers.sql`
   - Run `supabase/migrations/20261009000003_rls_and_permissions.sql`

---

## 🧪 Verification & Testing

Execute `supabase/verification_queries.sql` inside the Supabase SQL Editor. It will:
- Check existence of all 9 tables.
- Verify foreign keys, check constraints, and unique indexes.
- Test server-side invoice number generation.
- Insert a test product and execute `complete_sale()`.
- Validate atomic stock deduction and idempotency replay protection.
- Confirm RLS policies are enabled.

---

## 🔒 Security & Data Integrity Guarantees

- **No Floating Point Errors**: Monetary amounts use `NUMERIC(12,2)` and quantities use `NUMERIC(12,3)`.
- **Item & Tax Snapshots**: `invoice_items` stores historical snapshots of product name, SKU, unit rate, HSN, MRP, and GST rate at the time of sale. Modifying or deleting a product in the catalog never alters old historical invoices.
- **Idempotency Protection**: `complete_sale()` uses `p_idempotency_key`. Retrying a network request with the same idempotency key replays the original invoice without creating duplicate transactions or double-deducting stock.
- **Atomic Concurrency Safety**: `SELECT FOR UPDATE` locks product rows during sales transactions, preventing race conditions or negative inventory.
- **Client Security**: Service-role keys are never included in browser code. All actions execute under public publishable anon key using RLS policies and `SECURITY DEFINER` procedures.
