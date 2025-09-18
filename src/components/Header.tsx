export function Header() {
  return (
    <header className="app-header">
      <h1 className="app-header__title">FloorPlan Reports</h1>

      <div className="app-header__user">
        <span className="app-header__name">John Smith</span>
        <span aria-hidden className="app-header__avatar" />
      </div>
    </header>
  );
}
