# TripMate

TripMate is a travel planner built with React, Vite, Express, and SQLite. It stores trips, itineraries, budgets, and packing lists per user.

## Run the app

Requirements: Node.js and npm.

```sh
npm install
npm start
```

Open the Vite URL printed in the terminal (normally [http://localhost:5173](http://localhost:5173)). Vite forwards `/api` requests to the Express API on port 3001. Run `npm run build` to build the frontend.

The SQLite database is created at `server/tripmate.db`. Set `JWT_SECRET` in `.env` to a long, private random value before deployment; `.env` and the database are ignored by Git.

## Authentication and trip data

1. A user registers with a name, email, and password. Emails are stored in lowercase.
2. The API hashes the password with bcryptjs and stores only the hash.
3. After registration or login, the API issues a JWT that expires in seven days.
4. The frontend keeps the token in local storage and sends it as a bearer token. Protected routes and API requests require a valid token.
5. Each trip is saved with its owner's user ID. All trip reads, edits, and deletes filter by that ID. Itinerary, budget, and packing data are saved with the trip details.

On the first login for an account, existing `tripmate-trips` data in local storage is imported into that account's database records.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account and return a JWT |
| POST | `/api/auth/login` | Verify credentials and return a JWT |
| GET | `/api/auth/me` | Return the authenticated user |
| GET | `/api/trips` | List the authenticated user's trips |
| POST | `/api/trips` | Create a trip |
| PUT | `/api/trips/:id` | Update the user's trip |
| DELETE | `/api/trips/:id` | Delete the user's trip |

## Authentication interview questions

1. **Why hash passwords instead of storing them directly?**  
   A one-way hash protects the original password if the database is exposed.
2. **What does bcryptjs do?**  
   It salts and hashes passwords and checks login attempts against the saved hash.
3. **What is a JWT?**  
   A signed token the client sends to prove it has authenticated.
4. **How does the server protect a trip from another user?**  
   It verifies the token and filters each trip query by the authenticated user's ID.
5. **What happens when a JWT expires?**  
   Protected requests return 401, and the user must log in again.

## Group budgets

Each trip stores its total in `trips.total_budget` and its group in `trip_members`. The server converts the rupee total to integer paise, divides by the member count, gives the first members any leftover paise, and stores the resulting shares. For example, ₹1000 split three ways is ₹333.34, ₹333.33, and ₹333.33. These shares are server-calculated; the API ignores browser-supplied share values and replaces members transactionally on updates.

Formula: `base = floor(totalPaise / memberCount)` and `share[i] = (base + (i < totalPaise % memberCount ? 1 : 0)) / 100`.

### Group-budget interview questions

1. **Why calculate shares in paise instead of decimal rupees?** Floating-point rounding can lose exact paise and make totals disagree.
2. **Why distribute leftover paise to the first members?** It is deterministic and ensures the displayed shares sum to the original total.
3. **Why store member shares when the split can be recalculated?** The saved values preserve the exact result at update time and can be displayed consistently.
4. **Why use a transaction for trip and member changes?** It prevents a trip update from succeeding while member replacement fails.
5. **Why return member names and shares with trip GET responses?** The frontend receives a complete trip record without additional API requests.
