import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxStars?: number;
  className?: string;
  allowClear?: boolean;
  glow?: boolean;
}

const SIZE_CONFIGS = {
  sm: { icon: 15, container: 18 },
  md: { icon: 20, container: 24 },
  lg: { icon: 32, container: 38 }, // 32px icon, responsive scalable for modals
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  maxStars = 5,
  className,
  allowClear = true,
  glow = true,
}) => {
  const displayRating = Math.round(value * 2) / 2;
  const config = SIZE_CONFIGS[size];

  const handleStarClick = (starValue: number) => {
    if (readonly || !onChange) return;
    if (allowClear && value === starValue) {
      onChange(0);
    } else {
      onChange(starValue);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 sm:gap-1.5 select-none", className)}>
      {Array.from({ length: maxStars }).map((_, idx) => {
        const starIndex = idx + 1;
        const isFull = displayRating >= starIndex;
        const isHalf = displayRating >= starIndex - 0.5 && displayRating < starIndex;

        if (readonly) {
          return (
            <div key={starIndex} className="flex items-center justify-center">
              {isFull ? (
                <Star
                  size={config.icon}
                  className={cn(
                    "fill-amber-400 text-amber-400",
                    glow && "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  )}
                />
              ) : isHalf ? (
                <StarHalf
                  size={config.icon}
                  className={cn(
                    "fill-amber-400 text-amber-400",
                    glow && "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  )}
                />
              ) : (
                <Star size={config.icon} className="text-slate-700/80" />
              )}
            </div>
          );
        }

        return (
          <div
            key={starIndex}
            className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95 group"
            style={{ width: `${config.container}px`, height: `${config.container}px` }}
          >
            {/* Left half clickable zone (for half star) */}
            <button
              type="button"
              className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStarClick(starIndex - 0.5);
              }}
              title={`${starIndex - 0.5} Stars`}
            />

            {/* Right half clickable zone (for full star) */}
            <button
              type="button"
              className="absolute right-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStarClick(starIndex);
              }}
              title={`${starIndex} Stars`}
            />

            {/* Star Icon Display */}
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
              {isFull ? (
                <Star
                  size={config.icon}
                  className={cn(
                    "fill-amber-400 text-amber-400",
                    glow && "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  )}
                />
              ) : isHalf ? (
                <StarHalf
                  size={config.icon}
                  className={cn(
                    "fill-amber-400 text-amber-400",
                    glow && "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  )}
                />
              ) : (
                <Star size={config.icon} className="text-slate-700 group-hover:text-slate-600 transition-colors" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
