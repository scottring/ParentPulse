'use client';

import React from 'react';

interface TechnicalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantMap = {
  primary: `
    bg-slate-800 text-white border-2 border-slate-800
    hover:bg-slate-700
    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
    hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
    hover:translate-x-[2px] hover:translate-y-[2px]
  `,
  secondary: `
    bg-white text-slate-800 border-2 border-slate-800
    hover:bg-slate-50
    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
    hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
    hover:translate-x-[2px] hover:translate-y-[2px]
  `,
  outline: `
    bg-transparent text-slate-800 border-2 border-slate-800
    hover:bg-slate-100
  `,
  danger: `
    bg-red-600 text-white border-2 border-red-600
    hover:bg-red-700
    shadow-[4px_4px_0px_0px_rgba(185,28,28,1)]
    hover:shadow-[2px_2px_0px_0px_rgba(185,28,28,1)]
    hover:translate-x-[2px] hover:translate-y-[2px]
  `,
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function TechnicalButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
}: TechnicalButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-mono font-bold uppercase tracking-wider
        transition-all duration-150
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : ''}
        ${className}
      `}
    >
      [ {children} ]
    </button>
  );
}

export default TechnicalButton;
