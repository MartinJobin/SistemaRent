import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "@firebase/auth";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  LayoutDashboard,
  Map as MapIcon,
  Car,
  TriangleAlert,
  Wrench,
  FileChartColumn,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  Download,
  CalendarDays,
  Clock3,
  Fuel,
  Gauge,
  MapPin,
  ShieldCheck,
  Users,
  Building2,
  Database,
  Radio,
  Plus,
  CheckCircle2,
  CircleDollarSign,
  PanelLeftClose,
} from "lucide-react";
import { vehicles, alerts, Vehicle, replaceVehicles } from "./data";
import { firebaseAuth } from "./firebase";
import "./styles.css";
import "./auth.css";
import "./rent-theme.css";
import "./tech-overrides.css";
import "./cyber-dark.css";
import "./readability.css";

type Page =
  | "Dashboard"
  | "Mapa en vivo"
  | "Flota"
  | "Clientes"
  | "Alertas"
  | "Mantenimiento"
  | "Reportes"
  | "Accesos"
  | "Detalle";
type AnalyticsRow = {
  chassis: string;
  plate: string;
  brand: string;
  model: string;
  owner: string;
  agency: string;
  status: string;
  lastSeen: string;
  tripCount: number;
  firstTrip: string | null;
  lastTrip: string | null;
  distanceKm: number;
  durationMs: number;
  startOdometerKm: number | null;
  endOdometerKm: number | null;
  maxSpeedKmh: number;
};
const menu: [Page, React.ElementType][] = [
  ["Dashboard", LayoutDashboard],
  ["Mapa en vivo", MapIcon],
  ["Flota", Car],
  ["Clientes", Users],
  ["Alertas", TriangleAlert],
  ["Mantenimiento", Wrench],
  ["Reportes", FileChartColumn],
  ["Accesos", Users],
];
const statusClass = (s: string) =>
  s.toLowerCase().replace("í", "i").replace("ñ", "n").replace(" ", "-");
const money = (n: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function App() {
  const [authState, setAuthState] = useState<"loading" | "ready">("loading");
  const [authUser, setAuthUser] = useState<any>(null);
  const [page, setPage] = useState<Page>("Dashboard");
  const [selected, setSelected] = useState<Vehicle>(vehicles[0]);
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      new Promise((resolve) => window.setTimeout(resolve, 1400)),
    ])
      .then(([x]) => {
        setAuthUser(x.user);
        setAuthState("ready");
      })
      .catch(() => setAuthState("ready"));
  }, []);
  useEffect(() => {
    if (!authUser) return;
    const load = () =>
      fetch("/api/fleet")
        .then(async (r) => {
          if (!r.ok) throw new Error("Error de API");
          return r.json();
        })
        .then((data) => {
          replaceVehicles(data.vehicles);
          if (data.vehicles[0])
            setSelected(
              (current) =>
                data.vehicles.find((v: Vehicle) => v.id === current?.id) ||
                data.vehicles[0],
            );
          setDataState("ready");
        })
        .catch(() => setDataState("error"));
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [authUser]);
  const navigate = (p: Page) => {
    setPage(p);
    setOpen(false);
  };
  const detail = (v: Vehicle) => {
    setSelected(v);
    setPage("Detalle");
  };
  if (authState === "loading") return <Splash />;
  if (!authUser) return <FirebaseLogin onSuccess={setAuthUser} />;
  const logout = () =>
    Promise.allSettled([
      signOut(firebaseAuth),
      fetch("/api/auth/logout", { method: "POST" }),
    ]).finally(() => setAuthUser(null));
  return (
    <div className={sidebarCollapsed ? "app sidebar-collapsed" : "app"}>
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brandmark">
            <Car aria-label="Rent" />
          </div>
          <div>
            <strong>RENT</strong>
          </div>
          <button className="close" onClick={() => setOpen(false)}>
            <X />
          </button>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
            aria-label={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            {sidebarCollapsed ? <ChevronRight /> : <PanelLeftClose />}
          </button>
        </div>
        <nav>
          {menu
            .filter(([n]) => n !== "Accesos" || authUser.role === "admin")
            .map(([n, I]) => (
              <button
                key={n}
                className={
                  page === n || (page === "Detalle" && n === "Flota")
                    ? "active"
                    : ""
                }
                onClick={() => navigate(n)}
              >
                <I />
                <span>{n}</span>
              </button>
            ))}
        </nav>
        <div className="sidefoot" onClick={logout} title="Cerrar sesión">
          <div className="avatar">
            {authUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{authUser.name}</strong>
            <small>
              {authUser.role === "admin" ? "Administrador" : "Consulta"}
            </small>
          </div>
          <X />
        </div>
      </aside>
      <main>
        <header>
          <button className="hamb" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="global-search">
            <Search />
            <input
              placeholder="Buscar vehículo, placa o cliente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = vehicles.find((x) =>
                    (x.plate + x.brand + x.driver)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  );
                  if (v) detail(v);
                }
              }}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="header-actions">
            <NotificationBell goAlerts={() => setPage("Alertas")} />
            <div className="avatar">
              {authUser.name.slice(0, 2).toUpperCase()}
            </div>
            <button className="logout-button" onClick={logout}>
              <X /> Cerrar sesión
            </button>
          </div>
        </header>
        <div className="content">
          {page === "Dashboard" && <Dashboard detail={detail} go={navigate} />}{" "}
          {page === "Mapa en vivo" && <LiveMap detail={detail} />}{" "}
          {page === "Flota" && <Fleet detail={detail} />}{" "}
          {page === "Clientes" && <Clients detail={detail} />}{" "}
          {page === "Alertas" && <Alerts />}{" "}
          {page === "Mantenimiento" && <MaintenanceCenter />}{" "}
          {page === "Reportes" && <Reports />}{" "}
          {page === "Accesos" && <FirebaseAccessManagement />}{" "}
          {page === "Detalle" && (
            <VehicleDetail v={selected} back={() => setPage("Flota")} />
          )}
        </div>
      </main>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}

function Splash() {
  return (
    <div className="rent-splash">
      <div className="loader-stage">
        <i />
        <i />
        <img className="rent-loader-logo" src="/rent-brand.png" alt="Rent · Rentabilidad en movimiento" />
      </div>
      <div className="splash-loader">
        <i />
      </div>
    </div>
  );
}
const maintenanceDue = (item: any) => {
  if (item.status !== "Pendiente") return false;
  const vehicle = vehicles.find((v) => v.plate === item.plate);
  const dueByDate = Boolean(
    item.dueDate &&
      new Date(item.dueDate + "T23:59:59").getTime() <= Date.now(),
  );
  const dueByOdometer = Boolean(
    item.dueOdometer && vehicle && vehicle.odometer >= Number(item.dueOdometer),
  );
  return dueByDate || dueByOdometer;
};

