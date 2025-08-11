-- Update the process_wallet_transaction function to create wallet if it doesn't exist
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
  -- Get user's wallet, create if doesn't exist
  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create wallet for user
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0.00)
    RETURNING id, balance INTO v_wallet_id, v_balance_before;
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