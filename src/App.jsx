import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  ArrowDownUp, ArrowLeft, Backpack, CalendarDays, Check, ChevronDown, CircleDollarSign,
  Compass, MapPin, Menu, Plus, Search, Sparkles, Trash2, X,
} from 'lucide-react'
import TripCard from './components/TripCard.jsx'
import TripForm from './components/TripForm.jsx'
import ActivityForm from './components/ActivityForm.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { daysBetween, formatDate, tripDuration } from './utils/dateUtils.js'
import { formatINR, numberFromInput } from './utils/currencyUtils.js'
import tripImage from './utils/tripImage.js'
import './App.css'

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: Compass },
  { id: 'trips', label: 'My trips', icon: MapPin },
  { id: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { id: 'budget', label: 'Budget planner', icon: CircleDollarSign },
  { id: 'packing', label: 'Packing list', icon: Backpack },
]

const expenseTypes = [
  { key: 'travel', label: 'Travel', icon: '✈️', color: 'blue' },
  { key: 'accommodation', label: 'Accommodation', icon: '🛏️', color: 'purple' },
  { key: 'food', label: 'Food & dining', icon: '🍜', color: 'orange' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: 'pink' },
  { key: 'activities', label: 'Activities', icon: '🎟️', color: 'green' },
]

function createSampleTrips() {
  const today = new Date()
  const dateIn = (offset) => {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    return date.toISOString().slice(0, 10)
  }
  return [
    {
      id: 'sample-kyoto',
      name: 'A week in Kyoto',
      destination: 'Kyoto, Japan',
      startDate: dateIn(18),
      endDate: dateIn(24),
      budget: 125000,
      description: 'Quiet temples, tiny tea houses, and a little wandering.',
      status: 'Planned',
      expenses: { travel: 32000, accommodation: 28500, food: 12000, shopping: 6000, activities: 8500 },
      activities: [
        { id: 'kyoto-1', day: 1, name: 'Walk through Fushimi Inari', location: 'Fushimi Inari Taisha', time: '08:30', category: 'Sightseeing', description: 'Go early to enjoy the torii gates before the crowds.' },
        { id: 'kyoto-2', day: 1, name: 'Lunch at Nishiki Market', location: 'Nishiki Market', time: '12:30', category: 'Food', description: 'Sample local bites along the market.' },
      ],
      packing: makeDefaultPacking(),
    },
    {
      id: 'sample-udaipur',
      name: 'Palaces & lakes',
      destination: 'Udaipur, India',
      startDate: dateIn(-16),
      endDate: dateIn(-12),
      budget: 42000,
      description: 'A slow few days by the lake with plenty of local food.',
      status: 'Completed',
      expenses: { travel: 9500, accommodation: 11000, food: 7200, shopping: 2800, activities: 4500 },
      activities: [],
      packing: makeDefaultPacking(),
    },
    {
      id: 'sample-goa',
      name: 'Coastal reset',
      destination: 'South Goa, India',
      startDate: dateIn(42),
      endDate: dateIn(46),
      budget: 36000,
      description: 'Beach mornings, sunset walks, and no rush.',
      status: 'Planned',
      expenses: { travel: 8000, accommodation: 10000, food: 6000, shopping: 2500, activities: 4000 },
      activities: [],
      packing: makeDefaultPacking(),
    },
  ]
}

function makeDefaultPacking() {
  return ['Clothes', 'Toiletries', 'Phone charger', 'Travel documents', 'Medicines', 'Travel tickets']
    .map((name, index) => ({ id: `pack-${index}-${Math.random().toString(36).slice(2, 7)}`, name, packed: false }))
}

function totalExpenses(trip) {
  return Object.values(trip.expenses || {}).reduce((sum, amount) => sum + (Number(amount) || 0), 0)
}

function tripPayload(trip, ownerName) {
  const totalBudget = Number(trip.total_budget ?? trip.budget ?? 0)
  const names = trip.members?.map((member) => member.name).filter(Boolean)
  return {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    total_budget: totalBudget,
    members: names?.length ? names : [ownerName || 'Traveller'],
    details: {
      budget: totalBudget,
      description: trip.description,
      status: trip.status,
      expenses: trip.expenses,
      activities: trip.activities,
      packing: trip.packing,
    },
  }
}

