export function Header() {
  return (
    <header className="w-full px-8 py-6 flex items-center justify-between border-b border-border/10">
      <h1 className="text-xl font-medium text-foreground">FloorPlan Reports</h1>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">John Smith</span>
        <div className="h-8 w-8 rounded-full bg-gray-600" />
      </div>
    </header>
  );
}
