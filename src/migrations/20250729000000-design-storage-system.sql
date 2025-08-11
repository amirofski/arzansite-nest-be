-- Add design storage fields to orders table
-- Migration: 20250729000000-design-storage-system.sql

-- Add design-related fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS design_data JSONB,
ADD COLUMN IF NOT EXISTS design_preview_url TEXT,
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS design_options JSONB;

-- Create design_data table for storing detailed design information
CREATE TABLE IF NOT EXISTS public.design_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  sections JSONB NOT NULL,
  canvas_dimensions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, page_id)
);

-- Create payment_transactions table for detailed payment tracking
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment_request', 'payment_verification', 'refund', 'cancellation')),
  zarinpal_authority TEXT,
  zarinpal_ref_id TEXT,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  gateway_response JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.design_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_data table
CREATE POLICY "Users can view their own design data"
ON public.design_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = design_data.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Prevent arbitrary client inserts; writes should be done via server functions
DROP POLICY IF EXISTS "Users can insert their own design data" ON public.design_data;

-- Prevent arbitrary client updates; writes should be done via server functions
DROP POLICY IF EXISTS "Users can update their own design data" ON public.design_data;

CREATE POLICY "Admins can view all design data"
ON public.design_data
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all design data"
ON public.design_data
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payment_transactions table
CREATE POLICY "Users can view their own payment transactions"
ON public.payment_transactions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payment transactions"
ON public.payment_transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all payment transactions"
ON public.payment_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_design_data_order_id ON public.design_data(order_id);
CREATE INDEX idx_design_data_page_id ON public.design_data(page_id);
CREATE INDEX idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_authority ON public.payment_transactions(zarinpal_authority);
CREATE INDEX idx_payment_transactions_ref_id ON public.payment_transactions(zarinpal_ref_id);

-- Function to save design data
CREATE OR REPLACE FUNCTION public.save_design_data(
  p_order_id UUID,
  p_design_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_design_id UUID;
  v_page_data JSONB;
  v_page_id TEXT;
  v_page_name TEXT;
  v_sections JSONB;
  v_canvas_dimensions JSONB;
  v_owner UUID;
BEGIN
  -- Authorization: allow service_role, order owner, or admins
  SELECT user_id INTO v_owner FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  IF current_user <> 'service_role' AND auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to save design data for this order';
  END IF;
  -- First, update the orders table with summary design data
  UPDATE public.orders
  SET 
    design_data = p_design_data,
    total_pages = jsonb_array_length(p_design_data->'pages'),
    total_sections = (
      SELECT COALESCE(SUM(jsonb_array_length(page->'sections')), 0)
      FROM jsonb_array_elements(p_design_data->'pages') AS page
    ),
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Clear existing design data for this order
  DELETE FROM public.design_data WHERE order_id = p_order_id;
  
  -- Insert detailed design data for each page
  FOR v_page_data IN SELECT * FROM jsonb_array_elements(p_design_data->'pages')
  LOOP
    v_page_id := v_page_data->>'id';
    v_page_name := v_page_data->>'name';
    v_sections := v_page_data->'sections';
    v_canvas_dimensions := v_page_data->'canvasDimensions';
    
    INSERT INTO public.design_data (
      order_id,
      page_id,
      page_name,
      sections,
      canvas_dimensions
    ) VALUES (
      p_order_id,
      v_page_id,
      v_page_name,
      v_sections,
      v_canvas_dimensions
    ) RETURNING id INTO v_design_id;
  END LOOP;
  
  RETURN v_design_id;
END;
$$;

-- Restrict function execution
REVOKE ALL ON FUNCTION public.save_design_data(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_design_data(UUID, JSONB) TO authenticated, service_role;

-- Function to get design data for an order
CREATE OR REPLACE FUNCTION public.get_design_data(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_design_data JSONB;
  v_pages JSONB;
BEGIN
  -- Get the main design data from orders table
  SELECT design_data INTO v_design_data
  FROM public.orders
  WHERE id = p_order_id;
  
  -- If no design data, return null
  IF v_design_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get detailed page data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', page_id,
      'name', page_name,
      'sections', sections,
      'canvasDimensions', canvas_dimensions
    )
  ) INTO v_pages
  FROM public.design_data
  WHERE order_id = p_order_id
  ORDER BY page_id;
  
  -- Return combined design data
  RETURN jsonb_build_object(
    'pages', v_pages,
    'currentPageId', v_design_data->>'currentPageId'
  );
END;
$$; 