async function readApiResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.')
  return body
}

const tripLoadRequests = new Map()

function loadUserTrips(userId, authFetch, ownerName) {
  if (tripLoadRequests.has(userId)) return tripLoadRequests.get(userId)

  const request = (async () => {
    const saved = await readApiResponse(await authFetch('/api/trips'))
    if (saved.length) {
      localStorage.setItem(`tripmate-migrated-${userId}`, 'true')
      localStorage.removeItem('tripmate-trips')
      return saved
    }

    const migrationKey = `tripmate-migrated-${userId}`
    if (localStorage.getItem(migrationKey)) return saved
    localStorage.setItem(migrationKey, 'true')

    try {
      let legacyTrips
      const stored = localStorage.getItem('tripmate-trips')
      try {
        legacyTrips = stored ? JSON.parse(stored) : createSampleTrips()
      } catch (error) {
        console.error('Could not read saved trips for migration.', error)
        legacyTrips = createSampleTrips()
      }
      if (!Array.isArray(legacyTrips)) legacyTrips = createSampleTrips()

      const imported = []
      for (const trip of legacyTrips) {
        imported.push(await readApiResponse(await authFetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tripPayload(trip, ownerName)),
        })))
      }
      localStorage.removeItem('tripmate-trips')
      return imported
    } catch (error) {
      localStorage.removeItem(migrationKey)
      throw error
    }
  })()

  tripLoadRequests.set(userId, request)
  request.then(
    () => { if (tripLoadRequests.get(userId) === request) tripLoadRequests.delete(userId) },
    () => { if (tripLoadRequests.get(userId) === request) tripLoadRequests.delete(userId) },
  )
  return request
}

function statusForTrip(trip) {
  if (trip.status === 'Completed') return 'Completed'
  if (trip.status === 'Ongoing') return 'Ongoing'
  const today = new Date().toISOString().slice(0, 10)
  if (trip.startDate <= today && trip.endDate >= today) return 'Ongoing'
  if (trip.endDate < today) return 'Completed'
  return 'Planned'
}

