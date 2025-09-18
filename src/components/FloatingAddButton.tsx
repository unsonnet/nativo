'use client';

type FloatingAddButtonProps = {
  onClick?: () => void;
};

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="floating-add-button"
      aria-label="Add report"
    >
      +
    </button>
  );
}
