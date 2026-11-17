import React from 'react';
import { cn } from '../../lib/utils';

/** Torn Sheet 的撕裂纸边，用来衔接封面与正文。 */
export function TornEdge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 28"
      preserveAspectRatio="none"
      aria-hidden
      className={cn('pointer-events-none block h-7 w-full', className)}
    >
      <path
        d="M0 28 L0 12 L11 15 L19 9 L29 16 L38 8 L49 14 L58 6 L69 13 L79 9 L91 17 L101 8 L112 14 L123 5 L134 13 L145 8 L156 16 L167 7 L179 13 L190 4 L201 12 L213 7 L224 15 L236 6 L247 12 L258 5 L270 14 L281 7 L292 13 L304 4 L315 12 L327 6 L338 14 L349 8 L360 15 L371 6 L382 13 L391 9 L400 14 L400 28 Z"
        fill="hsl(var(--background))"
      />
      <path
        d="M0 12 L11 15 L19 9 L29 16 L38 8 L49 14 L58 6 L69 13 L79 9 L91 17 L101 8 L112 14 L123 5 L134 13 L145 8 L156 16 L167 7 L179 13 L190 4 L201 12 L213 7 L224 15 L236 6 L247 12 L258 5 L270 14 L281 7 L292 13 L304 4 L315 12 L327 6 L338 14 L349 8 L360 15 L371 6 L382 13 L391 9 L400 14"
        fill="none"
        stroke="hsl(var(--focus) / 0.18)"
        strokeWidth="1"
      />
    </svg>
  );
}
