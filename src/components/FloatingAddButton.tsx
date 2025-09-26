'use client';

import { useRouter } from 'next/navigation';

type FloatingAddButtonProps = {
  onClick?: () => void;
};

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    onClick?.();
    router.push('/create');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="floating-add-button"
      aria-label="Add report"
    >
      +
    </button>
  );
}
