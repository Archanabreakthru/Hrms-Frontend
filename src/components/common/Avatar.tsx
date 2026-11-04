import React from 'react';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const colorPairs = [
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-purple-600', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-sky-600', text: 'text-white' },
  { bg: 'bg-violet-600', text: 'text-white' }
];

export const Avatar: React.FC<AvatarProps> = ({
  src,
  firstName = '',
  lastName = '',
  className = '',
  size = 'md'
}) => {
  const getInitials = () => {
    const first = (firstName || '').trim().charAt(0).toUpperCase();
    const last = (lastName || '').trim().charAt(0).toUpperCase();
    return (first + last) || 'EM';
  };

  const getThemeColor = () => {
    const combined = firstName + lastName;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colorPairs.length;
    return colorPairs[idx];
  };

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-sm font-semibold',
    xl: 'h-20 w-20 text-lg font-bold'
  };

  const isRealPhoto = Boolean(
    src &&
      src.trim() !== '' &&
      !src.includes('unsplash.com') &&
      (src.startsWith('data:image') || src.startsWith('blob:') || src.startsWith('http'))
  );

  if (isRealPhoto) {
    return (
      <img
        src={src!}
        alt={(firstName + ' ' + lastName).trim() || 'Employee'}
        className={`rounded-full object-cover shrink-0 ring-1 ring-slate-200/80 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const { bg, text } = getThemeColor();
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-bold tracking-wider select-none shadow-xs ring-1 ring-slate-200/60 ${bg} ${text} ${sizeClasses[size]} ${className}`}
      aria-label={(firstName + ' ' + lastName).trim() || 'Employee'}
    >
      {getInitials()}
    </div>
  );
};
