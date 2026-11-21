import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register({ name: values.name, email: values.email, password: values.password })
      navigate('/', { replace: true })
    } catch (registerError) {
      setError(registerError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <a className="auth-brand" href="/">tripmate<span>.</span></a>
        <p className="auth-eyebrow">MAKE ROOM FOR A LITTLE WONDER</p>
        <h1 id="register-title">Create your account</h1>
        <p className="auth-description">Keep every travel plan in one happy place.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="register-name">Name</label>
          <input id="register-name" name="name" autoComplete="name" required
            value={values.name} onChange={update} />
          <label htmlFor="register-email">Email</label>
          <input id="register-email" name="email" type="email" autoComplete="email" required
            value={values.email} onChange={update} />
          <label htmlFor="register-password">Password</label>
          <input id="register-password" name="password" type="password" autoComplete="new-password"
            minLength="6" required value={values.password} onChange={update} />
          <label htmlFor="register-confirm">Confirm password</label>
          <input id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password"
            required value={values.confirmPassword} onChange={update} />
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  )
}
