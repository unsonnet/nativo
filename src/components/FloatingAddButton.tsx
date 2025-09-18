'use client';

type FloatingAddButtonProps = {
  onClick?: () => void;
};

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white text-slate-950 text-3xl font-semibold shadow-2xl ring-1 ring-white/70 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
      aria-label="Add report"
    >
      +
    </button>
  );
}
