import { useState } from 'react'
import { X } from 'lucide-react'
import splitBudget from '../utils/splitBudget.js'

export default function TripForm({ trip, user, onClose, onSave }) {
  const existingNames = trip?.members?.map((member) => member.name) || []
  const initialNames = existingNames.length ? existingNames : [user?.name || 'Traveller']
  const [values, setValues] = useState({
    name: trip?.name || '', destination: trip?.destination || '', startDate: trip?.startDate || '',
    endDate: trip?.endDate || '', total_budget: trip?.total_budget ?? trip?.budget ?? '',
    description: trip?.description || '', status: trip?.status || 'Planned',
  })
  const [memberNames, setMemberNames] = useState(initialNames)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  function update(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function touch(name) {
    setTouched((current) => ({ ...current, [name]: true }))
  }

  const count = memberNames.length
  const budget = Number(values.total_budget)
  const trimmedNames = memberNames.map((name) => name.trim())
  const filledNames = trimmedNames.filter(Boolean)
  const missingCount = trimmedNames.filter((name) => !name).length
  const peopleLabel = filledNames.length === 1 ? '1 person' : `${filledNames.length} people`
  const peopleText = missingCount ? `${peopleLabel} (${missingCount} ${missingCount === 1 ? 'name' : 'names'} missing)` : `${peopleLabel}${filledNames.length ? `: ${filledNames.join(', ')}` : ''}`

  const errors = {}
  if (!values.name.trim()) errors.name = 'Trip name is required.'
  if (!values.destination.trim()) errors.destination = 'Destination is required.'
  if (!values.startDate) errors.startDate = 'Start date is required.'
  if (!values.endDate) errors.endDate = 'End date is required.'
  if (values.startDate && values.endDate && values.endDate < values.startDate) errors.endDate = 'End date must be on or after start date.'
  if (values.total_budget === '' || !Number.isFinite(budget) || budget < 0) errors.total_budget = 'Enter a total budget of zero or more.'
  trimmedNames.forEach((name, index) => { if (!name) errors[`member${index}`] = 'Member name is required.' })
  if (new Set(trimmedNames.map((name) => name.toLowerCase())).size !== trimmedNames.length && trimmedNames.every(Boolean)) errors.members = 'Member names must be unique, ignoring case.'
  const valid = Object.keys(errors).length === 0
  const shares = splitBudget(budget >= 0 && Number.isFinite(budget) ? budget : 0, count)

  function addMember() {
    if (memberNames.length < 20) setMemberNames((current) => [...current, ''])
  }

  function removeMember(index) {
    if (index === 0 || memberNames.length <= 1) return
    setMemberNames((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (!valid) return
    onSave({ ...values, total_budget: budget, budget, members: trimmedNames,
      name: values.name.trim(), destination: values.destination.trim(), description: values.description.trim() })
  }

  const showMemberError = (index, key) => submitted || touched[key] || touched[`member${index}`]

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="trip-form-title">
      <div className="modal-heading"><div><div className="eyebrow">{trip ? 'UPDATE YOUR PLANS' : 'SOMETHING TO LOOK FORWARD TO'}</div><h2 id="trip-form-title">{trip ? 'Edit your trip' : 'Plan a new trip'}</h2><p>Traveller: {user?.name}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close form"><X size={19} /></button></div>
      <form onSubmit={submit} className="form-grid">
        <label className="field full-field">Trip name <span>*</span><input name="name" value={values.name} onChange={update} autoFocus />{errors.name && <small className="field-error">{errors.name}</small>}</label>
        <label className="field full-field">Destination <span>*</span><input name="destination" value={values.destination} onChange={update} />{errors.destination && <small className="field-error">{errors.destination}</small>}</label>
        <label className="field">Start date <span>*</span><input type="date" name="startDate" value={values.startDate} onChange={update} />{errors.startDate && <small className="field-error">{errors.startDate}</small>}</label>
        <label className="field">End date <span>*</span><input type="date" name="endDate" min={values.startDate || undefined} value={values.endDate} onChange={update} />{errors.endDate && <small className="field-error">{errors.endDate}</small>}</label>
        <label className="field">Total budget (₹) <span>*</span><input type="number" name="total_budget" min="0" step="0.01" value={values.total_budget} onChange={update} onBlur={() => touch('total_budget')} />{(submitted || touched.total_budget) && errors.total_budget && <small className="field-error">{errors.total_budget}</small>}</label>
        <div className="people-count full-field" aria-live="polite">👥 {peopleText}</div>
        <div className="full-field member-fields">{memberNames.map((name, index) => <div className="member-row" key={index}><label className="field">Member {index + 1} name <span>*</span><input aria-label={`Member ${index + 1} name`} value={name} onChange={(event) => setMemberNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} onBlur={() => touch(`member${index}`)} />{showMemberError(index, 'members') && errors[`member${index}`] && <small className="field-error">{errors[`member${index}`]}</small>}</label>{index > 0 && <button type="button" className="member-remove" onClick={() => removeMember(index)} aria-label={`Remove member ${index + 1}`}>✕ <span>Remove</span></button>}</div>)}</div>
        <div className="member-actions full-field"><button type="button" className="button button-light" onClick={addMember} disabled={memberNames.length >= 20}>+ Add member</button>{memberNames.length >= 20 && <span className="maximum-members">Maximum 20 members</span>}</div>
        {(submitted || Object.keys(touched).some((key) => key.startsWith('member'))) && errors.members && <p className="form-error full-field">{errors.members}</p>}
        <label className="field full-field">Travel status<select name="status" value={values.status} onChange={update}><option>Planned</option><option>Ongoing</option><option>Completed</option></select></label>
        <label className="field full-field">A little about your trip<textarea name="description" value={values.description} onChange={update} rows="3" maxLength="240" /></label>
        <div className="split-summary full-field"><strong>Split summary</strong><div><span>Total budget: {Number.isFinite(budget) && budget >= 0 ? `₹${budget.toFixed(2)}` : '₹0.00'}</span><span>Members: {count}</span><span>Each person pays: ₹{count ? (shares[0] ?? 0).toFixed(2) : '0.00'}</span></div><ul>{trimmedNames.map((name, index) => <li key={index}><span>{name || `Member ${index + 1}`}</span><strong>₹{(shares[index] ?? 0).toFixed(2)}</strong></li>)}</ul></div>
        <div className="form-footer full-field"><span>* Required fields</span><div><button type="button" className="button button-light" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{trip ? 'Save changes' : 'Create trip'}</button></div></div>
      </form>
    </section>
  </div>
}