function TripMateApp() {
  const { user, logout, authFetch } = useAuth()
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripError, setTripError] = useState('')
  const [activePage, setActivePage] = useState('dashboard')
  const [selectedTripId, setSelectedTripId] = useState('')
  const [dialog, setDialog] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All trips')
  const [sortOrder, setSortOrder] = useState('soonest')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const tripsRef = useRef([])
  const savedTripsRef = useRef(new Map())
  const writeQueues = useRef(new Map())
  const writeVersions = useRef(new Map())

  function replaceTrips(updater) {
    const nextTrips = typeof updater === 'function' ? updater(tripsRef.current) : updater
    tripsRef.current = nextTrips
    setTrips(nextTrips)
    return nextTrips
  }

  useEffect(() => {
    let active = true
    loadUserTrips(user.id, authFetch, user.name)
      .then((savedTrips) => {
        if (!active) return
        tripsRef.current = savedTrips
        savedTripsRef.current = new Map(savedTrips.map((trip) => [trip.id, trip]))
        setTrips(savedTrips)
      })
      .catch((error) => {
        if (active) setTripError(error.message)
      })
      .finally(() => {
        if (active) setTripsLoading(false)
      })
    return () => { active = false }
  }, [authFetch, user.id])

  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) || trips[0]
  const upcomingTrips = useMemo(
    () => [...trips].filter((trip) => statusForTrip(trip) !== 'Completed').sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [trips],
  )
  const totalBudget = trips.reduce((sum, trip) => sum + Number(trip.total_budget ?? trip.budget ?? 0), 0)
  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return trips
      .filter((trip) => `${trip.name} ${trip.destination}`.toLowerCase().includes(query))
      .filter((trip) => filter === 'All trips' || statusForTrip(trip) === filter)
      .sort((a, b) => sortOrder === 'soonest' ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate))
  }, [trips, search, filter, sortOrder])

  function notify(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }

  function openPage(page) {
    setActivePage(page)
    setMobileMenuOpen(false)
  }

  function saveUpdatedTrip(updatedTrip, message) {
    const version = (writeVersions.current.get(updatedTrip.id) || 0) + 1
    writeVersions.current.set(updatedTrip.id, version)
    replaceTrips((current) => current.map((trip) => trip.id === updatedTrip.id ? updatedTrip : trip))

    const previous = writeQueues.current.get(updatedTrip.id) || Promise.resolve()
    const request = previous.catch(() => {}).then(async () => {
      const saved = await readApiResponse(await authFetch(`/api/trips/${updatedTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripPayload(updatedTrip, user.name)),
      }))
      savedTripsRef.current.set(saved.id, saved)
      if (writeVersions.current.get(saved.id) === version) {
        replaceTrips((current) => current.map((trip) => trip.id === saved.id ? saved : trip))
        if (message) notify(message)
      }
    }).catch((error) => {
      if (writeVersions.current.get(updatedTrip.id) === version) {
        const saved = savedTripsRef.current.get(updatedTrip.id)
        if (saved) replaceTrips((current) => current.map((trip) => trip.id === saved.id ? saved : trip))
        notify(`Could not save your trip: ${error.message}`)
      }
    })
    writeQueues.current.set(updatedTrip.id, request)
    return request
  }

  async function saveTrip(values) {
    if (dialog?.trip) {
      const current = tripsRef.current.find((trip) => trip.id === dialog.trip.id)
      if (current) await saveUpdatedTrip({ ...current, ...values }, 'Your trip has been updated.')
    } else {
      const trip = {
        ...values,
        expenses: { travel: 0, accommodation: 0, food: 0, shopping: 0, activities: 0 },
        activities: [],
        packing: makeDefaultPacking(),
      }
      try {
        const saved = await readApiResponse(await authFetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tripPayload(trip, user.name)),
        }))
        savedTripsRef.current.set(saved.id, saved)
        replaceTrips((current) => [saved, ...current])
        setSelectedTripId(saved.id)
        notify('Your new trip is ready to plan.')
      } catch (error) {
        notify(`Could not create your trip: ${error.message}`)
        return
      }
    }
    setDialog(null)
  }

  async function deleteTrip(trip) {
    if (!window.confirm(`Delete "${trip.name}" and all its itinerary, budget, and packing data?`)) return
    try {
      await readApiResponse(await authFetch(`/api/trips/${trip.id}`, { method: 'DELETE' }))
      savedTripsRef.current.delete(trip.id)
      replaceTrips((current) => current.filter((item) => item.id !== trip.id))
      if (selectedTripId === trip.id) setSelectedTripId('')
      notify('Trip deleted.')
    } catch (error) {
      notify(`Could not delete the trip: ${error.message}`)
    }
  }

  async function saveActivity(values) {
    if (!selectedTrip) return
    const activity = { ...values, id: dialog?.activity?.id || crypto.randomUUID() }
    const activities = dialog?.activity
      ? selectedTrip.activities.map((item) => item.id === activity.id ? activity : item)
      : [...selectedTrip.activities, activity]
    await saveUpdatedTrip(
      { ...selectedTrip, activities },
      dialog?.activity ? 'Activity updated.' : 'Activity added to your itinerary.',
    )
    setDialog(null)
  }

  function updateTrip(updater) {
    if (!selectedTrip) return
    const current = tripsRef.current.find((trip) => trip.id === selectedTrip.id)
    if (current) saveUpdatedTrip(updater(current))
  }

  async function restoreExamples() {
    if (!window.confirm('Replace your current trips with the original example trips?')) return
    try {
      await Promise.all(tripsRef.current.map((trip) =>
        readApiResponse(authFetch(`/api/trips/${trip.id}`, { method: 'DELETE' })),
      ))
      const examples = []
      for (const trip of createSampleTrips()) {
        examples.push(await readApiResponse(await authFetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tripPayload(trip, user.name)),
        })))
      }
      savedTripsRef.current = new Map(examples.map((trip) => [trip.id, trip]))
      replaceTrips(examples)
      setSelectedTripId('')
      notify('Example trips restored.')
    } catch (error) {
      notify(`Could not restore example trips: ${error.message}`)
    }
  }

  const pageTitle = navigation.find((item) => item.id === activePage)?.label || 'Trip details'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); openPage('dashboard') }}>
          <span className="brand-mark"><Compass size={21} /></span>
          <span>tripmate<span className="brand-dot">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button className={`nav-link ${activePage === id ? 'active' : ''}`} key={id} onClick={() => openPage(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'trips' && <span className="nav-count">{trips.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={17} /></div>
            <strong>Good trips start here</strong>
            <p>Keep every detail of your next adventure in one place.</p>
            <button onClick={() => setDialog({ type: 'trip' })}>Plan a trip <span>→</span></button>
          </div>
          <div className="profile">
            <div className="avatar">{user.name.trim().charAt(0).toUpperCase()}</div>
            <div><strong>Hi, {user.name}</strong><span>Your personal space</span></div>
            <button className="profile-logout" onClick={logout}>Logout</button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
          <button className="button button-primary top-plan" onClick={() => setDialog({ type: 'trip' })}><Plus size={17} /> Plan a new trip</button>
        </header>

        <div className="page-content">
          {tripsLoading && <p className="trip-load-message">Loading your trips...</p>}
          {!tripsLoading && tripError && (
            <p className="trip-load-error" role="alert">
              Could not load your trips: {tripError}
              <button onClick={() => window.location.reload()}>Reload</button>
            </p>
          )}
          {!tripsLoading && !tripError && <>
          {activePage === 'dashboard' && (
            <Dashboard trips={trips} upcomingTrips={upcomingTrips} totalBudget={totalBudget}
              onCreate={() => setDialog({ type: 'trip' })}
              onOpen={(trip) => { setSelectedTripId(trip.id); setActivePage('details') }}
              onEdit={(trip) => setDialog({ type: 'trip', trip })}
              onDelete={deleteTrip}
              onBrowse={() => setActivePage('trips')} />
          )}
          {activePage === 'trips' && (
            <section>
              <PageHeading eyebrow="YOUR ADVENTURES" title="My trips" subtitle="Every journey, thoughtfully planned."
                action={<button className="button button-primary" onClick={() => setDialog({ type: 'trip' })}><Plus size={17} /> Create a trip</button>} />
              <div className="filter-bar">
                <label className="search-box"><Search size={17} /><input aria-label="Search trips" placeholder="Search trips or destinations..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <select aria-label="Filter trips by status" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  {['All trips', 'Planned', 'Ongoing', 'Completed'].map((option) => <option key={option}>{option}</option>)}
                </select>
                <button className="button button-light sort-button" onClick={() => setSortOrder((value) => value === 'soonest' ? 'latest' : 'soonest')}><ArrowDownUp size={15} /> {sortOrder === 'soonest' ? 'Soonest first' : 'Latest first'}</button>
              </div>
              {filteredTrips.length ? <div className="trip-grid">{filteredTrips.map((trip) => <TripCard key={trip.id} trip={trip} onView={() => { setSelectedTripId(trip.id); setActivePage('details') }} onEdit={() => setDialog({ type: 'trip', trip })} onDelete={() => deleteTrip(trip)} />)}</div>
                : <EmptyState icon={<MapPin size={24} />} title="No trips found" text={search || filter !== 'All trips' ? 'Try a different search or filter.' : 'Create your first trip and start planning.'} action={<button className="button button-primary" onClick={() => setDialog({ type: 'trip' })}><Plus size={16} /> Create a trip</button>} />}
            </section>
          )}
          {activePage === 'details' && selectedTrip && <TripDetails trip={selectedTrip} onBack={() => openPage('trips')} onEdit={() => setDialog({ type: 'trip', trip: selectedTrip })} onDelete={() => deleteTrip(selectedTrip)} onOpenPage={openPage} />}
          {activePage === 'details' && !selectedTrip && <EmptyState title="No trips yet" text="Create a trip to see its details here." action={<button className="button button-primary" onClick={() => setDialog({ type: 'trip' })}>Plan a trip</button>} />}
          {activePage === 'itinerary' && <ItineraryPage trips={trips} trip={selectedTrip} onSelect={setSelectedTripId} onAdd={() => setDialog({ type: 'activity' })} onEdit={(activity) => setDialog({ type: 'activity', activity })} onDelete={(activity) => { updateTrip((trip) => ({ ...trip, activities: trip.activities.filter((item) => item.id !== activity.id) })); notify('Activity removed.') }} />}
          {activePage === 'budget' && <BudgetPage trips={trips} trip={selectedTrip} onSelect={setSelectedTripId} onUpdate={(key, value) => updateTrip((item) => ({ ...item, expenses: { ...item.expenses, [key]: numberFromInput(value) } }))} />}
          {activePage === 'packing' && <PackingPage trips={trips} trip={selectedTrip} onSelect={setSelectedTripId} onUpdate={(packing) => updateTrip((item) => ({ ...item, packing }))} notify={notify} />}
          </>}
        </div>
      </main>

      {dialog?.type === 'trip' && <TripForm trip={dialog.trip} user={user} onClose={() => setDialog(null)} onSave={saveTrip} />}
      {dialog?.type === 'activity' && selectedTrip && <ActivityForm trip={selectedTrip} activity={dialog.activity} onClose={() => setDialog(null)} onSave={saveActivity} />}
      {notice && <div role="status" className="toast"><span className="toast-check"><Check size={15} /></span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
      <button className="restore-button" onClick={restoreExamples} title="Restore example trips">Restore examples</button>
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Dashboard({ trips, upcomingTrips, totalBudget, onCreate, onOpen, onEdit, onDelete, onBrowse }) {
  const completed = trips.filter((trip) => statusForTrip(trip) === 'Completed').length
  return (
    <section>
      <div className="welcome-banner">
        <div className="welcome-copy"><div className="eyebrow light-eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>Make room for<br />a little <em>wonder.</em></h1><p>All your travel plans, in one happy place.</p><button className="button button-white" onClick={onCreate}><Plus size={17} /> Plan a new trip</button></div>
        <div className="banner-decoration"><span className="banner-sun" /><span className="banner-cloud cloud-one" /><span className="banner-cloud cloud-two" /><span className="banner-mountain mountain-back" /><span className="banner-mountain mountain-front" /><span className="banner-water" /><div className="banner-location"><MapPin size={14} fill="currentColor" /> Somewhere beautiful</div></div>
        <div className="banner-flower">✳</div>
      </div>
      <div className="stats-grid">
        <StatCard label="Total trips" value={trips.length} note="Your journeys planned" icon={<MapPin size={19} />} tone="blue" />
        <StatCard label="Upcoming trips" value={upcomingTrips.length} note="Adventures on the way" icon={<CalendarDays size={19} />} tone="teal" />
        <StatCard label="Total planned budget" value={formatINR(totalBudget)} note="Across all your trips" icon={<CircleDollarSign size={19} />} tone="gold" />
        <StatCard label="Places explored" value={completed} note="Memories made and kept" icon={<Sparkles size={19} />} tone="coral" />
      </div>
      <div className="section-heading"><div><div className="eyebrow">MADE FOR THE MOMENTS</div><h2>Up next <span className="heading-sparkle">✦</span></h2><p>Your next adventures are right around the corner.</p></div><button className="text-button" onClick={onBrowse}>See all trips <span>→</span></button></div>
      {upcomingTrips.length ? <div className="trip-grid dashboard-trips">{upcomingTrips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} onView={() => onOpen(trip)} onEdit={() => onEdit(trip)} onDelete={() => onDelete(trip)} />)}</div>
        : <EmptyState title="Your next adventure is waiting" text="Add a trip and start collecting the little details." action={<button className="button button-primary" onClick={onCreate}><Plus size={16} /> Plan a new trip</button>} />}
    </section>
  )
}

function StatCard({ label, value, note, icon, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function TripDetails({ trip, onBack, onEdit, onDelete, onOpenPage }) {
  const spent = totalExpenses(trip)
  return (
    <section>
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> All trips</button>
      <div className="detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(15,37,49,.72), rgba(15,37,49,.08)), url(${tripImage(trip.destination)})` }}>
        <div><span className={`status-pill ${statusForTrip(trip).toLowerCase()}`}>{statusForTrip(trip)}</span><h1>{trip.name}</h1><p><MapPin size={16} />{trip.destination}</p></div>
        <div className="detail-actions"><button className="button button-white" onClick={onEdit}>Edit trip</button><button className="icon-button danger-icon" aria-label="Delete trip" onClick={onDelete}><Trash2 size={17} /></button></div>
      </div>
      <div className="detail-stats"><div><span>DATES</span><strong>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</strong></div><div><span>DURATION</span><strong>{tripDuration(trip)} days</strong></div><div><span>TOTAL MEMBERS</span><strong>{trip.members?.length || 0}</strong></div><div><span>TOTAL BUDGET</span><strong>{formatINR(trip.total_budget ?? trip.budget)}</strong></div></div>
      <div className="member-summary"><div><div className="eyebrow">GROUP SPLIT</div><h2>Member shares</h2><strong>Each person pays: ₹{(trip.members?.[0]?.share ?? 0).toFixed(2)}</strong></div><table><thead><tr><th>Name</th><th>Share</th></tr></thead><tbody>{(trip.members || []).map((member, index) => <tr key={`${member.name}-${index}`}><td>{member.name}</td><td>₹{Number(member.share || 0).toFixed(2)}</td></tr>)}</tbody></table></div>
      <div className="details-content"><div className="details-about"><div className="eyebrow">THE PLAN</div><h2>A little about this trip</h2><p>{trip.description || 'No description added yet. Edit your trip to add a few notes.'}</p></div><div className="quick-tools"><div className="eyebrow">YOUR TRIP TOOLKIT</div><h2>Keep planning</h2><div className="tool-links"><button onClick={() => onOpenPage('itinerary')}><CalendarDays size={19} /><span><strong>Itinerary</strong><small>{trip.activities.length} activities planned</small></span><span>→</span></button><button onClick={() => onOpenPage('budget')}><CircleDollarSign size={19} /><span><strong>Budget planner</strong><small>{formatINR(Math.max(0, Number(trip.budget) - spent))} remaining</small></span><span>→</span></button><button onClick={() => onOpenPage('packing')}><Backpack size={19} /><span><strong>Packing list</strong><small>{trip.packing.filter((item) => item.packed).length} of {trip.packing.length} packed</small></span><span>→</span></button></div></div></div>
    </section>
  )
}

function TripPicker({ trips, trip, onSelect }) {
  if (!trips.length) return <EmptyState title="Plan a trip to get started" text="Your itinerary, budget, and packing lists will live here." />
  return <label className="trip-picker"><span>PLANNING FOR</span><select aria-label="Choose a trip" value={trip?.id || ''} onChange={(event) => onSelect(event.target.value)}>{trips.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.destination}</option>)}</select><ChevronDown size={15} /></label>
}

