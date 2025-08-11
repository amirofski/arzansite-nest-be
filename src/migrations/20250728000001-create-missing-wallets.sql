-- Create wallets for existing users who don't have one
INSERT INTO public.wallets (user_id, balance)
SELECT 
  u.id as user_id,
  0.00 as balance
FROM auth.users u
LEFT JOIN public.wallets w ON u.id = w.user_id
WHERE w.id IS NULL;

-- Also ensure the trigger is properly set up
-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;

CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_user_wallet();