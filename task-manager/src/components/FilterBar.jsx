export default function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
  onClearDone,
  completedCount,
}) {
  return (
    <div className="filter-bar" aria-label="Task filters">
      <div className="filter-buttons">
        {filters.map((filter) => (
          <button
            className={`filter-button${activeFilter === filter ? ' is-active' : ''}`}
            type="button"
            key={filter}
            aria-pressed={activeFilter === filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <button
        className="clear-button"
        type="button"
        onClick={onClearDone}
        disabled={completedCount === 0}
      >
        Clear completed
      </button>
    </div>
  )
}
