import { ServerStatus, AppStatus, BackupStatus } from '@/lib/types';
import Badge from './Badge';

type StatusValue = ServerStatus | AppStatus | BackupStatus;

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

function getColor(status: StatusValue): 'green' | 'gray' | 'yellow' | 'red' | 'blue' {
  switch (status) {
    case 'active':
    case 'running':
    case 'success':
      return 'green';
    case 'inactive':
    case 'stopped':
      return 'gray';
    case 'maintenance':
    case 'deploying':
      return 'yellow';
    case 'decommissioned':
    case 'error':
    case 'failed':
      return 'red';
    case 'never_run':
      return 'blue';
    default:
      return 'gray';
  }
}

function formatLabel(status: StatusValue): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge color={getColor(status)} className={className}>
      {formatLabel(status)}
    </Badge>
  );
}
