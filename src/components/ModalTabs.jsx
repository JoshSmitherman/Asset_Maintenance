/**
 * The strip of tabs under a modal's header. Kept separate so the view and the
 * edit form present the same two pages in the same order.
 */
export default function ModalTabs({ tabs, active, onChange }) {
  return (
    <div className="modal__tabs" role="tablist">
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
            className={`modal__tab${selected ? ' modal__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
