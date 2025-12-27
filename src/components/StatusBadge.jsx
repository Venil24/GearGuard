import React from 'react';
import { cn } from '../lib/utils';

const statusConfig = {
  new: {
    label: 'New',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  repaired: {
    label: 'Repaired',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  scrap: {
    label: 'Scrap',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

export const StatusBadge = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
};

export const RequestTypeBadge = ({ type, className }) => {
  const isPreventive = type === 'preventive';
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        isPreventive
          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
          : 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        className
      )}
      data-testid={`type-badge-${type}`}
    >
      {isPreventive ? 'Preventive' : 'Corrective'}
    </span>
  );
};
