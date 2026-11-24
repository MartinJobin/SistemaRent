import type { IncomingMessage, ServerResponse } from 'node:http';
import mysql from 'mysql2/promise';

type Env = Record<string, string>;
type Row = mysql.RowDataPacket;
type Vehicle = Record<string, any>;
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_VIEW'];

export function createFleetApi(env: Env) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Faltan variables: ${missing.join(', ')}`);
  if (!/^[A-Za-z0-9_]+$/.test(env.DB_NAME) || !/^[A-Za-z0-9_]+$/.test(env.DB_VIEW)) throw new Error('Nombre de origen inválido.');
  const pool = mysql.createPool({ host: env.DB_HOST, port: Number(env.DB_PORT), database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, ssl: { rejectUnauthorized: false }, waitForConnections: true, connectionLimit: 5 });
  const source = `\`${env.DB_NAME}\`.\`${env.DB_VIEW}\``;
  const traccarBase = env.TRACCAR_URL?.replace(/\/+$/, '').replace(/\/api$/, '');
  const traccarHeaders = env.TRACCAR_USER && env.TRACCAR_PASSWORD ? { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${env.TRACCAR_USER}:${env.TRACCAR_PASSWORD}`).toString('base64')}` } : null;
  let cache: { expires: number; devices: any[]; positions: any[] } | null = null;
  let flespiCache: { expires:number; telemetry:any[] } | null = null;

  async function loadInventory(): Promise<Vehicle[]> {
    const [rows] = await pool.query<Row[]>(`SELECT Cedula, Nombre, Agencia, Plataforma, Chasis, Marca, Placa, Modelo, Color, IMEI, SIM, IdFlespi, IdTraccar, Inicio_Servicio, Fin_Servicio FROM ${source} ORDER BY Chasis`);
    const unique = new Map<string, Row>();
    for (const row of rows) if (!unique.has(String(row.Chasis))) unique.set(String(row.Chasis), row);
    return [...unique.values()].map((row) => ({
      id: String(row.Chasis), chassis: String(row.Chasis), plate: row.Placa ? String(row.Placa) : 'Sin placa', brand: row.Marca ? String(row.Marca) : 'Sin marca', model: String(row.Modelo), year: 0,
      branch: String(row.Agencia), status: 'Sin señal', driver: String(row.Nombre), ownerId: row.Cedula ? String(row.Cedula) : '', color: String(row.Color),
      imei: row.IMEI ? String(row.IMEI) : '', sim: row.SIM ? String(row.SIM) : '', idFlespi: row.IdFlespi ? String(row.IdFlespi) : '', idTraccar: row.IdTraccar ? String(row.IdTraccar) : '',
      serviceStart: row.Inicio_Servicio ? String(row.Inicio_Servicio) : '', serviceEnd: row.Fin_Servicio ? String(row.Fin_Servicio) : '', lat: null, lng: null, speed: 0, ignition: false,
      lastSeen: 'Sin telemetría', odometer: 0, fuel: 0, provider: row.Plataforma ? String(row.Plataforma) : 'Sin plataforma', nextService: 0, cost: 0,
    }));
  }

  async function loadTraccar() {
    if (!traccarBase || !traccarHeaders) return { devices: [], positions: [] };
    if (cache && cache.expires > Date.now()) return cache;
    const [dr, pr] = await Promise.all([fetch(`${traccarBase}/api/devices`, { headers: traccarHeaders }), fetch(`${traccarBase}/api/positions`, { headers: traccarHeaders })]);
    if (!dr.ok || !pr.ok) throw new Error(`Traccar ${dr.status}/${pr.status}`);
    cache = { expires: Date.now() + 30_000, devices: await dr.json(), positions: await pr.json() };
    return cache;
  }

  async function loadFlespi(vehicles:Vehicle[]){
    if(!env.FLESPI_TOKEN)return [];
    if(flespiCache&&flespiCache.expires>Date.now())return flespiCache.telemetry;
    const ids=vehicles.map(v=>v.idFlespi).filter(Boolean);
    if(!ids.length)return [];
    const response=await fetch(`https://flespi.io/gw/devices/${ids.join(',')}/telemetry/position,position.latitude,position.longitude,position.speed,vehicle.mileage,timestamp`,{headers:{Authorization:`FlespiToken ${env.FLESPI_TOKEN}`,Accept:'application/json'}});
    if(!response.ok)throw new Error(`Flespi ${response.status}`);
    const data=await response.json();flespiCache={expires:Date.now()+30_000,telemetry:data.result||[]};return flespiCache.telemetry;
  }

  function inferCity(lat?:number,lng?:number,address?:string){
    const known=['Guayaquil','Quito','Cuenca','Manta','Ambato','Machala','Portoviejo','Loja','Santo Domingo','Durán'];
    const inAddress=known.find(city=>address?.toLowerCase().includes(city.toLowerCase()));
    if(inAddress)return inAddress;
    if(lat==null||lng==null)return 'Sin posición histórica';
    const cities=[['Guayaquil',-2.1709,-79.9224],['Quito',-0.1807,-78.4678],['Cuenca',-2.9001,-79.0059],['Manta',-0.9677,-80.7089],['Ambato',-1.2491,-78.6168],['Machala',-3.2581,-79.9554],['Portoviejo',-1.0546,-80.4545],['Loja',-3.9931,-79.2042],['Santo Domingo',-0.2531,-79.1754],['Durán',-2.1709,-79.8399]] as const;
    const distance=(a:number,b:number,c:number,d:number)=>{const r=6371,toRad=(x:number)=>x*Math.PI/180;const dLat=toRad(c-a),dLng=toRad(d-b);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLng/2)**2;return 2*r*Math.asin(Math.sqrt(q))};
    const nearest=cities.map(([name,cLat,cLng])=>({name,km:distance(lat,lng,cLat,cLng)})).sort((a,b)=>a.km-b.km)[0];
    return nearest.km<=80?nearest.name:'Otra zona';
  }

  function joinTelemetry(vehicles: Vehicle[], devices: any[], positions: any[], flespiTelemetry:any[]) {
    const byId = new Map(devices.map((d) => [String(d.id), d]));
    const byUnique = new Map(devices.map((d) => [String(d.uniqueId), d]));
    const byDevice = new Map(positions.map((p) => [String(p.deviceId), p]));
    const flespiById=new Map(flespiTelemetry.map(x=>[String(x.id),x.telemetry||{}]));
    return vehicles.map((v) => {
      const device: any = byId.get(v.idTraccar) || byUnique.get(v.imei);
      const position: any = device ? byDevice.get(String(device.id)) : undefined;
      const attrs = position?.attributes || {};
      const flespi:any=flespiById.get(String(v.idFlespi));const fp=flespi?.position?.value||{};const fLat=flespi?.['position.latitude']?.value??fp.latitude;const fLng=flespi?.['position.longitude']?.value??fp.longitude;const fTs=flespi?.timestamp?.value||flespi?.position?.ts;const lat=position?.latitude??fLat??null;const lng=position?.longitude??fLng??null;const flespiOnline=fTs?Date.now()/1000-Number(fTs)<600:false;
      return { ...v, traccarDeviceId: device?.id || null, telemetryLinked: Boolean(device||flespi), locationSource:position?'Traccar':fLat!=null?'Flespi':'Sin fuente',status: device?.status === 'online'||(!device&&flespiOnline) ? 'En línea' : 'Sin señal',
        lat, lng, speed: position ? Math.round(Number(position.speed || 0) * 1.852) : Math.round(Number(flespi?.['position.speed']?.value??fp.speed??0)),
        city: inferCity(lat,lng,position?.address), address: position?.address || '', ignition: Boolean(attrs.ignition), lastSeen: device?.lastUpdate || position?.fixTime || (fTs?new Date(Number(fTs)*1000).toISOString():'Sin telemetría'),
        odometer: attrs['vehicle.mileage'] != null ? Number(Number(attrs['vehicle.mileage']).toFixed(1)) : flespi?.['vehicle.mileage']?.value!=null?Number(Number(flespi['vehicle.mileage'].value).toFixed(1)):0 };
    });
  }

  async function loadFleet() { const inventory = await loadInventory(); const [telemetry,flespi]=await Promise.all([loadTraccar(),loadFlespi(inventory).catch(error=>{console.warn('Respaldo Flespi no disponible:',error instanceof Error?error.message:error);return []})]); return joinTelemetry(inventory, telemetry.devices, telemetry.positions,flespi); }

  async function fetchTrips(ids: number[], from: string, to: string) {
    if (!traccarBase || !traccarHeaders || !ids.length) return [];
    const batches: number[][] = []; for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
    return (await Promise.all(batches.map(async (batch) => { const params = new URLSearchParams({ from, to }); batch.forEach((id) => params.append('deviceId', String(id)));
      const response = await fetch(`${traccarBase}/api/reports/trips?${params}`, { headers: traccarHeaders }); if (!response.ok) throw new Error(`Reporte Traccar ${response.status}`); return response.json(); }))).flat();
  }

  function send(res: ServerResponse, status: number, body: unknown) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }

  return async function fleetApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!['/api/fleet', '/api/analytics'].includes(url.pathname)) return next();
    try {
      const vehicles = await loadFleet();
      if (url.pathname === '/api/fleet') return send(res, 200, { vehicles, summary: { totalVehicles: vehicles.length, totalClients: new Set(vehicles.map((v) => v.ownerId).filter(Boolean)).size, withImei: vehicles.filter((v) => v.imei).length, linked: vehicles.filter((v) => v.telemetryLinked).length, online: vehicles.filter((v) => v.status === 'En línea').length, offline: vehicles.filter((v) => v.status === 'Sin señal').length } });
      const from = url.searchParams.get('from'); const to = url.searchParams.get('to'); const owner = url.searchParams.get('owner') || '';
      if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return send(res, 400, { error: 'Rango de fechas inválido.' });
      const span = Date.parse(to) - Date.parse(from); if (span <= 0 || span > 31 * 86_400_000) return send(res, 400, { error: 'El rango debe ser de 1 a 31 días.' });
      const selected = vehicles.filter((v) => !owner || v.driver === owner); const ids = selected.map((v) => Number(v.traccarDeviceId)).filter(Number.isFinite);
      const trips = await fetchTrips(ids, from, to); const grouped = new Map<number, any[]>();
      for (const trip of trips) grouped.set(Number(trip.deviceId), [...(grouped.get(Number(trip.deviceId)) || []), trip]);
      const rows = selected.map((v) => { const list = (grouped.get(Number(v.traccarDeviceId)) || []).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)); const first = list[0]; const last = list.at(-1);
        return { chassis: v.chassis, plate: v.plate, brand: v.brand, model: v.model, owner: v.driver, agency: v.branch, status: v.status, lastSeen: v.lastSeen, tripCount: list.length,
          firstTrip: first?.startTime || null, lastTrip: last?.endTime || null, distanceKm: Number((list.reduce((sum, trip) => sum + Number(trip.distance || 0), 0) / 1000).toFixed(2)),
          durationMs: list.reduce((sum, trip) => sum + Number(trip.duration || 0), 0), startOdometerKm: first ? Number((Number(first.startOdometer || 0) / 1000).toFixed(2)) : null,
          endOdometerKm: last ? Number((Number(last.endOdometer || 0) / 1000).toFixed(2)) : null, maxSpeedKmh: Number((Math.max(0, ...list.map((trip) => Number(trip.maxSpeed || 0))) * 1.852).toFixed(1)) };
      });
      send(res, 200, { rows, owners: [...new Set(vehicles.map((v) => v.driver))].sort(), summary: { vehicles: rows.length, withTrips: rows.filter((r) => r.tripCount).length, offline: rows.filter((r) => r.status === 'Sin señal').length, trips: rows.reduce((sum, r) => sum + r.tripCount, 0), distanceKm: Number(rows.reduce((sum, r) => sum + r.distanceKm, 0).toFixed(2)) } });
    } catch (error) { console.error('API RentCar:', error instanceof Error ? error.message : error); send(res, 500, { error: 'No fue posible consultar las fuentes de datos.' }); }
  };
}
