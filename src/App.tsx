import { useEffect, useState, type FormEvent } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'

type Vehicle = {
  plate: string
  owner_name: string | null
  phone: string | null
}

type MaintenanceRecord = {
  id: string
  vehicle_plate: string
  mileage: number
  oil: string
  observation: string
  occurred_at: string
}

type LookupResult = {
  vehicle: Vehicle | null
  records: MaintenanceRecord[]
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function localDateTimeValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function normalizePlate(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [searchPlate, setSearchPlate] = useState('')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    plate: '',
    ownerName: '',
    phone: '',
    mileage: '',
    oil: '',
    observation: '',
    occurredAt: localDateTimeValue(),
  })

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setAuthError(sessionError.message)
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthError('')
    setAuthMessage('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setAuthError(signInError.message)
  }

  async function searchVehicle(event?: FormEvent<HTMLFormElement>, plateValue = searchPlate) {
    event?.preventDefault()
    const plate = normalizePlate(plateValue)
    if (!supabase || !plate) return
    setSearching(true)
    setError('')
    setSuccess('')
    setResult(null)
    setSearchPlate(plate)
    try {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('plate, owner_name, phone')
        .eq('plate', plate)
        .maybeSingle()
      if (vehicleError) throw vehicleError

      const { data: records, error: recordsError } = await supabase
        .from('maintenance_records')
        .select('id, vehicle_plate, mileage, oil, observation, occurred_at')
        .eq('vehicle_plate', plate)
        .order('occurred_at', { ascending: false })
      if (recordsError) throw recordsError

      setResult({ vehicle, records: records ?? [] })
      setForm((current) => ({
        ...current,
        plate,
        ownerName: vehicle?.owner_name ?? '',
        phone: vehicle?.phone ?? '',
      }))
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'No se pudo consultar la placa.')
    } finally {
      setSearching(false)
    }
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const plate = normalizePlate(form.plate)
    const mileage = Number(form.mileage)
    const occurredAt = new Date(form.occurredAt)
    if (!plate || !form.oil.trim() || !form.occurredAt || !Number.isFinite(mileage) || mileage < 0 || Number.isNaN(occurredAt.getTime())) {
      setError('Revisa la placa, el kilometraje, el aceite y la fecha y hora.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: vehicleError } = await supabase.from('vehicles').upsert({
        plate,
        owner_name: form.ownerName.trim() || null,
        phone: form.phone.trim() || null,
      })
      if (vehicleError) throw vehicleError

      const { error: recordError } = await supabase.from('maintenance_records').insert({
        vehicle_plate: plate,
        mileage,
        oil: form.oil.trim(),
        observation: form.observation.trim(),
        occurred_at: occurredAt.toISOString(),
      })
      if (recordError) throw recordError

      setSearchPlate(plate)
      await searchVehicle(undefined, plate)
      setForm((current) => ({
        ...current,
        mileage: '',
        oil: '',
        observation: '',
        occurredAt: localDateTimeValue(),
      }))
      setSuccess(`Mantenimiento de ${plate} guardado correctamente.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el mantenimiento.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setAuthError(signOutError.message)
  }

  if (!supabase) {
    return (
      <main className="setup-screen">
        <section className="setup-card">
          <div className="brand-mark"><WrenchIcon /></div>
          <p className="eyebrow">CONFIGURACIÓN INICIAL</p>
          <h1>Conecta tu base de datos</h1>
          <p>Agrega la URL y la clave pública de tu proyecto Supabase para empezar a usar el sistema.</p>
          <ol>
            <li>Copia <code>.env.example</code> como <code>.env.local</code>.</li>
            <li>Completa <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Ejecuta el SQL de <code>supabase/schema.sql</code> en el SQL Editor de Supabase.</li>
          </ol>
          <p className="setup-note">Usa la clave pública anon/publishable, nunca la clave service_role.</p>
        </section>
      </main>
    )
  }

  if (authLoading) {
    return <main className="loading-screen"><span className="spinner" />Cargando...</main>
  }

  if (!session) {
    return (
      <main className="login-screen">
        <section className="login-brand">
          <div className="brand-mark"><WrenchIcon /></div>
          <p className="eyebrow">TALLER · CONTROL DE SERVICIO</p>
          <h1>Cada vehículo,<br />con su historia.</h1>
          <p>Encuentra un registro por placa y lleva el control de cada mantenimiento en un solo lugar.</p>
          <div className="login-decoration"><CarIcon /><span>REGISTRO · HISTORIAL · CONTROL</span></div>
        </section>
        <section className="login-panel">
          <form className="login-card" onSubmit={signIn}>
            <p className="eyebrow">BIENVENIDO</p>
            <h2>Iniciar sesión</h2>
            <p className="muted">Ingresa con la cuenta del taller para continuar.</p>
            <label>Correo electrónico
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="taller@correo.com" />
            </label>
            <label>Contraseña
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" />
            </label>
            {authError && <p className="alert error-alert">{authError}</p>}
            {authMessage && <p className="alert success-alert">{authMessage}</p>}
            <button className="primary-button full-button" type="submit">Entrar <ArrowIcon /></button>
            <p className="login-footnote">La cuenta se crea desde Authentication → Users en Supabase.</p>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Control de mantenimiento">
          <span className="brand-mark small"><WrenchIcon /></span>
          <span><strong>Ruta</strong><small>CONTROL DE MANTENIMIENTO</small></span>
        </a>
        <div className="topbar-right">
          <span className="user-email">{session.user.email}</span>
          <button className="logout-button" onClick={() => void signOut()}><LogoutIcon /> <span>Salir</span></button>
        </div>
      </header>

      <main className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PANEL DEL TALLER</p>
            <h1>Historial de vehículos</h1>
            <p className="muted">Busca por placa o registra un nuevo mantenimiento.</p>
          </div>
          <div className="date-chip"><CalendarIcon />{new Intl.DateTimeFormat('es', { dateStyle: 'full' }).format(new Date())}</div>
        </div>

        {(error || success || authError) && (
          <div className={`alert ${error || authError ? 'error-alert' : 'success-alert'}`} role="status">
            {error || authError || success}
            <button className="alert-close" aria-label="Cerrar aviso" onClick={() => { setError(''); setSuccess(''); setAuthError('') }}>×</button>
          </div>
        )}

        <div className="dashboard-grid">
          <section className="history-column">
            <div className="search-card">
              <div className="section-title">
                <span className="title-icon"><SearchIcon /></span>
                <div><h2>Buscar vehículo</h2><p>Escribe la placa para consultar su información</p></div>
              </div>
              <form className="search-form" onSubmit={(event) => void searchVehicle(event)}>
                <label className="search-input-wrap"><PlateIcon />
                  <input value={searchPlate} onChange={(event) => setSearchPlate(event.target.value.toUpperCase())} placeholder="Ej. ABC-123" aria-label="Buscar por placa" />
                </label>
                <button className="primary-button" type="submit" disabled={searching || !searchPlate.trim()}>{searching ? 'Buscando...' : 'Buscar'} <ArrowIcon /></button>
              </form>
            </div>

            {!result && (
              <div className="empty-state">
                <div className="empty-illustration"><CarIcon /></div>
                <h3>Busca una placa para comenzar</h3>
                <p>Al encontrar un vehículo verás los datos del cliente y todos sus servicios anteriores.</p>
              </div>
            )}

            {result && (
              <>
                <section className="vehicle-card">
                  <div className="vehicle-icon"><CarIcon /></div>
                  <div className="vehicle-main">
                    <p className="eyebrow">VEHÍCULO</p>
                    <h2>{result.vehicle?.plate ?? searchPlate}</h2>
                    <p>{result.vehicle ? 'Información del cliente' : 'Todavía no tiene mantenimientos registrados'}</p>
                  </div>
                  {result.vehicle && (
                    <div className="owner-details">
                      {result.vehicle.owner_name && <span><UserIcon />{result.vehicle.owner_name}</span>}
                      {result.vehicle.phone && <span><PhoneIcon />{result.vehicle.phone}</span>}
                      {!result.vehicle.owner_name && !result.vehicle.phone && <span className="muted">Sin datos de cliente</span>}
                    </div>
                  )}
                  <div className="record-count"><strong>{result.records.length}</strong><span>{result.records.length === 1 ? 'servicio' : 'servicios'}</span></div>
                </section>

                <section className="history-section">
                  <div className="history-heading"><div><p className="eyebrow">REGISTROS ANTERIORES</p><h2>Historial de servicio</h2></div><span className="history-badge">{result.records.length} registros</span></div>
                  {result.records.length === 0 ? (
                    <div className="no-records"><ClipboardIcon /><div><strong>Sin historial todavía</strong><span>Guarda el primer mantenimiento desde el formulario.</span></div></div>
                  ) : (
                    <div className="timeline">
                      {result.records.map((record) => (
                        <article className="history-record" key={record.id}>
                          <span className="timeline-dot" />
                          <div className="record-topline"><span className="record-date"><CalendarIcon />{formatDate(record.occurred_at)}</span><span className="record-mileage"><GaugeIcon />{record.mileage.toLocaleString('es')} km</span></div>
                          <div className="record-oil"><span className="oil-icon"><DropIcon /></span><div><span className="field-caption">ACEITE</span><strong>{record.oil}</strong></div></div>
                          {record.observation && <p className="record-observation">{record.observation}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>

          <aside className="form-card">
            <div className="form-card-heading">
              <span className="title-icon"><PlusIcon /></span>
              <div><h2>Nuevo mantenimiento</h2><p>Registra un servicio para el historial</p></div>
            </div>
            <form className="maintenance-form" onSubmit={(event) => void saveRecord(event)}>
              <label>Placa del vehículo <span className="required">*</span>
                <input required value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value.toUpperCase() })} placeholder="Ej. ABC-123" />
              </label>
              <div className="form-row">
                <label>Nombre del cliente
                  <input value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} placeholder="Nombre (opcional)" />
                </label>
                <label>Teléfono
                  <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Teléfono (opcional)" />
                </label>
              </div>
              <div className="form-row">
                <label>Kilometraje <span className="required">*</span>
                  <span className="input-suffix"><input required type="number" min="0" step="1" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: event.target.value })} placeholder="0" /><span>km</span></span>
                </label>
                <label>Fecha y hora <span className="required">*</span>
                  <input required type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} />
                </label>
              </div>
              <label>Tipo de aceite <span className="required">*</span>
                <input required value={form.oil} onChange={(event) => setForm({ ...form, oil: event.target.value })} placeholder="Ej. Sintético 5W-30" />
              </label>
              <label>Observaciones
                <textarea rows={4} value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} placeholder="Detalles del servicio, recomendaciones..." />
              </label>
              <p className="required-note"><span className="required">*</span> Campos obligatorios</p>
              <button className="primary-button full-button save-button" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar mantenimiento'} <ArrowIcon /></button>
            </form>
          </aside>
        </div>
        <footer className="page-footer">Ruta · Control de mantenimiento de vehículos</footer>
      </main>
    </div>
  )
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg> }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg> }
function CarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 11 1.5-4.5A2.2 2.2 0 0 1 8.6 5h6.8a2.2 2.2 0 0 1 2.1 1.5L19 11M3 11h18v7H3zM6 18v2m12-2v2M6.5 14.5h.01m11-.01h.01M3 14h2m14 0h2" /></svg> }
function WrenchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3.1 3.1-3-3z" /></svg> }
function PlateIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h10M7 14h2m3 0h1m3 0h1" /></svg> }
function CalendarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg> }
function GaugeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.9 19a9 9 0 1 1 14.2 0M12 13l4-4M7 19h10" /><circle cx="12" cy="13" r="1" /></svg> }
function DropIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s7 7.2 7 12a7 7 0 1 1-14 0c0-4.8 7-12 7-12Z" /><path d="M9 16a3 3 0 0 0 3 3" /></svg> }
function PlusIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> }
function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18H7zM10 6h4m-3 12h2" /></svg> }
function ClipboardIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="17" rx="2" /><path d="M9 5V3h6v2m-6 6h6m-6 4h6" /></svg> }
function LogoutIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></svg> }

export default App