function NotificationBell({ goAlerts }: { goAlerts: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const load = () =>
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((j) => setItems(j.items || []));
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);
  const offline = vehicles.filter((v) => v.status === "Sin señal").length;
  const due = items.filter(maintenanceDue);
  const total = due.length + offline;
  return (
    <div className="notification-wrap">
      <button className="icon" onClick={() => setOpen(!open)}>
        <Bell />
        {total > 0 && <b />}
      </button>
      {open && (
        <div className="notification-menu">
          <div>
            <strong>Notificaciones</strong>
            <span>{total} activas</span>
          </div>
          {due.slice(0, 5).map((x) => (
            <button key={x.id} onClick={goAlerts}>
              <Wrench />
              <span>
                <b>{x.type} vencido</b>
                <small>
                  {x.plate} ·{" "}
                  {x.dueDate
                    ? `vence ${new Date(x.dueDate + "T00:00:00").toLocaleDateString("es-EC")}`
                    : `a los ${Number(x.dueOdometer).toLocaleString("es-EC")} km`}
                </small>
              </span>
            </button>
          ))}
          {offline > 0 && (
            <button onClick={goAlerts}>
              <Radio />
              <span>
                <b>Vehículos sin señal</b>
                <small>{offline} requieren revisión</small>
              </span>
            </button>
          )}
          {total === 0 && (
            <p className="notification-empty">No tienes alertas activas.</p>
          )}
          <button className="view-all" onClick={goAlerts}>
            Ver todas las alertas
          </button>
        </div>
      )}
    </div>
  );
}
function Login({
  setupRequired,
  onSuccess,
}: {
  setupRequired: boolean;
  onSuccess: (user: any) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    fetch(setupRequired ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        return j;
      })
      .then((j) => onSuccess(j.user))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <img src="/rent-brand.png" alt="Rent" />
      </div>
      <form className="auth-card" onSubmit={submit}>
        <span>PLATAFORMA DE FLOTA</span>
        <h1>{setupRequired ? "Crear administrador" : "Bienvenido a Rent"}</h1>
        <p>
          {setupRequired
            ? "Configura el primer acceso administrativo."
            : "Ingresa tus credenciales para continuar."}
        </p>
        {setupRequired && (
          <label>
            Nombre completo
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
        )}
        <label>
          Usuario
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus={!setupRequired}
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={setupRequired ? "new-password" : "current-password"}
          />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy
            ? "Validando..."
            : setupRequired
              ? "Crear administrador"
              : "Ingresar"}
        </button>
        <small>Rentabilidad en movimiento</small>
      </form>
    </div>
  );
}
function AccessManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "viewer",
  });
  const [message, setMessage] = useState("");
  const load = () =>
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []));
  useEffect(() => {
    load();
  }, []);
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        return j;
      })
      .then(() => {
        setForm({ name: "", username: "", password: "", role: "viewer" });
        setMessage("Acceso creado correctamente.");
        load();
      })
      .catch((e) => setMessage(e.message));
  };
  return (
    <>
      <Title
        title="Administración de accesos"
        sub="Crea usuarios administradores o de consulta."
      />
      <div className="access-grid">
        <form className="panel access-form" onSubmit={create}>
          <h2>Nuevo acceso</h2>
          <label>
            Nombre completo
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Usuario
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Contraseña temporal
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Rol
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="viewer">Solo consulta</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {message && <p>{message}</p>}
          <button className="primary">Crear acceso</button>
        </form>
        <section className="panel table-wrap">
          <PanelHead
            title="Usuarios habilitados"
            sub={`${users.length} accesos registrados`}
          />
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                  </td>
                  <td>{u.username}</td>
                  <td>
                    {u.role === "admin" ? "Administrador" : "Solo consulta"}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("es-EC")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
function Title({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  const hideSub = [
    "Flota Rent",
    "Mapa en vivo",
    "Clientes y vehículos",
    "Centro de alertas",
  ].includes(title);
  return (
    <div className="title">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {!hideSub && sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function Dashboard({
  detail,
  go,
}: {
  detail: (v: Vehicle) => void;
  go: (p: Page) => void;
}) {
  const clients = new Set(vehicles.map((v) => v.driver)).size;
  const online = vehicles.filter((v) => v.status === "En línea").length;
  const offline = vehicles.filter((v) => v.status === "Sin señal").length;
  const cards = [
    [
      "Total flota",
      String(vehicles.length),
      "Vehículos únicos por chasis",
      Car,
      "blue",
    ],
    [
      "Clientes",
      String(clients),
      "Propietarios identificados",
      Users,
      "violet",
    ],
    ["En línea", String(online), "Reportando en Traccar", Radio, "green"],
    [
      "Fuera de línea",
      String(offline),
      "Requieren seguimiento",
      TriangleAlert,
      "red",
    ],
  ];
  return (
    <>
      <Title
        title="Flota Rent"
        sub="Inventario y telemetría actualizados desde Base, Flespi y Traccar."
        action={
          <button className="primary" onClick={() => go("Reportes")}>
            <FileChartColumn /> Ver analítica
          </button>
        }
      />
      <div className="metrics">
        {cards.map(([a, b, c, I, color]: any) => (
          <div className="metric" key={a}>
            <div className={"metric-icon " + color}>
              <I />
            </div>
            <div>
              <span>{a}</span>
              <strong>{b}</strong>
              <small>{c}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="grid-main">
        <section className="panel map-panel">
          <PanelHead
            title="Operación en vivo"
            sub="Últimas posiciones recibidas desde Traccar"
            action={
              <button className="link" onClick={() => go("Mapa en vivo")}>
                Abrir mapa <ArrowUpRight />
              </button>
            }
          />
          <MiniMap detail={detail} />
        </section>
        <ClientSummary go={go} />
      </div>
      <FleetInsights />
    </>
  );
}
function ClientSummary({ go }: { go: (p: Page) => void }) {
  const counts = [
    ...vehicles
      .reduce(
        (map, v) => map.set(v.driver, (map.get(v.driver) || 0) + 1),
        new Map<string, number>(),
      )
      .entries(),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return (
    <section className="panel client-summary">
      <PanelHead
        title="Flota por cliente"
        sub={`${counts.length} clientes con mayor cantidad`}
        action={
          <button className="link" onClick={() => go("Clientes")}>
            Ver todos <ChevronRight />
          </button>
        }
      />
      {counts.map(([name, total], i) => (
        <button key={name} onClick={() => go("Clientes")}>
          <span className="client-rank">{i + 1}</span>
          <div>
            <strong>{name}</strong>
            <small>
              {total} vehículo{total === 1 ? "" : "s"} asignado
              {total === 1 ? "" : "s"}
            </small>
          </div>
          <b>{total}</b>
        </button>
      ))}
    </section>
  );
}
function FleetInsights() {
  const [selected, setSelected] = useState<{
    title: string;
    list: Vehicle[];
  } | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [mileageFilter, setMileageFilter] = useState("");
  const mileage = [
    ...vehicles
      .filter((v) => v.odometer > 0)
      .reduce((map, v) => {
        const start = Math.floor(v.odometer / 5000) * 5000;
        map.set(start, (map.get(start) || 0) + 1);
        return map;
      }, new Map<number, number>())
      .entries(),
  ].sort((a, b) => a[0] - b[0]);
  const cities = [
    ...vehicles
      .reduce((map, v) => {
        const city = v.city || "Sin ubicación";
        map.set(city, (map.get(city) || 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1]);
  const maxMileage = Math.max(1, ...mileage.map((x) => x[1]));
  const maxCity = Math.max(1, ...cities.map((x) => x[1]));
  const chooseMileage = (start: number) =>
    setSelected({
      title: `Vehículos entre ${start.toLocaleString("es-EC")} y ${(start + 4999).toLocaleString("es-EC")} km`,
      list: vehicles.filter(
        (v) => v.odometer >= start && v.odometer < start + 5000,
      ),
    });
  const chooseCity = (city: string) =>
    setSelected({
      title: `Vehículos en ${city}`,
      list: vehicles.filter((v) => (v.city || "Sin ubicación") === city),
    });
  const combined = vehicles.filter(
    (v) =>
      (!cityFilter || (v.city || "Sin ubicación") === cityFilter) &&
      (!mileageFilter ||
        (v.odometer >= Number(mileageFilter) &&
          v.odometer < Number(mileageFilter) + 5000)),
  );
  const combinedActive = Boolean(cityFilter || mileageFilter);
  const result = combinedActive
    ? {
        title: `Filtro combinado${cityFilter ? ` · ${cityFilter}` : ""}${mileageFilter ? ` · ${Number(mileageFilter).toLocaleString("es-EC")}–${(Number(mileageFilter) + 4999).toLocaleString("es-EC")} km` : ""}`,
        list: combined,
      }
    : selected;
  return (
    <div className="insights-grid">
      <section className="panel insight-filter-bar">
        <div>
          <span>
            <Gauge />
          </span>
          <div>
            <b>Filtro avanzado de flota</b>
            <small>
              Combina ubicación y kilometraje para encontrar vehículos
              específicos.
            </small>
          </div>
        </div>
        <label>
          Ciudad
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">Todas las ciudades</option>
            {cities.map(([city]) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          Rango de kilometraje
          <select
            value={mileageFilter}
            onChange={(e) => setMileageFilter(e.target.value)}
          >
            <option value="">Todos los rangos</option>
            {mileage.map(([start]) => (
              <option key={start} value={start}>
                {start.toLocaleString("es-EC")}–
                {(start + 4999).toLocaleString("es-EC")} km
              </option>
            ))}
          </select>
        </label>
        {combinedActive && (
          <button
            className="secondary"
            onClick={() => {
              setCityFilter("");
              setMileageFilter("");
            }}
          >
            <X /> Limpiar
          </button>
        )}
      </section>
      <section className="panel insight-panel">
        <PanelHead
          title="Rangos de kilometraje"
          sub="Selecciona un rango para conocer los vehículos"
        />
        <div className="insight-bars">
          {mileage.map(([start, count]) => (
            <button key={start} onClick={() => chooseMileage(start)}>
              <span>
                {start.toLocaleString("es-EC")}–
                {(start + 4999).toLocaleString("es-EC")} km
              </span>
              <i>
                <b
                  style={{
                    width: `${Math.max(5, (count / maxMileage) * 100)}%`,
                  }}
                />
              </i>
              <strong>{count}</strong>
              <ChevronRight />
            </button>
          ))}
        </div>
      </section>
      <section className="panel insight-panel">
        <PanelHead
          title="Vehículos por ciudad"
          sub="Selecciona una ciudad para ver placas y propietarios"
        />
        <div className="location-help">
          <b>¿Qué significan?</b>
          <span>
            <strong>Otra zona:</strong> posición a más de 80 km de las ciudades
            principales.
          </span>
          <span>
            <strong>Sin ubicación:</strong> Traccar no tiene coordenadas
            recientes del equipo.
          </span>
        </div>
        <div className="insight-bars cities">
          {cities.map(([city, count]) => (
            <button key={city} onClick={() => chooseCity(city)}>
              <span>
                <MapPin /> {city}
              </span>
              <i>
                <b
                  style={{ width: `${Math.max(5, (count / maxCity) * 100)}%` }}
                />
              </i>
              <strong>{count}</strong>
              <ChevronRight />
            </button>
          ))}
        </div>
      </section>
      {result && (
        <section className="panel insight-vehicles">
          <PanelHead
            title={result.title}
            sub={`${result.list.length} vehículos encontrados`}
            action={
              !combinedActive ? (
                <button className="link" onClick={() => setSelected(null)}>
                  <X /> Cerrar
                </button>
              ) : undefined
            }
          />
          <div className="insight-vehicle-grid">
            {result.list.map((v) => (
              <div key={v.id}>
                <span className={"status-dot " + statusClass(v.status)} />
                <div>
                  <b>{v.plate}</b>
                  <strong>
                    {v.brand} {v.model}
                  </strong>
                  <small>
                    {v.driver} · {v.odometer.toLocaleString("es-EC")} km
                  </small>
                  <small>
                    {v.city || "Sin ubicación"} · {v.status}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function PanelHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
const markerColor = (s: string) =>
  s === "En línea" || s === "Disponible"
    ? "#16a36a"
    : s === "Alquilado"
      ? "#6d5ce7"
      : s === "Mantenimiento"
        ? "#f59e0b"
        : "#ef4444";
function MiniMap({ detail }: { detail: (v: Vehicle) => void }) {
  return (
    <MapContainer
      center={[-2.164, -79.895]}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Markers detail={detail} />
    </MapContainer>
  );
}
function Markers({ detail }: { detail: (v: Vehicle) => void }) {
  return (
    <>
      {vehicles
        .filter(
          (v): v is Vehicle & { lat: number; lng: number } =>
            v.lat !== null && v.lng !== null,
        )
        .map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={9}
            pathOptions={{
              color: "white",
              weight: 3,
              fillColor: markerColor(v.status),
              fillOpacity: 1,
            }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
              opacity={1}
              className="plate-label"
            >
              {v.plate}
            </Tooltip>
            <Popup>
              <div className="popup">
                <b>{v.plate}</b>
                <span>
                  {v.brand} {v.model}
                </span>
                <small>
                  {v.status} ·{" "}
                  {v.lastSeen && v.lastSeen !== "Sin telemetría"
                    ? new Date(v.lastSeen).toLocaleString("es-EC")
                    : "Sin señal"}
                </small>
                <button onClick={() => detail(v)}>Ver vehículo</button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </>
  );
}
function LiveMap({ detail }: { detail: (v: Vehicle) => void }) {
  const located = vehicles.filter(
    (v): v is Vehicle & { lat: number; lng: number } =>
      v.lat !== null && v.lng !== null,
  );
  return (
    <>
      <Title
        title="Mapa en vivo"
        sub="Ubicación, placa y estado de los vehículos conectados a Traccar"
      />
      <section className="live-map">
        <MapContainer center={[-2.164, -79.895]} zoom={12} zoomControl={true}>
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {located.map((v) => (
            <CircleMarker
              key={v.id}
              center={[v.lat, v.lng]}
              radius={10}
              pathOptions={{
                color: "white",
                weight: 3,
                fillColor: markerColor(v.status),
                fillOpacity: 1,
              }}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -11]}
                opacity={1}
                className="plate-label"
              >
                {v.plate}
              </Tooltip>
              <Popup>
                <div className="popup">
                  <b>{v.plate}</b>
                  <span>
                    {v.brand} {v.model}
                  </span>
                  <small>
                    {v.status} · {v.speed} km/h
                  </small>
                  <p>
                    {v.lastSeen && v.lastSeen !== "Sin telemetría"
                      ? `Última señal: ${new Date(v.lastSeen).toLocaleString("es-EC")}`
                      : "Sin telemetría"}
                  </p>
                  <button onClick={() => detail(v)}>Ver vehículo</button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="floating-count">
          <Radio />
          <div>
            <strong>{located.length} ubicaciones</strong>
            <span>Actualización automática cada 30 segundos</span>
          </div>
        </div>
      </section>
    </>
  );
}
const exportExcel = (
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
) => {
  const esc = (v: any) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" }),
  );
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
};
const vehicleExcelRows = (list: Vehicle[]) =>
  list.map((v) => [
    v.plate,
    v.chassis || "",
    v.brand,
    v.model,
    v.color || "",
    v.driver,
    v.ownerId || "",
    v.branch,
    v.status,
    v.odometer || "",
    v.lastSeen && v.lastSeen !== "Sin telemetría"
      ? new Date(v.lastSeen).toLocaleString("es-EC")
      : "Sin dato",
    v.imei || "",
  ]);
function Fleet({ detail }: { detail: (v: Vehicle) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      vehicles.filter((v) =>
        (v.plate + v.brand + v.model + v.driver + v.id + (v.ownerId || ""))
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [q],
  );
  const download = () =>
    exportExcel(
      "flota-rent",
      [
        "Placa",
        "Chasis",
        "Marca",
        "Modelo",
        "Color",
        "Cliente",
        "Identificación",
        "Agencia",
        "Estado",
        "Odómetro km",
        "Última señal",
        "IMEI",
      ],
      vehicleExcelRows(list),
    );
  return (
    <>
      <Title
        title="Flota"
        sub={`${vehicles.length} vehículos enlazados con inventario y telemetría.`}
        action={
          <button className="primary" onClick={download}>
            <Download /> Descargar Excel
          </button>
        }
      />
      <div className="table-tools">
        <div className="searchbox">
          <Search />
          <input
            placeholder="Buscar por placa, chasis, marca o cliente"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Estado</th>
              <th>Cliente / propietario</th>
              <th>Agencia</th>
              <th>Odómetro</th>
              <th>Última señal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id} onClick={() => detail(v)}>
                <td>
                  <div className="vehicle-cell">
                    <div>
                      <Car />
                    </div>
                    <span>
                      <b>{v.plate}</b>
                      <small>
                        {v.brand} {v.model} · {v.chassis}
                      </small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className={"pill " + statusClass(v.status)}>
                    <i />
                    {v.status}
                  </span>
                </td>
                <td>
                  <b>{v.driver}</b>
                  <br />
                  <small>{v.ownerId || "Sin identificación"}</small>
                </td>
                <td>{v.branch}</td>
                <td>
                  {v.odometer
                    ? v.odometer.toLocaleString("es-EC") + " km"
                    : "Sin dato"}
                </td>
                <td>
                  {v.lastSeen && v.lastSeen !== "Sin telemetría"
                    ? new Date(v.lastSeen).toLocaleString("es-EC")
                    : "Sin telemetría"}
                </td>
                <td>
                  <ChevronRight />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function Clients({ detail }: { detail: (v: Vehicle) => void }) {
  const grouped = useMemo(
    () =>
      [
        ...vehicles
          .reduce((map, v) => {
            const list = map.get(v.driver) || [];
            list.push(v);
            map.set(v.driver, list);
            return map;
          }, new Map<string, Vehicle[]>())
          .entries(),
      ].sort((a, b) => b[1].length - a[1].length),
    [],
  );
  const [selected, setSelected] = useState(grouped[0]?.[0] || "");
  const [q, setQ] = useState("");
  const clients = grouped.filter(([name]) =>
    name.toLowerCase().includes(q.toLowerCase()),
  );
  const active = grouped.find(([name]) => name === selected) || clients[0];
  const list = active?.[1] || [];
  const download = () =>
    exportExcel(
      `cliente-${(active?.[0] || "rent").replaceAll(" ", "-")}`,
      [
        "Placa",
        "Chasis",
        "Marca",
        "Modelo",
        "Color",
        "Cliente",
        "Identificación",
        "Agencia",
        "Estado",
        "Odómetro km",
        "Última señal",
        "IMEI",
      ],
      vehicleExcelRows(list),
    );
  return (
    <>
      <Title
        title="Clientes y vehículos"
        sub="Consulta cuántos vehículos pertenecen a cada cliente y su estado actual."
        action={
          <button
            className="primary"
            onClick={download}
            disabled={!list.length}
          >
            <Download /> Descargar cliente en Excel
          </button>
        }
      />
      <div className="clients-layout">
        <section className="panel clients-list">
          <div className="client-search">
            <Search />
            <input
              placeholder="Buscar cliente"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {clients.map(([name, cars]) => (
            <button
              className={active?.[0] === name ? "active" : ""}
              key={name}
              onClick={() => setSelected(name)}
            >
              <div>
                <strong>{name}</strong>
                <small>
                  {cars.filter((v) => v.status === "En línea").length} en línea
                  · {cars.filter((v) => v.status === "Sin señal").length} sin
                  señal
                </small>
              </div>
              <b>{cars.length}</b>
            </button>
          ))}
        </section>
        <section className="panel table-wrap client-vehicles">
          <PanelHead
            title={active?.[0] || "Cliente"}
            sub={`${list.length} vehículo${list.length === 1 ? "" : "s"} asignado${list.length === 1 ? "" : "s"}`}
          />
          <table>
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Estado</th>
                <th>Chasis</th>
                <th>Agencia</th>
                <th>Odómetro</th>
                <th>Última señal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} onClick={() => detail(v)}>
                  <td>
                    <div className="vehicle-cell">
                      <div>
                        <Car />
                      </div>
                      <span>
                        <b>{v.plate}</b>
                        <small>
                          {v.brand} {v.model} · {v.color}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={"pill " + statusClass(v.status)}>
                      <i />
                      {v.status}
                    </span>
                  </td>
                  <td>{v.chassis}</td>
                  <td>{v.branch}</td>
                  <td>
                    {v.odometer
                      ? v.odometer.toLocaleString("es-EC") + " km"
                      : "Sin dato"}
                  </td>
                  <td>
                    {v.lastSeen && v.lastSeen !== "Sin telemetría"
                      ? new Date(v.lastSeen).toLocaleString("es-EC")
                      : "Sin dato"}
                  </td>
                  <td>
                    <ChevronRight />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
function Alerts() {
  const [reminders, setReminders] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((j) =>
        setReminders((j.items || []).filter((x: any) => maintenanceDue(x))),
      );
  }, []);
  const offline = vehicles.filter((v) => v.status === "Sin señal");
  return (
    <>
      <Title
        title="Centro de alertas"
        sub="Vehículos sin señal y recordatorios de mantenimiento."
      />
      <div className="metrics compact">
        <div className="metric">
          <div className="metric-icon red">
            <Radio />
          </div>
          <div>
            <span>Sin señal</span>
            <strong>{offline.length}</strong>
            <small>Estado actual</small>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon orange">
            <Wrench />
          </div>
          <div>
            <span>Mantenimientos</span>
            <strong>{reminders.length}</strong>
            <small>Recordatorios pendientes</small>
          </div>
        </div>
      </div>
      <section className="panel alert-list">
        <PanelHead
          title="Alertas activas"
          sub={`${offline.length + reminders.length} eventos requieren seguimiento`}
        />
        {reminders.map((x) => (
          <div className="alert-card" key={x.id}>
            <span className="severity media">
              <Wrench />
            </span>
            <div className="alert-main">
              <div>
                <span className="level media">Mantenimiento</span>
                <h3>{x.type}</h3>
              </div>
              <p>
                <b>{x.plate}</b>
                {x.dueDate
                  ? ` · fecha ${new Date(x.dueDate + "T00:00:00").toLocaleDateString("es-EC")}`
                  : ""}
                {x.dueOdometer
                  ? ` · objetivo ${Number(x.dueOdometer).toLocaleString("es-EC")} km`
                  : ""}
              </p>
              <small>{x.notes || "Recordatorio programado"}</small>
            </div>
          </div>
        ))}
        {offline.map((v) => (
          <div className="alert-card" key={v.id}>
            <span className="severity alta">
              <Radio />
            </span>
            <div className="alert-main">
              <div>
                <span className="level alta">Sin señal</span>
                <h3>{v.plate}</h3>
              </div>
              <p>
                <b>
                  {v.brand} {v.model}
                </b>{" "}
                · {v.driver}
              </p>
              <small>
                Última comunicación:{" "}
                {v.lastSeen && v.lastSeen !== "Sin telemetría"
                  ? new Date(v.lastSeen).toLocaleString("es-EC")
                  : "Sin dato"}
              </small>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
function Maintenance() {
  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    type: "Cambio de aceite",
    mode: "odometer",
    dueDate: "",
    interval: "5000",
    notes: "",
  });
  const load = () =>
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((j) => setItems(j.items || []));
  useEffect(() => {
    load();
  }, []);
  const choices = vehicles.filter((v) =>
    (v.plate + v.brand + v.model + v.chassis)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const toggle = (plate: string) =>
    setSelected((s) =>
      s.includes(plate) ? s.filter((x) => x !== plate) : [...s, plate],
    );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected.length) return;
    const targets = vehicles.filter((v) => selected.includes(v.plate));
    await Promise.all(
      targets.map((v) =>
        fetch("/api/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plate: v.plate,
            chassis: v.chassis,
            type: form.type,
            dueDate: form.mode !== "odometer" ? form.dueDate : "",
            dueOdometer:
              form.mode !== "date"
                ? Number(v.odometer || 0) + Number(form.interval || 0)
                : null,
            frequency: form.mode !== "date" ? Number(form.interval || 0) : null,
            lastMaintenanceOdometer: Number(v.odometer || 0),
            lastRoutine: Number(v.odometer || 0),
            notes: form.notes,
          }),
        }),
      ),
    );
    setSelected([]);
    setShow(false);
    load();
  };
  const complete = (id: string) =>
    fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "complete", observation: "" }) }).then(load);
  const pending = items.filter((x) => x.status === "Pendiente");
  const overdue = pending.filter((x) => {
    const v = vehicles.find((v) => v.plate === x.plate);
    return (
      (x.dueDate && new Date(x.dueDate + "T23:59:59") < new Date()) ||
      (x.dueOdometer && v && v.odometer >= x.dueOdometer)
    );
  }).length;
  return (
    <>
      <Title
        title="Mantenimiento"
        sub="Programa el mismo servicio para uno o varios vehículos, por fecha o kilometraje."
        action={
          <button className="primary" onClick={() => setShow(!show)}>
            <Plus /> Nuevo recordatorio
          </button>
        }
      />
      {show && (
        <form className="panel maintenance-bulk" onSubmit={submit}>
          <div className="vehicle-picker">
            <label>Buscar y seleccionar vehículos</label>
            <div className="client-search">
              <Search />
              <input
                placeholder="Placa, marca, modelo o chasis"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="vehicle-options">
              {choices.slice(0, 80).map((v) => (
                <label
                  key={v.id}
                  className={selected.includes(v.plate) ? "selected" : ""}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(v.plate)}
                    onChange={() => toggle(v.plate)}
                  />
                  <span>
                    <b>{v.plate}</b>
                    <small>
                      {v.brand} {v.model} · actual{" "}
                      {v.odometer.toLocaleString("es-EC")} km
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <small>
              {selected.length} vehículo{selected.length === 1 ? "" : "s"}{" "}
              seleccionado{selected.length === 1 ? "" : "s"}
            </small>
          </div>
          <div className="maintenance-fields">
            <label>
              Tipo de mantenimiento
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                    interval:
                      e.target.value === "Cambio de aceite"
                        ? "5000"
                        : form.interval,
                  })
                }
              >
                <option>Cambio de aceite</option>
                <option>Filtros</option>
                <option>Frenos</option>
                <option>Neumáticos</option>
                <option>Revisión general</option>
                <option>Matrícula / documentos</option>
              </select>
            </label>
            <label>
              Generar recordatorio por
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="odometer">Odómetro</option>
                <option value="date">Fecha</option>
                <option value="both">Fecha y odómetro</option>
              </select>
            </label>
            {form.mode !== "date" && (
              <label>
                Intervalo desde odómetro actual
                <input
                  type="number"
                  min="1"
                  value={form.interval}
                  onChange={(e) =>
                    setForm({ ...form, interval: e.target.value })
                  }
                />
                <small>
                  Ejemplo: actual 10.000 + 5.000 = alerta a 15.000 km
                </small>
              </label>
            )}
            {form.mode !== "odometer" && (
              <label>
                Fecha objetivo
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  required
                />
              </label>
            )}
            <label>
              Notas
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <button className="primary" disabled={!selected.length}>
              Crear {selected.length || ""} recordatorio
              {selected.length === 1 ? "" : "s"}
            </button>
          </div>
        </form>
      )}
      <div className="metrics compact">
        <div className="metric">
          <div className="metric-icon orange">
            <Wrench />
          </div>
          <div>
            <span>Pendientes</span>
            <strong>{pending.length}</strong>
            <small>Recordatorios activos</small>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon red">
            <TriangleAlert />
          </div>
          <div>
            <span>Vencidos</span>
            <strong>{overdue}</strong>
            <small>Por fecha u odómetro</small>
          </div>
        </div>
      </div>
      <section className="panel table-wrap">
        <PanelHead
          title="Plan de mantenimiento"
          sub="Recordatorios calculados con vehicle.mileage actual"
        />
        <table>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Servicio</th>
              <th>Fecha</th>
              <th>Odómetro objetivo</th>
              <th>Notas</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.plate}</b>
                  <br />
                  <small>{x.chassis}</small>
                </td>
                <td>{x.type}</td>
                <td>
                  {x.dueDate
                    ? new Date(x.dueDate + "T00:00:00").toLocaleDateString(
                        "es-EC",
                      )
                    : "Por kilometraje"}
                </td>
                <td>
                  {x.dueOdometer
                    ? Number(x.dueOdometer).toLocaleString("es-EC") + " km"
                    : "—"}
                </td>
                <td>{x.notes || "—"}</td>
                <td>
                  <span
                    className={
                      "pill " +
                      (x.status === "Completado"
                        ? "disponible"
                        : "mantenimiento")
                    }
                  >
                    <i />
                    {x.status}
                  </span>
                </td>
                <td>
                  {x.status === "Pendiente" && (
                    <button className="link" onClick={() => complete(x.id)}>
                      Completar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function MaintenanceCenter() {
  const [items, setItems] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [expanded, setExpanded] = useState("");
  const [filters, setFilters] = useState({
    plate: "",
    client: "",
    chassis: "",
    category: "",
    criticality: "",
    status: "pending",
    mileage: "",
    alertBefore: "1000",
  });
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    type: "Cambio de aceite",
    mode: "odometer",
    dueDate: "",
    interval: "5000",
    notes: "",
  });
  const load = () =>
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((j) => setItems(j.items || []));
  useEffect(() => {
    load();
  }, []);
  const updateMaintenance = async (id: string, action: string, observation = "", extra = {}) => {
    const response = await fetch("/api/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, observation, ...extra }),
    });
    if (!response.ok) throw new Error((await response.json()).error || "No se pudo actualizar");
    await load();
  };
  const complete = async (item: any, current: number) => {
    const kmText = window.prompt("Kilometraje exacto en el que se realizó el mantenimiento:", String(current));
    if (kmText === null) return;
    const performedOdometer = Number(kmText);
    if (!Number.isFinite(performedOdometer) || performedOdometer < 0) return window.alert("Ingresa un kilometraje válido.");
    const serviceLocation = window.prompt("¿Dónde se realizó el mantenimiento? (taller, ciudad o proveedor):", "");
    if (serviceLocation === null) return;
    const observation = window.prompt("Observaciones y trabajos adicionales realizados (ej. cambio de pastillas):", "");
    if (observation === null) return;
    const frequency = Number(item.frequency || (item.dueOdometer ? Number(item.dueOdometer) - Number(item.lastMaintenanceOdometer || current) : 0));
    await updateMaintenance(item.id, "complete", observation, { performedOdometer, serviceLocation, frequency });
    setFilters((value) => ({ ...value, status: "pending" }));
  };
  const notDone = async (id: string) => {
    const observation = window.prompt("Indica por qué NO se realizó el mantenimiento:", "");
    if (!observation?.trim()) return;
    await updateMaintenance(id, "not_done", observation);
  };
  const removeMaintenance = async (id: string) => {
    const observation = window.prompt("Motivo para eliminar este mantenimiento (quedará en el histórico):", "");
    if (!observation?.trim()) return;
    await updateMaintenance(id, "delete", observation);
  };
  const reschedule = async (item: any, current: number) => {
    const intervalText = window.prompt("¿En cuántos kilómetros deseas volver a programarlo?", "5000");
    if (intervalText === null) return;
    const interval = Number(intervalText);
    if (!Number.isFinite(interval) || interval <= 0) return window.alert("Ingresa un intervalo válido mayor que cero.");
    const observation = window.prompt("Motivo u observación de la reprogramación:", "") ?? "";
    await updateMaintenance(item.id, "reschedule", observation, { dueOdometer: current + interval, dueDate: "", frequency: interval, lastMaintenanceOdometer: current });
    setFilters((value) => ({ ...value, status: "pending" }));
  };
  const editMaintenance = async (item: any) => {
    const manager = window.prompt("Gestor principal:", item.manager || "");
    if (manager === null) return;
    const lastMaintenanceDate = window.prompt("Fecha del último mantenimiento (AAAA-MM-DD):", item.lastMaintenanceDate || "");
    if (lastMaintenanceDate === null) return;
    const lastKmText = window.prompt("Kilometraje del último mantenimiento:", String(item.lastMaintenanceOdometer ?? ""));
    if (lastKmText === null) return;
    const frequencyText = window.prompt("Frecuencia de mantenimiento en kilómetros:", String(item.frequency ?? 5000));
    if (frequencyText === null) return;
    const lastMaintenanceOdometer = Number(lastKmText);
    const routineText = window.prompt("Ultima rutina realizada (kilometros de la rutina):", String(item.lastRoutine ?? item.lastMaintenanceOdometer ?? ""));
    if (routineText === null) return;
    const lastRoutine = Number(routineText);
    const frequency = Number(frequencyText);
    if (!Number.isFinite(lastMaintenanceOdometer) || lastMaintenanceOdometer < 0 || !Number.isFinite(frequency) || frequency <= 0) {
      return window.alert("Kilometraje o frecuencia no válidos.");
    }
    if (!Number.isFinite(lastRoutine) || lastRoutine < 0) return window.alert("La rutina no es valida.");
    await updateMaintenance(item.id, "edit", "Datos base editados manualmente", { manager, lastMaintenanceDate, lastMaintenanceOdometer, lastRoutine, frequency });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targets = vehicles.filter((v) => selected.includes(v.plate));
    if (!targets.length) return;
    setSaveState("saving");
    try {
      await Promise.all(
        targets.map(async (v) => {
          const response = await fetch("/api/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plate: v.plate,
            chassis: v.chassis,
            type: form.type,
            dueDate: form.mode !== "odometer" ? form.dueDate : "",
            dueOdometer:
              form.mode !== "date"
                ? Number(v.odometer || 0) + Number(form.interval || 0)
                : null,
            frequency: form.mode !== "date" ? Number(form.interval || 0) : null,
            lastMaintenanceOdometer: Number(v.odometer || 0),
            notes: form.notes,
          }),
          });
          if (!response.ok) throw new Error("No se pudo guardar el mantenimiento");
          return response.json();
        }),
      );
      await load();
      setSelected([]);
      setShowCreate(false);
      setFilters((current) => ({ ...current, status: "pending" }));
      setSaveState("success");
      window.setTimeout(() => setSaveState("idle"), 4000);
    } catch {
      setSaveState("error");
    }
  };
  const rows = items.map((item) => {
    const vehicle = vehicles.find((v) => v.plate === item.plate);
    const telemetryOdometer = Number(vehicle?.odometer || 0);
    const current = telemetryOdometer > 0
      ? telemetryOdometer
      : Number(item.lastMaintenanceOdometer || 0);
    const remaining = item.dueOdometer
      ? Number(item.dueOdometer) - current
      : null;
    const days = item.dueDate
      ? Math.ceil(
          (new Date(item.dueDate + "T23:59:59").getTime() - Date.now()) /
            86400000,
        )
      : null;
    const overdue =
      item.status === "Pendiente" &&
      ((remaining !== null && remaining <= 0) || (days !== null && days < 0));
    const upcoming =
      item.status === "Pendiente" &&
      !overdue &&
      ((remaining !== null && remaining <= Number(filters.alertBefore || 0)) ||
        (days !== null && days <= 30));
    const state =
      item.status === "Completado"
        ? "completed"
        : item.status === "No realizado"
          ? "not-done"
          : item.status === "Eliminado"
            ? "deleted"
        : overdue
          ? "overdue"
          : upcoming
            ? "upcoming"
            : "scheduled";
    const criticality =
      overdue ||
      (upcoming &&
        ((remaining !== null && remaining <= 250) ||
          (days !== null && days <= 7)))
        ? "high"
        : upcoming
          ? "medium"
          : "low";
    return { item, vehicle, current, remaining, days, state, criticality };
  });
  const visible = rows.filter(
    ({ item, vehicle, state, criticality, current }) => {
      const stateOk =
        filters.status === "pending"
          ? ["scheduled", "upcoming", "overdue"].includes(state)
          : !filters.status || state === filters.status;
      const km = Number(filters.mileage || 0);
      return (
        item.plate.toLowerCase().includes(filters.plate.toLowerCase()) &&
        (vehicle?.driver || "")
          .toLowerCase()
          .includes(filters.client.toLowerCase()) &&
        item.chassis.toLowerCase().includes(filters.chassis.toLowerCase()) &&
        (!filters.category || item.type === filters.category) &&
        (!filters.criticality || criticality === filters.criticality) &&
        stateOk &&
        (!filters.mileage || (current >= km && current < km + 5000))
      );
    },
  );
  const categories = [...new Set(items.map((x) => String(x.type)))];
  const choices = vehicles.filter((v) =>
    `${v.plate} ${v.brand} ${v.model} ${v.chassis}`
      .toLowerCase()
      .includes(vehicleSearch.toLowerCase()),
  );
  const clear = () =>
    setFilters({
      plate: "",
      client: "",
      chassis: "",
      category: "",
      criticality: "",
      status: "pending",
      mileage: "",
      alertBefore: "1000",
    });
  const labels: Record<string, string> = {
    overdue: "Vencido",
    upcoming: "Próximo",
    scheduled: "Programado",
    completed: "Completado",
    "not-done": "No realizado",
    deleted: "Eliminado",
  };
  const exportMaintenance = () => {
    const csv = [
      ["Placa", "Chasis", "Cliente", "Vehículo", "Gestor principal", "Último mantenimiento", "Último km", "Última rutina", "Frecuencia", "Mantenimiento", "Estado", "Odómetro actual", "Próxima rutina", "Kilómetros restantes", "Km realizado", "Lugar realizado", "Fecha objetivo", "Notas", "Trabajos/observaciones", "Creado", "Completado"],
      ...rows.map(({ item, vehicle, current, remaining, state }) => [item.plate, item.chassis, vehicle?.driver || item.client || "", vehicle ? `${vehicle.brand} ${vehicle.model}` : `${item.brand || ""} ${item.model || ""}`.trim(), item.manager || "", item.lastMaintenanceDate || "", item.lastMaintenanceOdometer ?? "", item.lastRoutine ?? "", item.frequency ?? "", item.type, labels[state], current, item.dueOdometer || "", remaining ?? "", item.performedOdometer ?? "", item.serviceLocation || "", item.dueDate || "", item.notes || "", item.closingObservation || "", item.createdAt || "", item.closedAt || ""]),
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `mantenimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const exportVehicleHistory = (plate: string) => {
    const vehicleRows = rows.filter(({ item }) => item.plate === plate);
    const csv = [
      ["Placa", "Fecha del mantenimiento", "Kilometraje realizado", "Rutina", "Tipo", "Estado", "Lugar", "Observaciones", "Frecuencia", "Proxima rutina"],
      ...vehicleRows.map(({ item, state }) => [item.plate, item.closedAt || item.lastMaintenanceDate || "", item.performedOdometer ?? item.lastMaintenanceOdometer ?? "", item.lastRoutine ?? "", item.type, labels[state], item.serviceLocation || "", item.closingObservation || item.notes || "", item.frequency ?? "", item.dueOdometer ?? ""]),
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `historial-mantenimiento-${plate}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="maintenance-center">
      <Title
        title="Mantenimiento"
        sub="Control preventivo basado en fecha y vehicle.mileage."
        action={
          <div className="maintenance-title-actions">
            <button className="secondary" onClick={exportMaintenance}>
              <Download /> Exportar CSV
            </button>
            <button className="primary" onClick={() => setShowCreate(!showCreate)}>
              <Plus /> Nuevo mantenimiento
            </button>
          </div>
        }
      />
      {saveState === "success" && (
        <div className="maintenance-feedback success">
          <CheckCircle2 /> Mantenimiento guardado. Ya aparece en el plan con su kilometraje restante.
        </div>
      )}
      {saveState === "error" && (
        <div className="maintenance-feedback error">
          <TriangleAlert /> No se pudo guardar. Revisa la conexión e inténtalo nuevamente.
        </div>
      )}
      {showCreate && (
        <form className="panel maintenance-create" onSubmit={submit}>
          <div className="vehicle-picker">
            <label>Seleccionar uno o varios vehículos</label>
            <div className="client-search">
              <Search />
              <input
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Placa, marca, modelo o chasis"
              />
            </div>
            <div className="vehicle-options">
              {choices.slice(0, 80).map((v) => (
                <label
                  key={v.id}
                  className={selected.includes(v.plate) ? "selected" : ""}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(v.plate)}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(v.plate)
                          ? s.filter((x) => x !== v.plate)
                          : [...s, v.plate],
                      )
                    }
                  />
                  <span>
                    <b>{v.plate}</b>
                    <small>
                      {v.brand} {v.model} · {v.odometer.toLocaleString("es-EC")}{" "}
                      km
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <small>{selected.length} vehículos seleccionados</small>
          </div>
          <div className="maintenance-fields">
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option>Cambio de aceite</option>
                <option>Filtros</option>
                <option>Frenos</option>
                <option>Neumáticos</option>
                <option>Revisión general</option>
                <option>Matrícula / documentos</option>
              </select>
            </label>
            <label>
              Recordatorio por
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="odometer">Odómetro</option>
                <option value="date">Fecha</option>
                <option value="both">Fecha y odómetro</option>
              </select>
            </label>
            {form.mode !== "date" && (
              <label>
                Intervalo desde odómetro actual
                <input
                  type="number"
                  min="1"
                  value={form.interval}
                  onChange={(e) =>
                    setForm({ ...form, interval: e.target.value })
                  }
                />
              </label>
            )}
            {form.mode !== "odometer" && (
              <label>
                Fecha objetivo
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Notas
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <button className="primary" disabled={!selected.length || saveState === "saving"}>
              {saveState === "saving"
                ? "Guardando..."
                : `Guardar ${selected.length || ""} recordatorio${selected.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      )}
      <section className="maintenance-query panel">
        <div className="maintenance-query-head">
          <div>
            <h2>Mantenimientos por vehículo</h2>
            <p>
              Filtra la flota y revisa próximos, vencidos, programados o
              completados.
            </p>
          </div>
          <span>
            <Wrench /> {visible.length} resultados
          </span>
        </div>
        <div className="maintenance-filter-grid">
          <label>
            Placa
            <input
              value={filters.plate}
              onChange={(e) =>
                setFilters({ ...filters, plate: e.target.value })
              }
              placeholder="Ej. PFJ5962"
            />
          </label>
          <label>
            Cliente
            <input
              value={filters.client}
              onChange={(e) =>
                setFilters({ ...filters, client: e.target.value })
              }
            />
          </label>
          <label>
            Chasis
            <input
              value={filters.chassis}
              onChange={(e) =>
                setFilters({ ...filters, chassis: e.target.value })
              }
            />
          </label>
          <label>
            Categoría
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
            >
              <option value="">Todas</option>
              {categories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Criticidad
            <select
              value={filters.criticality}
              onChange={(e) =>
                setFilters({ ...filters, criticality: e.target.value })
              }
            >
              <option value="">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="pending">Todos los pendientes</option>
              <option value="upcoming">Próximos</option>
              <option value="overdue">Vencidos</option>
              <option value="scheduled">Programados</option>
              <option value="completed">Completados</option>
              <option value="not-done">No realizados</option>
              <option value="deleted">Eliminados</option>
              <option value="">Todos</option>
            </select>
          </label>
          <label>
            Rango de kilometraje
            <select
              value={filters.mileage}
              onChange={(e) =>
                setFilters({ ...filters, mileage: e.target.value })
              }
            >
              <option value="">Todos</option>
              {[
                0, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000,
                50000, 75000, 100000,
              ].map((x) => (
                <option value={x} key={x}>
                  {x.toLocaleString("es-EC")}–
                  {(x + 4999).toLocaleString("es-EC")} km
                </option>
              ))}
            </select>
          </label>
          <label>
            Alertar antes de
            <input
              type="number"
              min="0"
              value={filters.alertBefore}
              onChange={(e) =>
                setFilters({ ...filters, alertBefore: e.target.value })
              }
            />
            <small>kilómetros</small>
          </label>
          <button
            type="button"
            className="secondary maintenance-clear"
            onClick={clear}
          >
            <X /> Limpiar
          </button>
        </div>
      </section>
      <section className="panel maintenance-results">
        <div className="maintenance-results-head">
          <div>
            <span>PLAN DE MANTENIMIENTO</span>
            <h2>
              {visible.length} vehículo{visible.length === 1 ? "" : "s"}
            </h2>
          </div>
          <div className="maintenance-legend">
            <i className="overdue" /> Vencido <i className="upcoming" /> Próximo{" "}
            <i className="scheduled" /> Programado
          </div>
        </div>
        <div className="maintenance-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Placa / cliente</th>
                <th>Vehículo</th>
                <th>Odómetro</th>
                <th>Última rutina</th>
                <th>Kilometraje restante</th>
                <th>Mantenimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(
                ({
                  item,
                  vehicle,
                  current,
                  remaining,
                  days,
                  state,
                  criticality,
                }) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td>
                        <span className={`maintenance-state ${state}`}>
                          {labels[state]}
                        </span>
                        <small className={`criticality ${criticality}`}>
                          {remaining !== null
                            ? remaining <= 0
                              ? `${Math.abs(remaining).toLocaleString("es-EC")} km vencido`
                              : `faltan ${remaining.toLocaleString("es-EC")} km`
                            : days !== null
                              ? days < 0
                                ? `${Math.abs(days)} días vencido`
                                : `faltan ${days} días`
                              : "Sin objetivo"}
                        </small>
                      </td>
                      <td>
                        <b>{item.plate}</b>
                        <small>
                          {vehicle?.driver || item.client || "Cliente no identificado"}
                        </small>
                      </td>
                      <td>
                        <span>
                          {vehicle
                            ? `${vehicle.brand} ${vehicle.model}`
                            : `${item.brand || ""} ${item.model || ""}`.trim() || "Vehículo no encontrado"}
                        </span>
                        <small>{item.chassis}</small>
                      </td>
                      <td>
                        <b>{current.toLocaleString("es-EC")} km</b>
                        <small>vehicle.mileage actual</small>
                      </td>
                      <td>
                        <b>{item.lastRoutine != null ? `${Number(item.lastRoutine).toLocaleString("es-EC")} km` : "Sin registro"}</b>
                        <small>{item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate + "T00:00:00").toLocaleDateString("es-EC") : "Sin fecha"}</small>
                      </td>
                      <td>
                        {remaining !== null ? (
                          <b className={`maintenance-remaining ${remaining <= 0 ? "overdue" : ""}`}>
                            {remaining <= 0
                              ? `${Math.abs(remaining).toLocaleString("es-EC")} km vencido`
                              : `Faltan ${remaining.toLocaleString("es-EC")} km`}
                          </b>
                        ) : (
                          <span>No aplica</span>
                        )}
                        {item.dueOdometer && (
                          <small>Meta: {Number(item.dueOdometer).toLocaleString("es-EC")} km</small>
                        )}
                      </td>
                      <td>
                        <b>{item.type}</b>
                        <small>
                          {item.dueOdometer
                            ? `Objetivo ${Number(item.dueOdometer).toLocaleString("es-EC")} km`
                            : item.dueDate
                              ? `Fecha ${new Date(item.dueDate + "T00:00:00").toLocaleDateString("es-EC")}`
                              : "Sin objetivo"}
                        </small>
                      </td>
                      <td>
                        <div className="maintenance-actions">
                          {item.status === "Pendiente" && (
                            <>
                              <button className="maintenance-done" onClick={() => complete(item, current)}>
                                <CheckCircle2 /> Completar
                              </button>
                              <button className="secondary maintenance-not-done" onClick={() => notDone(item.id)}>
                                No realizado
                              </button>
                              <button className="secondary" onClick={() => reschedule(item, current)}>
                                Reprogramar
                              </button>
                              <button className="secondary maintenance-delete" onClick={() => removeMaintenance(item.id)}>
                                Eliminar
                              </button>
                            </>
                          )}
                          {item.status !== "Pendiente" && item.status !== "Eliminado" && (
                            <button className="secondary" onClick={() => reschedule(item, current)}>
                              Reprogramar
                            </button>
                          )}
                          <button
                            className="secondary"
                            onClick={() =>
                              setExpanded(expanded === item.id ? "" : item.id)
                            }
                          >
                            {expanded === item.id ? "Cerrar" : "Detalle"}
                          </button>
                          <button className="secondary" onClick={() => editMaintenance(item)}>
                            Editar
                          </button>
                          <button className="secondary" onClick={() => exportVehicleHistory(item.plate)}>
                            <Download /> Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === item.id && (
                      <tr className="maintenance-detail-row">
                        <td colSpan={8}>
                          <div>
                            <span>
                              <b>Notas</b>
                              {item.notes || "Sin notas"}
                            </span>
                            <span>
                              <b>Fecha programada</b>
                              {item.dueDate
                                ? new Date(
                                    item.dueDate + "T00:00:00",
                                  ).toLocaleDateString("es-EC")
                                : "No aplica"}
                            </span>
                            <span>
                              <b>Estado de señal</b>
                              {vehicle?.status || "Sin dato"}
                            </span>
                            <span>
                              <b>Última posición</b>
                              {vehicle?.city || "Sin ubicación"}
                            </span>
                            <span>
                              <b>Observación de cierre</b>
                              {item.closingObservation || "Sin observación"}
                            </span>
                            <span>
                              <b>Realizado en</b>
                              {item.performedOdometer != null
                                ? `${Number(item.performedOdometer).toLocaleString("es-EC")} km · ${item.serviceLocation || "Lugar no indicado"}`
                                : "Aún no completado"}
                            </span>
                            <span>
                              <b>Mantenimientos completados del vehículo</b>
                              {items.filter((record) => record.plate === item.plate && record.status === "Completado").length}
                            </span>
                            <span>
                              <b>Gestor principal</b>
                              {item.manager || "Sin gestor"}
                            </span>
                            <span>
                              <b>Último mantenimiento</b>
                              {item.lastMaintenanceDate
                                ? new Date(item.lastMaintenanceDate + "T00:00:00").toLocaleDateString("es-EC")
                                : "Sin fecha"}
                            </span>
                            <span>
                              <b>Último km / frecuencia</b>
                              {item.lastMaintenanceOdometer != null
                                ? `${Number(item.lastMaintenanceOdometer).toLocaleString("es-EC")} km + ${Number(item.frequency || 0).toLocaleString("es-EC")} km`
                                : "Sin datos base"}
                            </span>
                            <span>
                              <b>Última rutina</b>
                              {item.lastRoutine != null
                                ? `${Number(item.lastRoutine).toLocaleString("es-EC")} km`
                                : "Sin rutina registrada"}
                            </span>
                            <span className="maintenance-history">
                              <b>Histórico de acciones</b>
                              {(item.history || []).length
                                ? item.history.map((event: any, index: number) => (
                                    <small key={`${event.at}-${index}`}>
                                      {new Date(event.at).toLocaleString("es-EC")} · {event.action}
                                      {event.observation ? ` · ${event.observation}` : ""}
                                    </small>
                                  ))
                                : "Registro anterior sin eventos detallados"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ),
              )}
            </tbody>
          </table>
          {!visible.length && (
            <div className="maintenance-empty">
              <Wrench />
              <h3>No hay mantenimientos con estos filtros</h3>
              <p>Ajusta el estado, kilometraje o alerta anticipada.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const durationText = (ms: number) => {
  const min = Math.round(ms / 60000);
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};
const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("es-EC") : "Sin viajes";
function Reports() {
  const [from, setFrom] = useState("2026-11-05");
  const [to, setTo] = useState("2026-11-05");
  const [owner, setOwner] = useState("");
  const [plate, setPlate] = useState("");
  const [chassis, setChassis] = useState("");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = () => {
    setLoading(true);
    setError("");
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    fetch(
      `/api/analytics?from=${encodeURIComponent(new Date(`${from}T00:00:00`).toISOString())}&to=${encodeURIComponent(end.toISOString())}&owner=${encodeURIComponent(owner)}`,
    )
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "No se pudo generar");
        return j;
      })
      .then((j) => {
        setRows(j.rows);
        setOwners(j.owners);
        setSummary(j.summary);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(run, []);
  const filteredRows = rows.filter(
    (r) =>
      r.plate.toLowerCase().includes(plate.toLowerCase()) &&
      r.chassis.toLowerCase().includes(chassis.toLowerCase()),
  );
  const exportReport = () =>
    exportExcel(
      `rent-reportes-${from}-${to}`,
      [
        "Placa",
        "Chasis",
        "Marca",
        "Modelo",
        "Cliente",
        "Agencia",
        "Estado",
        "Viajes",
        "Primer viaje",
        "Último viaje",
        "Distancia km",
        "Tiempo de recorrido",
        "Odómetro inicial km",
        "Odómetro final km",
        "Velocidad máxima km/h",
      ],
      filteredRows.map((r) => [
        r.plate,
        r.chassis,
        r.brand,
        r.model,
        r.owner,
        r.agency,
        r.status,
        r.tripCount,
        dateTime(r.firstTrip),
        dateTime(r.lastTrip),
        r.distanceKm,
        durationText(r.durationMs),
        r.startOdometerKm ?? "",
        r.endOdometerKm ?? "",
        r.maxSpeedKmh,
      ]),
    );
  return (
    <>
      <Title
        title="Analítica y posventa"
        sub="Viajes, kilometraje, odómetros y conectividad por vehículo y cliente."
        action={
          <button
            className="primary"
            onClick={exportReport}
            disabled={!filteredRows.length}
          >
            <Download /> Descargar Excel
          </button>
        }
      />
      <div className="report-filter">
        <div>
          <label>Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label>Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label>Cliente</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Todos los clientes</option>
            {owners.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Placa</label>
          <input
            placeholder="Filtrar placa"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
        </div>
        <div>
          <label>Chasis</label>
          <input
            placeholder="Filtrar chasis"
            value={chassis}
            onChange={(e) => setChassis(e.target.value)}
          />
        </div>
        <button className="primary" onClick={run} disabled={loading}>
          {loading ? "Consultando..." : "Generar reporte"}
        </button>
      </div>
      {error && (
        <div className="notice">
          <TriangleAlert />
          <div>
            <b>No se pudo generar el reporte</b>
            <p>{error}</p>
          </div>
        </div>
      )}
      {summary && (
        <div className="metrics compact">
          <div className="metric">
            <div className="metric-icon blue">
              <Car />
            </div>
            <div>
              <span>Vehículos</span>
              <strong>{filteredRows.length}</strong>
              <small>Resultado filtrado</small>
            </div>
          </div>
          <div className="metric">
            <div className="metric-icon violet">
              <MapPin />
            </div>
            <div>
              <span>Viajes</span>
              <strong>
                {filteredRows.reduce((s, r) => s + r.tripCount, 0)}
              </strong>
              <small>En el período</small>
            </div>
          </div>
          <div className="metric">
            <div className="metric-icon green">
              <Gauge />
            </div>
            <div>
              <span>Distancia</span>
              <strong>
                {filteredRows
                  .reduce((s, r) => s + r.distanceKm, 0)
                  .toLocaleString("es-EC")}{" "}
                km
              </strong>
              <small>Recorrido total</small>
            </div>
          </div>
          <div className="metric">
            <div className="metric-icon red">
              <Radio />
            </div>
            <div>
              <span>Fuera de línea</span>
              <strong>
                {filteredRows.filter((r) => r.status === "Sin señal").length}
              </strong>
              <small>Estado actual</small>
            </div>
          </div>
        </div>
      )}
      <section className="panel table-wrap">
        <PanelHead
          title="Detalle por vehículo"
          sub="El tiempo corresponde a lo que demoró en recorrer la distancia indicada"
        />
        <table>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Vehículo</th>
              <th>Cliente</th>
              <th>Chasis</th>
              <th>Estado</th>
              <th>Viajes</th>
              <th>Primer viaje</th>
              <th>Último viaje</th>
              <th>Distancia</th>
              <th>Tiempo de recorrido</th>
              <th>Odómetro inicial</th>
              <th>Odómetro final</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.chassis}>
                <td>
                  <b>{r.plate}</b>
                </td>
                <td>
                  {r.brand} {r.model}
                </td>
                <td>{r.owner}</td>
                <td>{r.chassis}</td>
                <td>
                  <span className={"pill " + statusClass(r.status)}>
                    <i />
                    {r.status}
                  </span>
                </td>
                <td>{r.tripCount}</td>
                <td>{dateTime(r.firstTrip)}</td>
                <td>{dateTime(r.lastTrip)}</td>
                <td>{r.distanceKm.toLocaleString("es-EC")} km</td>
                <td>{durationText(r.durationMs)}</td>
                <td>{r.startOdometerKm?.toLocaleString("es-EC") ?? "—"}</td>
                <td>{r.endOdometerKm?.toLocaleString("es-EC") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function Config() {
  return (
    <>
      <Title
        title="Configuración"
        sub="Organización, usuarios e integraciones de la plataforma."
      />
      <div className="settings-grid">
        <section className="panel settings-nav">
          <button className="active">
            <Building2 /> Organización
          </button>
          <button>
            <Users /> Usuarios y roles
          </button>
          <button>
            <Radio /> Proveedores de telemetría
          </button>
          <button>
            <ShieldCheck /> Seguridad y auditoría
          </button>
          <button>
            <Database /> Retención de datos
          </button>
        </section>
        <section className="panel config-main">
          <h2>Proveedores de telemetría</h2>
          <p>
            Las conexiones están preparadas pero desactivadas durante el modo
            demo.
          </p>
          <Provider
            name="Flespi"
            desc="Telemetría actual, mensajes históricos y viajes"
          />
          <Provider
            name="Traccar"
            desc="Dispositivos, posiciones, reportes y eventos"
          />
          <div className="notice">
            <ShieldCheck />
            <div>
              <b>Credenciales protegidas</b>
              <p>
                Los tokens y contraseñas se configurarán únicamente mediante
                variables de entorno y nunca se enviarán al navegador.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function Provider({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="provider">
      <div className="provider-logo">{name[0]}</div>
      <div>
        <b>{name}</b>
        <p>{desc}</p>
      </div>
      <span className="pill mantenimiento">
        <i />
        No conectado
      </span>
      <button className="secondary">Configurar</button>
    </div>
  );
}
function VehicleDetail({ v, back }: { v: Vehicle; back: () => void }) {
  const lastSignal =
    v.lastSeen && v.lastSeen !== "Sin telemetría"
      ? new Date(v.lastSeen).toLocaleString("es-EC")
      : "Sin comunicación";
  return (
    <>
      <button className="back" onClick={back}>
        ← Volver a la flota
      </button>
      <div className="vehicle-hero">
        <div className="big-car">
          <Car />
        </div>
        <div>
          <span className={"pill " + statusClass(v.status)}>
            <i />
            {v.status}
          </span>
          <h1>
            {v.brand} {v.model}
          </h1>
          <p>
            {v.plate} · {v.branch}
          </p>
          <small>Chasis: {v.chassis}</small>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <PanelHead
            title="Cliente / propietario"
            sub={v.ownerId || "Sin identificación"}
          />
          <div className="telemetry-grid">
            <Stat I={Users} label="Nombre" value={v.driver} />
            <Stat I={Building2} label="Agencia" value={v.branch} />
            <Stat I={Car} label="Color" value={v.color || "No registrado"} />
            <Stat
              I={Gauge}
              label="Odómetro actual"
              value={
                v.odometer
                  ? `${v.odometer.toLocaleString("es-EC")} km`
                  : "Sin dato en Traccar"
              }
            />
          </div>
        </section>
        <section className="panel">
          <PanelHead
            title="Telemetría Traccar"
            sub={`Última actualización: ${lastSignal}`}
          />
          <div className="telemetry-grid">
            <Stat I={Radio} label="Estado de señal" value={v.status} />
            <Stat
              I={Gauge}
              label="Velocidad actual"
              value={`${v.speed} km/h`}
            />
            <Stat I={Radio} label="IMEI" value={v.imei || "Sin equipo"} />
            <Stat
              I={Database}
              label="ID Traccar"
              value={v.idTraccar || "No registrado"}
            />
          </div>
        </section>
      </div>
    </>
  );
}
function Stat({
  I,
  label,
  value,
}: {
  I: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        <I />
        {label}
      </span>
      <b>{value}</b>
    </div>
  );
}
function EmptyTab({ tab }: { tab: string }) {
  return (
    <section className="panel empty-state">
      <CheckCircle2 />
      <h2>Módulo de {tab} preparado</h2>
      <p>
        En el demo esta sección muestra la estructura visual. Los datos reales
        aparecerán cuando se habilite el backend y la sincronización.
      </p>
      <button className="secondary">Ver datos de demostración</button>
    </section>
  );
}
const firebaseError = (code: string) =>
  ({
    "auth/email-already-in-use": "Este correo ya esta registrado.",
    "auth/invalid-email": "Ingresa un correo electronico valido.",
    "auth/invalid-credential": "Correo o contrasena incorrectos.",
    "auth/weak-password": "La contrasena debe tener al menos 6 caracteres.",
    "auth/operation-not-allowed":
      "Activa Correo/Contrasena en Firebase Authentication.",
    "auth/too-many-requests":
      "Demasiados intentos. Intenta nuevamente mas tarde.",
  })[code];
function FirebaseLogin({ onSuccess }: { onSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );
        if (name.trim())
          await updateProfile(credential.user, { displayName: name.trim() });
        await signOut(firebaseAuth);
        setMode("login");
        setPassword("");
        setNotice(
          "Cuenta creada correctamente. Ahora inicia sesion con tu correo y contrasena.",
        );
        return;
      }
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name: credential.user.displayName }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No se pudo iniciar la sesion.");
      onSuccess(result.user);
    } catch (reason: any) {
      setError(
        reason?.code
          ? firebaseError(reason.code) || reason.message
          : reason.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const change = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setNotice("");
  };
  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <img src="/rent-brand.png" alt="Rent" />
      </div>
      <form className="auth-card" onSubmit={submit}>
        <span>PLATAFORMA DE FLOTA</span>
        <h1>{mode === "login" ? "Bienvenido a Rent" : "Crea tu cuenta"}</h1>
        <p>
          {mode === "login"
            ? "Accede al centro de control de tu flota."
            : "Crea tu acceso a la plataforma de flota."}
        </p>
        <div className="auth-switch" role="tablist">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => change("login")}
          >
            Ingresar
          </button>
        </div>
        {mode === "register" && (
          <label>
            Nombre completo
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
            />
          </label>
        )}
        <label>
          Correo electronico
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={mode === "login"}
            autoComplete="email"
            placeholder="nombre@empresa.com"
          />
        </label>
        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        </label>
        {notice && <div className="auth-success">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy
            ? "Conectando..."
            : mode === "login"
              ? "Ingresar"
              : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
function FirebaseAccessManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");
  const load = () =>
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((j) => setUsers(j.users || []));
  useEffect(() => {
    load();
  }, []);
  const changeRole = async (user: any, role: string) => {
    setSaving(user.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/auth/users/${encodeURIComponent(user.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? result.user : item)),
      );
      setMessage(`Rol de ${user.name} actualizado.`);
    } catch (reason: any) {
      setMessage(reason.message);
    } finally {
      setSaving("");
    }
  };
  return (
    <>
      <Title
        title="Administracion de accesos"
        sub="Cuentas autenticadas con Firebase."
      />
      <div className="access-grid firebase-access">
        <section className="panel firebase-info">
          <ShieldCheck />
          <div>
            <h2>Control de roles</h2>
            <p>
              Los usuarios se registran con Firebase y entran inicialmente como{" "}
              <b>Solo consulta</b>. Un administrador puede habilitarlos como
              administradores desde esta tabla.
            </p>
            <small>
              El sistema siempre conserva al menos un administrador activo.
            </small>
            {message && <div className="role-message">{message}</div>}
          </div>
        </section>
        <section className="panel table-wrap">
          <PanelHead
            title="Usuarios habilitados"
            sub={`${users.length} accesos registrados`}
          />
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Proveedor</th>
                <th>Rol y permisos</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                  </td>
                  <td>{u.email || u.username}</td>
                  <td>{u.provider || "Local"}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      disabled={saving === u.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="viewer">Solo consulta</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("es-EC")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
