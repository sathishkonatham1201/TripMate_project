import { useState } from 'react'
import { X } from 'lucide-react'
import { tripDuration } from '../utils/dateUtils.js'

const categories = ['Sightseeing', 'Food', 'Transport', 'Shopping', 'Accommodation']

export default function ActivityForm({ trip, activity, onClose, onSave }) {
  const [values, setValues] = useState({
    name: activity?.name || '',
    location: activity?.location || '',
    time: activity?.time || '09:00',
    category: activity?.category || 'Sightseeing',
    description: activity?.description || '',
    day: activity?.day || 1,
  })
  const [error, setError] = useState('')
  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }
  function submit(event) {
    event.preventDefault()
    if (!values.name.trim() || !values.location.trim() || !values.time) {
      setError('Add an activity name, location, and time.')
      return
    }
    onSave({ ...values, name: values.name.trim(), location: values.location.trim(), day: Number(values.day) })
  }
  const days = Math.max(1, tripDuration(trip))
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card activity-modal" role="dialog" aria-modal="true" aria-labelledby="activity-title"><div className="modal-heading"><div><div className="eyebrow">MAKE THE DAY YOURS</div><h2 id="activity-title">{activity ? 'Edit activity' : 'Add an activity'}</h2><p>{trip.name}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close form"><X size={19} /></button></div><form onSubmit={submit} className="form-grid"><label className="field full-field">Activity name <span>*</span><input name="name" value={values.name} onChange={update} placeholder="e.g. Visit the old town" autoFocus /></label><label className="field full-field">Location <span>*</span><input name="location" value={values.location} onChange={update} placeholder="Where will it happen?" /></label><label className="field">Time <span>*</span><input type="time" name="time" value={values.time} onChange={update} /></label><label className="field">Trip day<select name="day" value={values.day} onChange={update}>{Array.from({ length: days }, (_, index) => <option value={index + 1} key={index}>Day {index + 1}</option>)}</select></label><label className="field full-field">Category<select name="category" value={values.category} onChange={update}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field full-field">Notes<textarea name="description" value={values.description} onChange={update} rows="3" placeholder="Anything to remember?" maxLength="240" /></label>{error && <p className="form-error full-field" role="alert">{error}</p>}<div className="form-footer full-field"><span>* Required fields</span><div><button type="button" className="button button-light" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{activity ? 'Save activity' : 'Add activity'}</button></div></div></form></section></div>
}
