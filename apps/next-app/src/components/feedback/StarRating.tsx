'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const starSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

export default function StarRating({
  value,
  onChange,
  maxStars = 5,
  size = 'md',
  disabled = false
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverValue(0);
    }
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const isActive = hoverValue > 0 ? starValue <= hoverValue : starValue <= value;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={`transition-colors duration-150 ${
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
            }`}
            aria-label={`Avaliar com ${starValue} estrela${starValue !== 1 ? 's' : ''}`}
          >
            <Star
              className={`${starSizes[size]} ${
                isActive
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              } transition-colors duration-150`}
            />
          </button>
        );
      })}
    </div>
  );
}