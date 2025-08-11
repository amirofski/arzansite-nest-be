-- Configure email verification settings
-- This migration ensures proper email verification flow

-- Update auth.users table to ensure email confirmation is required
-- Note: This is handled by Supabase Auth settings, but we can add custom logic here if needed

-- Create a function to handle email verification events
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Update user profile when email is verified
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles 
    SET updated_at = now()
    WHERE user_id = NEW.id;
    
    -- You can add additional logic here, such as:
    -- - Sending welcome emails
    -- - Creating default settings
    -- - Logging verification events
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_email_verification();

-- Create a function to check if user email is verified
CREATE OR REPLACE FUNCTION public.is_email_verified(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT email_confirmed_at IS NOT NULL 
  FROM auth.users 
  WHERE id = user_uuid;
$$;

-- Add RLS policy to ensure users can only access verified accounts
-- This is optional and depends on your security requirements
DROP POLICY IF EXISTS "Users can only access verified accounts" ON public.profiles;
CREATE POLICY "Users can only access verified accounts"
ON public.profiles
FOR ALL
USING (
  public.is_email_verified(user_id) OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create a function to get user verification status
CREATE OR REPLACE FUNCTION public.get_user_verification_status(user_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  email_verified BOOLEAN,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    id as user_id,
    email,
    email_confirmed_at IS NOT NULL as email_verified,
    email_confirmed_at,
    created_at
  FROM auth.users 
  WHERE id = user_uuid;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_email_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_verification_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_verification() TO service_role; 