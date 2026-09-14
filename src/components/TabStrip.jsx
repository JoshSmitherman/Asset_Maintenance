/**
 * A strip of tabs: under a modal's header, or under a card's. Kept in one
 * place so the view, the edit form and the cleaning page all present their
 * pages the same way.
 */
export default function TabStrip({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
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
