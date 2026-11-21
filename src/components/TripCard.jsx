import { CalendarDays, Ellipsis, MapPin, Pencil, Trash2 } from 'lucide-react'
import { formatDate, tripDuration } from '../utils/dateUtils.js'
import { formatINR } from '../utils/currencyUtils.js'
import tripImage from '../utils/tripImage.js'

function getStatus(trip) {
  if (trip.status === 'Ongoing') return 'Ongoing'
  if (trip.status === 'Completed') return 'Completed'
  const today = new Date().toISOString().slice(0, 10)
  if (trip.startDate <= today && trip.endDate >= today) return 'Ongoing'
  if (trip.endDate < today) return 'Completed'
  return 'Planned'
}

export default function TripCard({ trip, onView, onEdit, onDelete }) {
  return (
    <article className="trip-card">
      <button className="trip-image-button" onClick={onView} aria-label={`View ${trip.name}`}>
        <img src={tripImage(trip.destination)} alt={`${trip.destination} travel destination`} loading="lazy" />
        <span className={`status-pill ${getStatus(trip).toLowerCase()}`}>{getStatus(trip)}</span>
      </button>
      <div className="trip-card-body">
        <div className="trip-card-title-row"><div><h3>{trip.name}</h3><div className="trip-destination"><MapPin size={14} />{trip.destination}</div></div><div className="card-menu-wrap"><button className="card-menu icon-button" aria-label={`Trip actions for ${trip.name}`} onClick={(event) => { const menu = event.currentTarget.nextElementSibling; menu.hidden = !menu.hidden }}><Ellipsis size={19} /></button><div className="card-menu-popover" hidden><button onClick={onEdit}><Pencil size={14} /> Edit trip</button><button className="delete-action" onClick={onDelete}><Trash2 size={14} /> Delete trip</button></div></div></div>
        <div className="trip-card-meta"><span><CalendarDays size={14} />{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span><span>{tripDuration(trip)} days</span></div>
        <div className="trip-card-footer"><span className="budget-caption">TOTAL BUDGET</span><strong>{formatINR(trip.total_budget ?? trip.budget)}</strong><button onClick={onView}>View trip <span>→</span></button></div>
        <div className="trip-members"><span>{trip.members?.length || 0} members: {(trip.members || []).map((member) => member.name).join(', ')}</span><strong>Each person pays: ₹{(trip.members?.[0]?.share ?? 0).toFixed(2)}</strong><table><tbody>{(trip.members || []).map((member, index) => <tr key={`${member.name}-${index}`}><td>{member.name}</td><td>₹{Number(member.share || 0).toFixed(2)}</td></tr>)}</tbody></table></div>
      </div>
    </article>
  )
}
