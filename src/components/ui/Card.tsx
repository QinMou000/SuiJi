import React from 'react';
import { cn } from '../../lib/utils';

type CardVariant = 'glass' | 'solid' | 'plain' | 'inset';

const VARIANTS: Record<CardVariant, string> = {
  glass: 'glass',
  solid: 'surface',
  plain: 'bg-transparent',
  inset: 'glass-inset',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'glass', ...props }: CardProps) {
  return <div className={cn('rounded-card', VARIANTS[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-xs leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 px-5 pb-5', className)} {...props} />;
}
