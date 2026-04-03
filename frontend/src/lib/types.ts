export type ServerStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';

export interface Tag {
  id: number;
  name: string;
  color: string;
}
export type AppStatus = 'running' | 'stopped' | 'error' | 'deploying';
export type BackupStatus = 'success' | 'failed' | 'running' | 'never_run';
export type SshKeyType = 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';
export type BackupFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';

export interface Provider {
  id: number;
  name: string;
  website: string | null;
  support_contact: string | null;
  notes: string | null;
  monthly_budget: number | null;
  budget_currency: string | null;
  server_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderWithServers extends Provider {
  servers: Server[];
}

export interface Server {
  id: number;
  name: string;
  provider_id: number | null;
  provider_name: string | null;
  hostname: string | null;
  ip_v4: string | null;
  ip_v6: string | null;
  os: string | null;
  cpu_cores: number | null;
  ram_mb: number | null;
  disk_gb: number | null;
  location: string | null;
  datacenter: string | null;
  status: ServerStatus;
  monthly_cost: number | null;
  cost_currency: string | null;
  login_user: string | null;
  login_notes: string | null;
  notes: string | null;
  documentation: string | null;
  last_checked_at: string | null;
  last_check_status: string | null;
  response_time_ms: number | null;
  last_audited_at: string | null;
  last_audited_by: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface ServerDetail extends Server {
  applications: Application[];
  ssh_keys: ServerSshKey[];
}

export interface SshKey {
  id: number;
  name: string;
  key_type: SshKeyType | null;
  fingerprint: string | null;
  public_key: string | null;
  comment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SshKeyWithServers extends SshKey {
  servers: { server_id: number; server_name: string; is_authorized: boolean; is_host_key: boolean }[];
}

export interface ServerSshKey {
  id: number;
  server_id: number;
  ssh_key_id: number;
  ssh_key_name: string | null;
  server_name: string | null;
  is_authorized: boolean;
  is_host_key: boolean;
  notes: string | null;
  created_at: string;
}

export interface SshConnection {
  id: number;
  source_server_id: number;
  target_server_id: number;
  source_server_name: string | null;
  target_server_name: string | null;
  ssh_key_id: number | null;
  ssh_key_name: string | null;
  ssh_user: string | null;
  ssh_port: number;
  purpose: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: number;
  name: string;
  server_id: number;
  server_name: string | null;
  app_type: string | null;
  port: number | null;
  status: AppStatus;
  config_notes: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Backup {
  id: number;
  name: string;
  application_id: number | null;
  application_name: string | null;
  source_server_id: number;
  source_server_name: string | null;
  target_server_id: number | null;
  target_server_name: string | null;
  frequency: BackupFrequency;
  retention_days: number | null;
  storage_path: string | null;
  last_run_at: string | null;
  last_run_status: BackupStatus;
  notes: string | null;
  last_verified_at: string | null;
  last_verified_by: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  id: number;
  name: string;
  status: ServerStatus;
  ip_v4: string | null;
}

export interface GraphEdge {
  source: number;
  target: number;
  ssh_user: string | null;
  purpose: string | null;
}

export interface ConnectivityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DashboardStats {
  total_servers: number;
  active_servers: number;
  unhealthy_servers: number;
  total_providers: number;
  total_applications: number;
  total_ssh_keys: number;
  total_backups: number;
  failing_backups: number;
}

export interface CostByProvider {
  provider_name: string;
  total_cost: number;
  currency: string;
  server_count: number;
  monthly_budget: number | null;
  budget_utilization_pct: number | null;
}

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface CostSummary {
  total_monthly_cost: number;
  by_provider: CostByProvider[];
  totals_by_currency: CurrencyTotal[];
}

export interface RecentBackup {
  id: number;
  name: string;
  source_server_name: string | null;
  application_name: string | null;
  last_run_status: string;
  last_run_at: string | null;
}

export interface BackupCoverage {
  total_applications: number;
  covered_applications: number;
  failed_backups_24h: number;
  uncovered_applications: string[];
}

export interface OverdueBackup {
  id: number;
  name: string;
  frequency: string;
  last_run_at: string | null;
  source_server_name: string | null;
  application_name: string | null;
  hours_overdue: number;
}

export interface Activity {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  action: string;
  changes: string | null;
  created_at: string;
}

export interface CostByTag {
  tag_id: number;
  tag_name: string;
  tag_color: string;
  total_cost: number;
  currency: string;
  server_count: number;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  unchecked: number;
  last_full_check: string | null;
}

export interface BatchHealthCheckResult {
  checked: number;
  healthy: number;
  unhealthy: number;
  skipped: number;
  errors: string[];
}

export interface UndocumentedServer {
  id: number;
  name: string;
}

export interface DocumentationCoverage {
  total: number;
  documented: number;
  undocumented_servers: UndocumentedServer[];
}

export interface BulkUpdateResult {
  updated: number;
  errors: string[];
}

export interface EfficiencyMetric {
  provider_name: string;
  cost_per_cpu: number | null;
  cost_per_gb_ram: number | null;
  cost_per_gb_disk: number | null;
  avg_cost_per_server: number | null;
  server_count: number;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string;
  is_active: boolean;
  secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckRecord {
  id: number;
  server_id: number;
  status: string;
  response_time_ms: number | null;
  checked_at: string;
}

export interface UptimeStats {
  total_checks: number;
  healthy_checks: number;
  uptime_pct: number | null;
  avg_response_ms: number | null;
  period_days: number;
}

export interface InfrastructureSnapshot {
  id: number;
  snapshot_date: string;
  total_servers: number;
  active_servers: number;
  healthy_count: number;
  unhealthy_count: number;
  total_monthly_cost: number | null;
  backup_coverage_pct: number | null;
  documentation_coverage_pct: number | null;
  audit_compliance_pct: number | null;
}
