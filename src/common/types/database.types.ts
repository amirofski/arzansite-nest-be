export interface Order {
  $id?: string; // Appwrite document ID
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_amount?: number;
  comments?: string;
  payment_status?: string;
  zarinpal_authority?: string;
  zarinpal_ref_id?: string;
  wizard_data?: any;
  site_type?: string;
  session_id?: string;
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
  transaction_type: 'payment_request' | 'payment_verification' | 'refund' | 'cancellation' | 'wallet_deposit_request' | 'wallet_deposit_verification';
  zarinpal_authority?: string;
  zarinpal_ref_id?: string;
  zarinpal_invoice_id?: string;
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
