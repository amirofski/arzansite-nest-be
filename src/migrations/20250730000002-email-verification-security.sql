-- Email verification security improvements
-- Adds timeout and logging for better security

-- Add email verification timeout column
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- Set 24-hour expiration for existing unverified users
UPDATE auth.users 
SET email_verification_expires_at = created_at + INTERVAL '24 hours'
WHERE email_confirmed_at IS NULL 
AND email_verification_expires_at IS NULL;

-- Create email verification logs table
CREATE TABLE IF NOT EXISTS public.email_verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_sent_at TIMESTAMPTZ DEFAULT NOW(),
  verification_clicked_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_user_id 
ON public.email_verification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_logs_email 
ON public.email_verification_logs(email);

CREATE INDEX IF NOT EXISTS idx_email_verification_logs_sent_at 
ON public.email_verification_logs(verification_sent_at);

-- Enable RLS
ALTER TABLE public.email_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email verification logs
DROP POLICY IF EXISTS "Users can view own verification logs" ON public.email_verification_logs;
CREATE POLICY "Users can view own verification logs"
ON public.email_verification_logs
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all verification logs" ON public.email_verification_logs;
CREATE POLICY "Admins can view all verification logs"
ON public.email_verification_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Service role can insert verification logs" ON public.email_verification_logs;
DROP POLICY IF EXISTS "Service role can insert verification logs" ON public.email_verification_logs;
CREATE POLICY "Service role can insert verification logs"
ON public.email_verification_logs
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Function to check if email verification is expired
CREATE OR REPLACE FUNCTION public.is_email_verification_expired(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT 
    email_verification_expires_at IS NOT NULL 
    AND email_verification_expires_at < NOW()
  FROM auth.users 
  WHERE id = user_uuid;
$$;

-- Function to log email verification attempt
CREATE OR REPLACE FUNCTION public.log_email_verification(
  p_user_id UUID,
  p_email TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.email_verification_logs (
    user_id,
    email,
    verification_expires_at,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_email,
    NOW() + INTERVAL '24 hours',
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to mark email verification as successful
CREATE OR REPLACE FUNCTION public.mark_email_verification_success(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_verification_logs
  SET 
    verification_clicked_at = NOW(),
    success = TRUE
  WHERE user_id = p_user_id
    AND verification_clicked_at IS NULL
    AND verification_expires_at > NOW();
  
  RETURN FOUND;
END;
$$;

-- Function to mark email verification as failed
CREATE OR REPLACE FUNCTION public.mark_email_verification_failed(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_verification_logs
  SET 
    verification_clicked_at = NOW(),
    success = FALSE,
    failure_reason = p_reason
  WHERE user_id = p_user_id
    AND verification_clicked_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Trigger to automatically set expiration for new users
CREATE OR REPLACE FUNCTION public.set_email_verification_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Set 24-hour expiration for new users
  NEW.email_verification_expires_at = NEW.created_at + INTERVAL '24 hours';
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_user_created_set_verification_expiration
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.set_email_verification_expiration();

-- Update RLS policies to require email verification
-- Users can only access their own data if email is verified
DROP POLICY IF EXISTS "Users can only access verified accounts" ON public.profiles;
CREATE POLICY "Users can only access verified accounts"
ON public.profiles
FOR ALL
USING (
  public.is_email_verified(user_id) OR 
  public.has_role(auth.uid(), 'admin')
);

-- Grant permissions
REVOKE ALL ON public.email_verification_logs FROM PUBLIC;
GRANT SELECT ON public.email_verification_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verification_logs TO service_role;

-- Create view for email verification statistics
CREATE OR REPLACE VIEW public.email_verification_stats AS
SELECT 
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE success = TRUE) as successful_verifications,
  COUNT(*) FILTER (WHERE success = FALSE) as failed_verifications,
  COUNT(*) FILTER (WHERE verification_expires_at < NOW() AND verification_clicked_at IS NULL) as expired_verifications,
  ROUND(
    (COUNT(*) FILTER (WHERE success = TRUE)::DECIMAL / COUNT(*)) * 100, 2
  ) as success_rate
FROM public.email_verification_logs
WHERE verification_sent_at >= NOW() - INTERVAL '30 days';

-- Grant access to stats view
GRANT SELECT ON public.email_verification_stats TO authenticated; 