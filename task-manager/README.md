# Task Manager

A beginner-friendly full-stack task app. React and Vite provide the interface, an Express API handles requests, and SQLite keeps tasks saved between visits and restarts.

## Run the project

Requirements: Node.js and npm.

1. Open a terminal in the `task-manager` folder.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the frontend and backend together:

   ```sh
   npm start
   ```

4. Open [http://localhost:5173](http://localhost:5173).

Vite serves the frontend on port 5173 and forwards `/api` requests to the Express server on port 3001. Stop both servers with `Ctrl+C`. The SQLite file is created automatically at `server/tasks.db`.

Other useful commands:

```sh
npm run dev      # Start only Vite
npm run server   # Start only the API
npm run build    # Build the frontend for production
```

## Folder structure

```text
task-manager/
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
├── README.md
├── server/
│   ├── db.js
│   └── index.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    ├── hooks/
    │   └── useTasks.js
    └── components/
        ├── TaskForm.jsx
        ├── FilterBar.jsx
        ├── TaskList.jsx
        └── TaskItem.jsx
```

`server/tasks.db` is generated when the API starts and is ignored by Git.

## React concepts and where to find them

| Concept | Where | Example |
|---|---|---|
| Props | `TaskForm.jsx`, `FilterBar.jsx`, `TaskList.jsx`, `TaskItem.jsx` | The parent passes tasks and event handlers into child components. |
| `useState` | `App.jsx`, `TaskForm.jsx`, `useTasks.js` | Stores the selected filter, input text, tasks, and any error. |
| `useEffect` | `useTasks.js` | Loads saved tasks from the API when the app first renders. |
| Custom hook | `useTasks.js` | Groups task data and API actions into reusable React logic. |
| Controlled input | `TaskForm.jsx` | The input's `value` and `onChange` are tied to React state. |
| Lifting state up | `App.jsx` | The app owns the filter and task behavior shared by its children. |
| Keys | `TaskList.jsx` | Each task row uses its stable database ID as its React key. |
| Conditional rendering | `TaskList.jsx`, `App.jsx`, `FilterBar.jsx` | Shows an empty message, an error, or the completed count only when appropriate. |
| Derived state | `App.jsx` | Visible tasks and the remaining count are calculated from the task list, not stored separately. |

## API and SQL

All task text and IDs are passed as bound parameters (`?`) rather than inserted into SQL strings.

| Route | SQL |
|---|---|
| `GET /api/tasks` | `SELECT * FROM tasks ORDER BY created_at DESC, id DESC` |
| `POST /api/tasks` | `INSERT INTO tasks (text) VALUES (?)`, then `SELECT * FROM tasks WHERE id = ?` |
| `PATCH /api/tasks/:id` | `UPDATE tasks SET done = ? WHERE id = ?`, then `SELECT * FROM tasks WHERE id = ?` |
| `DELETE /api/tasks/completed` | `DELETE FROM tasks WHERE done = 1` |
| `DELETE /api/tasks/:id` | `DELETE FROM tasks WHERE id = ?` |

The table is created automatically when the server starts:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

The API converts SQLite's `done` integer to a JSON boolean. An empty task returns HTTP 400; missing tasks return HTTP 404. If the browser cannot reach the API, the app displays an error message.

## 60-second interview pitch

“I built a small full-stack task manager with React, Express, and SQLite. The React app keeps task state in a custom hook, loads the saved list when it first renders, and updates the UI immutably after API actions. The selected filter lives in the parent because several components need to respond to it, while visible tasks and the remaining count are derived instead of duplicated in state. Express exposes a small REST API, and better-sqlite3 stores tasks persistently with parameterized SQL queries. Vite proxies API requests during development, and concurrently starts both services with one command. I also handled empty input, missing tasks, keyboard focus, and server connection errors.”

## 10 likely interview questions

1. **Why use a custom hook?**  
   It keeps task state and API operations together so the UI components stay focused on presentation.
2. **Why is the input controlled?**  
   React owns the input value, which makes validation, trimming, and clearing predictable.
3. **Why use functional state updates?**  
   They calculate the next value from the latest state, which avoids stale-state bugs.
4. **Why not store the filtered tasks separately?**  
   They can be calculated from the tasks and filter, so storing them too could make the values inconsistent.
5. **What does `useEffect` do here?**  
   It starts the initial API request after the component renders.
6. **Why does each task need a key?**  
   A stable key helps React match list items correctly when the list changes.
7. **What is the Vite proxy for?**  
   It forwards `/api` requests to Express in development, so frontend code can use a same-origin URL.
8. **How do tasks survive a restart?**  
   SQLite saves them in the `server/tasks.db` file instead of keeping them only in memory.
9. **How does the app help prevent SQL injection?**  
   It passes user values through prepared statements with `?` placeholders.
10. **How are multiple services started together?**  
    The `start` script uses `concurrently` to launch Vite and Express in one terminal command.
