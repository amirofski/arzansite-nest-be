    -- Add payment tracking fields to orders table
    ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS zarinpal_authority TEXT,
    ADD COLUMN IF NOT EXISTS zarinpal_ref_id TEXT;