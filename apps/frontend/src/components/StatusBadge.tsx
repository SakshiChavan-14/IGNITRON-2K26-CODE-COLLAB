import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'info',
  pulse = false,
}) => {
  const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-800/60',
    },
    warning: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      border: 'border-amber-800/60',
    },
    danger: {
      bg: 'bg-rose-950/60',
      text: 'text-rose-400',
      dot: 'bg-rose-400',
      border: 'border-rose-800/60',
    },
    info: {
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-400',
      dot: 'bg-cyan-400',
      border: 'border-cyan-800/60',
    },
  };

  const current = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border uppercase ${current.bg} ${current.text} ${current.border}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      {label}
    </span>
  );
};

