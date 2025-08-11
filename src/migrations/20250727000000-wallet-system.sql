-- Create wallet system tables
-- Migration: 20250727000000-wallet-system.sql

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction types enum
CREATE TYPE public.transaction_type AS ENUM (
  'deposit',      -- User adds money to wallet
  'withdrawal',   -- User withdraws money from wallet
  'payment',      -- Payment for order
  'refund',       -- Refund from cancelled/deleted order
  'credit',       -- Admin credit to user wallet
  'debit'         -- Admin debit from user wallet
);

-- Create transaction status enum
CREATE TYPE public.transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'cancelled'
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- For linking to orders or other entities
  reference_type TEXT, -- 'order', 'payment', etc.
  metadata JSONB, -- Additional data like payment gateway info
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets table
CREATE POLICY IF NOT EXISTS "Users can view their own wallet"
ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

-- Do not allow users to directly update wallet balances
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

CREATE POLICY IF NOT EXISTS "Admins can view all wallets"
ON public.wallets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can update all wallets"
ON public.wallets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions table
CREATE POLICY IF NOT EXISTS "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Prevent users from inserting arbitrary transactions; must go via server logic
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;

CREATE POLICY IF NOT EXISTS "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can create transactions"
ON public.transactions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can update all transactions"
ON public.transactions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user wallet creation
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_user_wallet();

-- Function to process wallet transaction
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id UUID,
  p_type transaction_type,
  p_amount DECIMAL(12,2),
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
  v_transaction_id UUID;
BEGIN
  -- Authorization: allow service_role token, the user themselves, or admins
  IF (COALESCE(auth.jwt() ->> 'role', '') <> 'service_role')
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to process wallet transaction for this user';
  END IF;

  -- Get user's wallet
  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  
  -- Calculate new balance based on transaction type
  CASE p_type
    WHEN 'deposit', 'refund', 'credit' THEN
      v_balance_after := v_balance_before + p_amount;
    WHEN 'withdrawal', 'payment', 'debit' THEN
      v_balance_after := v_balance_before - p_amount;
      IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient funds. Required: %, Available: %', p_amount, v_balance_before;
      END IF;
  END CASE;
  
  -- Create transaction record
  INSERT INTO public.transactions (
    wallet_id,
    user_id,
    type,
    status,
    amount,
    balance_before,
    balance_after,
    description,
    reference_id,
    reference_type,
    metadata
  ) VALUES (
    v_wallet_id,
    p_user_id,
    p_type,
    'completed',
    p_amount,
    v_balance_before,
    v_balance_after,
    p_description,
    p_reference_id,
    p_reference_type,
    p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  -- Update wallet balance
  UPDATE public.wallets
  SET balance = v_balance_after
  WHERE id = v_wallet_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Restrict function execution
REVOKE ALL ON FUNCTION public.process_wallet_transaction(UUID, transaction_type, DECIMAL, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(UUID, transaction_type, DECIMAL, TEXT, UUID, TEXT, JSONB) TO authenticated, service_role;

-- Function to refund order to wallet
CREATE OR REPLACE FUNCTION public.refund_order_to_wallet(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_record RECORD;
  v_transaction_id UUID;
BEGIN
  -- Authorization: allow service_role token or admins only
  IF (COALESCE(auth.jwt() ->> 'role', '') <> 'service_role')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to refund order to wallet';
  END IF;

  -- Get order details
  SELECT user_id, price, title INTO v_order_record
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  IF v_order_record.price IS NULL OR v_order_record.price <= 0 THEN
    RAISE EXCEPTION 'Order has no refundable amount';
  END IF;
  
  -- Process refund transaction
  SELECT public.process_wallet_transaction(
    v_order_record.user_id,
    'refund',
    v_order_record.price,
    'Refund for cancelled order: ' || v_order_record.title,
    p_order_id,
    'order',
    '{"order_id": "' || p_order_id || '"}'
  ) INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Restrict function execution
REVOKE ALL ON FUNCTION public.refund_order_to_wallet(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_order_to_wallet(UUID) TO authenticated, service_role;

-- Create indexes for better performance
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transactions_reference ON public.transactions(reference_id, reference_type); 