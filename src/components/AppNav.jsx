const PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'assets', label: 'Assets' },
  { key: 'cleaning', label: 'Cleaning' }
];

export default function AppNav({ page, onChange, counts = {} }) {
  return (
    <nav className="app-nav" aria-label="Sections">
      <div className="app-nav__inner">
        {PAGES.map((item) => {
          const isActive = page === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              className={`app-nav__tab${isActive ? ' app-nav__tab--active' : ''}`}
              onClick={() => onChange(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
              {count ? <span className="app-nav__count">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
