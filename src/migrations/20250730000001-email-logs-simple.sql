-- Simple email logs table for SMTP email tracking
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    service_used TEXT DEFAULT 'supabase_smtp',
    template_type TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_success ON public.email_logs(success);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs(template_type);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all email logs
CREATE POLICY "Admins can view all email logs" ON public.email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can only see their own email logs
CREATE POLICY IF NOT EXISTS "Users can view own email logs" ON public.email_logs
    FOR SELECT USING (user_id = auth.uid());

-- Service role can insert email logs
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
CREATE POLICY "Service role can insert email logs" ON public.email_logs
    FOR INSERT
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Grant permissions
-- Limit inserts to service role; allow authenticated read only of own logs if user_id exists
REVOKE ALL ON public.email_logs FROM PUBLIC;
GRANT SELECT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO service_role;