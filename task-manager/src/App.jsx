import { useState } from 'react'
import TaskForm from './components/TaskForm.jsx'
import FilterBar from './components/FilterBar.jsx'
import TaskList from './components/TaskList.jsx'
import useTasks from './hooks/useTasks.js'

const filters = ['All', 'Active', 'Done']

export default function App() {
  const { tasks, error, addTask, toggleTask, deleteTask, clearDone } = useTasks()
  const [filter, setFilter] = useState('All')

  // Keep the displayed list and count derived from the source task state.
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'Active') return !task.done
    if (filter === 'Done') return task.done
    return true
  })
  const remainingCount = tasks.filter((task) => !task.done).length
  const completedCount = tasks.length - remainingCount

  return (
    <main className="page">
      <section className="task-card" aria-labelledby="page-title">
        <header className="page-header">
          <p className="eyebrow">A little more focus</p>
          <h1 id="page-title">Task Manager</h1>
          <p className="subtitle">Keep track of what matters today.</p>
        </header>

        {error && <p className="error-message" role="alert">{error}</p>}

        <TaskForm onAdd={addTask} />
        <FilterBar
          filters={filters}
          activeFilter={filter}
          onFilterChange={setFilter}
          onClearDone={clearDone}
          completedCount={completedCount}
        />
        <TaskList
          tasks={visibleTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />

        <footer className="task-footer" aria-live="polite">
          <span>{remainingCount} {remainingCount === 1 ? 'task' : 'tasks'} left</span>
          {tasks.length > 0 && <span>{tasks.length} total</span>}
        </footer>
      </section>
    </main>
  )
}
