/**
 * A strip of tabs: under a modal's header, or under a card's. Kept in one
 * place so the view, the edit form and the cleaning page all present their
 * pages the same way.
 */
export default function TabStrip({ tabs, active, onChange, label }) {
  // Left and Right move between tabs, Home and End jump to the ends - the
  // keyboard pattern people expect of tabs. Only the chosen tab is a Tab stop.
  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = tabs[(moves[event.key] + tabs.length) % tabs.length];
    onChange(next.id);
    event.currentTarget.querySelector(`#tab-${next.id}`)?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`tab${selected ? ' tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
