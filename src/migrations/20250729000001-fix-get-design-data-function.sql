-- Fix get_design_data function to resolve GROUP BY error
-- Migration: 20250729000001-fix-get-design-data-function.sql

-- Function to get design data for an order (fixed version)
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
  
  -- Get detailed page data (removed ORDER BY to fix GROUP BY issue)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', page_id,
      'name', page_name,
      'sections', sections,
      'canvasDimensions', canvas_dimensions
    )
  ) INTO v_pages
  FROM public.design_data
  WHERE order_id = p_order_id;
  
  -- Return combined design data
  RETURN jsonb_build_object(
    'pages', v_pages,
    'currentPageId', v_design_data->>'currentPageId'
  );
END;
$$; 