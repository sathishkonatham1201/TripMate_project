export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li className={`task-item${task.done ? ' is-done' : ''}`}>
      <label className="task-label">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(event) => onToggle(task.id, event.target.checked)}
        />
        <span className="task-text">{task.text}</span>
      </label>
      <button
        className="delete-button"
        type="button"
        aria-label={`Delete ${task.text}`}
        onClick={() => onDelete(task.id)}
      >
        Delete
      </button>
    </li>
  )
}
