-- Create wireframes table for saving user wireframe designs
CREATE TABLE public.wireframes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wireframes ENABLE ROW LEVEL SECURITY;

-- Create policies for wireframes
CREATE POLICY "Users can view their own wireframes" 
ON public.wireframes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wireframes" 
ON public.wireframes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wireframes" 
ON public.wireframes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wireframes" 
ON public.wireframes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wireframes_updated_at
BEFORE UPDATE ON public.wireframes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for wireframe assets
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('wireframe-assets', 'wireframe-assets', true);
EXCEPTION WHEN unique_violation THEN
  -- bucket exists, ignore
END $$;

-- Create storage policies for wireframe assets
CREATE POLICY "Wireframe assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'wireframe-assets');

CREATE POLICY "Users can upload their wireframe assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'wireframe-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their wireframe assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'wireframe-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their wireframe assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'wireframe-assets' AND auth.uid()::text = (storage.foldername(name))[1]);