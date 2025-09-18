export function FloatingAddButton() {
  return (
    <button
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
      aria-label="Add report"
    >
      +
    </button>
  );
}