function ItineraryPage({ trips, trip, onSelect, onAdd, onEdit, onDelete }) {
  const [day, setDay] = useState(1)
  if (!trip) return <><PageHeading eyebrow="THE DAY-BY-DAY" title="Your itinerary" subtitle="Make every day of the journey yours." /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /></>
  const days = Math.max(1, tripDuration(trip))
  const currentDay = Math.min(day, days)
  const activities = trip.activities.filter((activity) => Number(activity.day) === currentDay).sort((a, b) => a.time.localeCompare(b.time))
  return <section><PageHeading eyebrow="THE DAY-BY-DAY" title="Your itinerary" subtitle="Make every day of the journey yours." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add activity</button>} /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /><div className="planner-card"><div className="planner-trip-summary"><div className="trip-mini-icon"><CalendarDays size={19} /></div><div><strong>{trip.name}</strong><span>{trip.destination} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span></div><span className="activity-count">{trip.activities.length} activities</span></div><div className="day-tabs" role="tablist" aria-label="Trip days">{Array.from({ length: days }, (_, index) => index + 1).map((number) => <button role="tab" aria-selected={currentDay === number} className={currentDay === number ? 'selected' : ''} onClick={() => setDay(number)} key={number}><span>DAY {String(number).padStart(2, '0')}</span><strong>{formatDate(daysBetween(trip.startDate, number - 1))}</strong></button>)}</div><div className="itinerary-day-heading"><div><div className="eyebrow">DAY {String(currentDay).padStart(2, '0')}</div><h2>{daysBetween(trip.startDate, currentDay - 1).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div><button className="button button-light small-button" onClick={onAdd}><Plus size={15} /> Add</button></div>{activities.length ? <div className="timeline">{activities.map((activity) => <div className="timeline-item" key={activity.id}><div className="timeline-time">{activity.time}</div><div className="timeline-rail"><span /></div><div className="activity-card"><div className="activity-top"><span className={`category-tag category-${activity.category.toLowerCase()}`}>{activity.category}</span><div className="activity-actions"><button aria-label={`Edit ${activity.name}`} onClick={() => onEdit(activity)}>Edit</button><button aria-label={`Delete ${activity.name}`} onClick={() => onDelete(activity)}><Trash2 size={15} /></button></div></div><h3>{activity.name}</h3><div className="activity-location"><MapPin size={14} />{activity.location}</div>{activity.description && <p>{activity.description}</p>}</div></div>)}</div> : <EmptyState icon={<CalendarDays size={24} />} title="A day full of possibility" text="Add your first activity to start shaping this day." action={<button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add an activity</button>} />}</div></section>
}

