export interface User {
  id: string;
  email: string;
  display_name: string;
  organization_id: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  signature?: string;
  business_context?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  user_count?: number;
}

export interface GCPConfig {
  organization_id: string;
  client_id: string;
  redirect_uri: string;
  updated_at: string;
}

export interface AzureConfig {
  organization_id: string;
  client_id: string;
  tenant_id: string;
  redirect_uri: string;
  updated_at: string;
}

export interface GmailAccount {
  id: string;
  email: string;
  organization_id: string;
  expires_at: string;
}

export interface OutlookAccount {
  id: string;
  email: string;
  organization_id: string;
  expires_at: string;
}

export interface Message {
  id: string;
  organization_id: string;
  gmail_account_id?: string;
  outlook_account_id?: string;
  thread_id: string;
  subject: string;
  from_email: string;
  from_name: string;
  body_text: string;
  received_at: string;
  // Joined from classifications:
  category?: string;
  urgency?: string;
  sentiment?: string;
  summary?: string;
  requires_human_review?: boolean;
  // Joined from drafts:
  draft_id?: string;
  draft_status?: string;
  draft_text?: string;
}

export interface Classification {
  message_id: string;
  organization_id: string;
  category: 'sales' | 'support' | 'billing' | 'spam' | 'general';
  urgency: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  summary: string;
  sender_name?: string;
  sender_email?: string;
  company_name?: string;
  requested_action?: string;
  requires_human_review: boolean;
  confidence: number;
}

export interface Draft {
  id: string;
  message_id: string;
  organization_id: string;
  persona_id: string;
  draft_text: string;
  status: 'draft' | 'approved' | 'rejected' | 'sent';
  created_at: string;
  sent_at?: string;
}

export interface Persona {
  id: string;
  name: string;
  tone: string;
  description: string;
}
