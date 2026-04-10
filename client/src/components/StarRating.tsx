import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  'data-testid'?: string;
}

export default function StarRating({ value, onChange, 'data-testid': testId }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (rating: number) => {
    onChange(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="star-rating" 
        onMouseLeave={handleMouseLeave}
        data-testid={testId}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`star fas fa-star ${
              star <= (hoverRating || value) ? 'filled' : ''
            }`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
            data-testid={`star-${star}`}
          />
        ))}
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:bg-muted"
        onClick={() => handleStarClick(0)}
        data-testid="clear-rating"
      >
        No Experience
      </button>
    </div>
  );
}
