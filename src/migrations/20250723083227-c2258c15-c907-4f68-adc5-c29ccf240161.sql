-- Create enum for site modes
CREATE TYPE public.site_mode AS ENUM ('normal', 'temporarily_unavailable', 'update_mode', 'development_mode');

-- Create site_config table
CREATE TABLE public.site_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode site_mode NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage site config
CREATE POLICY "Admins can manage site config" 
ON public.site_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create policy for everyone to read site config
CREATE POLICY "Everyone can read site config" 
ON public.site_config 
FOR SELECT 
USING (true);

-- Insert default configuration
INSERT INTO public.site_config (mode) VALUES ('normal');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_site_config_updated_at
BEFORE UPDATE ON public.site_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();