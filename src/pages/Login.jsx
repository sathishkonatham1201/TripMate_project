import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login, authError } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(values)
      navigate('/', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <a className="auth-brand" href="/">tripmate<span>.</span></a>
        <p className="auth-eyebrow">YOUR TRAVEL PLANS, TOGETHER</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-description">Log in to continue planning your next adventure.</p>
        {(error || authError) && <p className="auth-error" role="alert">{error || authError}</p>}
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required
            value={values.email} onChange={update} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required
            value={values.password} onChange={update} />
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">New to TripMate? <Link to="/register">Create an account</Link></p>
      </section>
    </main>
  )
}
