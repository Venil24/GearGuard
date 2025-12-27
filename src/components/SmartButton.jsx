import React from 'react';
import { cn } from '../lib/utils';

export const SmartButton = ({ icon: Icon, count, label, onClick, variant = 'default', className }) => {
  const variants = {
    default: 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300',
    warning: 'border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400',
    success: 'border-green-500/20 bg-green-500/10 hover:bg-green-500/20 text-green-400',
    danger: 'border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400',
    info: 'border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center h-20 w-full min-w-[120px] border rounded-sm transition-all duration-150',
        variants[variant],
        className
      )}
      data-testid={`smart-button-${label?.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {Icon && <Icon className="h-5 w-5 mb-1" />}
      <span className="font-mono text-xl font-bold">{count}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </button>
  );
};
