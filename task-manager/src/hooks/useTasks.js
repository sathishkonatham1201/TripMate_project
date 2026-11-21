import { useCallback, useEffect, useState } from 'react'

async function request(path, options) {
  let response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'The request could not be completed.')
  }

  if (response.status === 204) return null
  return response.json()
}

export default function useTasks() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    try {
      const savedTasks = await request('/api/tasks')
      setTasks(savedTasks)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function addTask(text) {
    try {
      const task = await request('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      setTasks((currentTasks) => [task, ...currentTasks])
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function toggleTask(id, done) {
    try {
      const updatedTask = await request(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      })
      setTasks((currentTasks) =>
        currentTasks.map((task) => task.id === id ? updatedTask : task),
      )
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteTask(id) {
    try {
      await request(`/api/tasks/${id}`, { method: 'DELETE' })
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function clearDone() {
    try {
      await request('/api/tasks/completed', { method: 'DELETE' })
      setTasks((currentTasks) => currentTasks.filter((task) => !task.done))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return { tasks, error, addTask, toggleTask, deleteTask, clearDone }
}