function BudgetPage({ trips, trip, onSelect, onUpdate }) {
  if (!trip) return <><PageHeading eyebrow="MONEY, MINDFULLY" title="Budget planner" subtitle="Keep your spending on track, without the guesswork." /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /></>
  const planned = Number(trip.budget) || 0
  const spent = totalExpenses(trip)
  const remaining = planned - spent
  const progress = planned > 0 ? Math.min((spent / planned) * 100, 100) : spent > 0 ? 100 : 0
  return <section><PageHeading eyebrow="MONEY, MINDFULLY" title="Budget planner" subtitle="Keep your spending on track, without the guesswork." /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /><div className="budget-layout"><div className="budget-main"><div className="budget-total-card"><div><div className="eyebrow light-eyebrow">YOUR TRIP BUDGET</div><div className="budget-total">{formatINR(planned)}</div><span>for {trip.name}</span></div><div className="budget-total-icon"><CircleDollarSign size={31} /></div><div className="budget-progress"><div><span>Estimated spend</span><strong>{formatINR(spent)}</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-labels"><span>{Math.round(progress)}% used</span><span>{remaining >= 0 ? `${formatINR(remaining)} left` : `${formatINR(Math.abs(remaining))} over budget`}</span></div></div></div><div className="expense-card"><div className="expense-heading"><div><h2>Estimated expenses</h2><p>Update as you plan; totals calculate automatically.</p></div><span className="currency-chip">INR ₹</span></div>{expenseTypes.map((expense) => <label className="expense-row" key={expense.key}><span className={`expense-symbol ${expense.color}`}>{expense.icon}</span><span className="expense-name">{expense.label}</span><span className="expense-input-wrap"><span>₹</span><input type="number" min="0" step="100" inputMode="numeric" aria-label={`${expense.label} expenses`} value={trip.expenses?.[expense.key] ?? 0} onChange={(event) => onUpdate(expense.key, event.target.value)} /></span></label>)}<div className="expense-grand-total"><span>Total estimated expenses</span><strong>{formatINR(spent)}</strong></div></div></div><aside className="budget-aside"><div className={`remaining-card ${remaining < 0 ? 'over-budget' : ''}`}><div className="remaining-icon"><CircleDollarSign size={19} /></div><span>{remaining < 0 ? 'OVER BUDGET' : 'REMAINING'}</span><strong>{formatINR(Math.abs(remaining))}</strong><p>{remaining < 0 ? 'A little adjustment can bring your plan back on track.' : 'A little extra room for something wonderful.'}</p></div><div className="budget-note"><span>✦</span><strong>A thoughtful tip</strong><p>Set aside a small buffer for unexpected moments. The best memories sometimes aren't on the itinerary.</p></div></aside></div></section>
}

