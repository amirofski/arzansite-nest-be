export interface Order {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  comments?: string;
  payment_status?: string;
  zarinpal_authority?: string;
  zarinpal_ref_id?: string;
  design_data?: any;
  design_options?: any;
  design_preview_url?: string;
  total_pages?: number;
  total_sections?: number;
  created_at: string;
  updated_at: string;
}

export interface DesignData {
  id: string;
  order_id: string;
  page_id: string;
  page_name: string;
  sections: any;
  canvas_dimensions: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  user_id: string;
  transaction_type: 'payment_request' | 'payment_verification' | 'refund' | 'cancellation';
  zarinpal_authority?: string;
  zarinpal_ref_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  gateway_response?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteConfig {
  id: string;
  mode: 'normal' | 'temporarily_unavailable' | 'update_mode' | 'development_mode';
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}