function PackingPage({ trips, trip, onSelect, onUpdate, notify }) {
  const [newItem, setNewItem] = useState('')
  if (!trip) return <><PageHeading eyebrow="DON'T FORGET THE LITTLE THINGS" title="Packing list" subtitle="A calmer departure starts with a little preparation." /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /></>
  const packedCount = trip.packing.filter((item) => item.packed).length
  const progress = trip.packing.length ? Math.round((packedCount / trip.packing.length) * 100) : 0
  function addItem(event) {
    event.preventDefault()
    const name = newItem.trim()
    if (!name) return
    onUpdate([...trip.packing, { id: crypto.randomUUID(), name, packed: false }])
    setNewItem('')
    notify('Packing item added.')
  }
  function resetList() {
    if (!window.confirm('Uncheck every item on this packing list?')) return
    onUpdate(trip.packing.map((item) => ({ ...item, packed: false })))
    notify('Packing checklist reset.')
  }
  return <section><PageHeading eyebrow="DON'T FORGET THE LITTLE THINGS" title="Packing list" subtitle="A calmer departure starts with a little preparation." action={<button className="button button-light" onClick={resetList}><ArrowDownUp size={15} /> Reset checklist</button>} /><TripPicker trips={trips} trip={trip} onSelect={onSelect} /><div className="packing-layout"><div className="packing-main"><div className="packing-card"><div className="packing-card-heading"><div><h2>Getting ready for {trip.destination}</h2><p>Your personal list for {trip.name}</p></div><div className="packing-progress-circle" style={{ '--progress': `${progress}%` }}><span>{progress}%</span></div></div><div className="packing-progress-line"><span style={{ width: `${progress}%` }} /></div><div className="packing-count">{packedCount} of {trip.packing.length} items packed</div><form className="add-packing-form" onSubmit={addItem}><label htmlFor="packing-item">Add something to your list</label><div><input id="packing-item" placeholder="e.g. Sunglasses" value={newItem} onChange={(event) => setNewItem(event.target.value)} /><button className="button button-primary" type="submit"><Plus size={16} /> Add item</button></div></form><div className="packing-list">{trip.packing.map((item) => <div className={`packing-item ${item.packed ? 'packed' : ''}`} key={item.id}><label><input type="checkbox" checked={item.packed} onChange={() => onUpdate(trip.packing.map((current) => current.id === item.id ? { ...current, packed: !current.packed } : current))} /><span className="custom-checkbox"><Check size={13} /></span><span>{item.name}</span></label><button aria-label={`Remove ${item.name}`} onClick={() => onUpdate(trip.packing.filter((current) => current.id !== item.id))}><Trash2 size={16} /></button></div>)}{!trip.packing.length && <div className="packing-empty">Your list is clear. Add whatever you need for this trip.</div>}</div></div></div><aside className="packing-aside"><div className="packing-illustration"><span>✈</span><i>☁</i><b>☁</b><div>Ready when<br />you are.</div></div><div className="packing-aside-tip"><span className="tip-check"><Check size={15} /></span><div><strong>Essentials are covered</strong><p>We added a few helpful basics to get your list started. Add or remove anything to make it yours.</p></div></div></aside></div></section>
}

function EmptyState({ icon, title, text, action }) {
  return <div className="empty-state"><div className="empty-icon">{icon || <Sparkles size={24} />}</div><h3>{title}</h3><p>{text}</p>{action}</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/*" element={<ProtectedRoute><TripMateApp /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
