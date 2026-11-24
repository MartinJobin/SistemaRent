import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { readJson, writeJson } from "./blob-store.ts";

type MaintenanceStatus = "Pendiente" | "Completado" | "No realizado" | "Eliminado";
type HistoryEntry = { action: "Creado" | "Completado" | "No realizado" | "Eliminado" | "Reprogramado" | "Editado"; observation: string; at: string; previousDueOdometer?: number | null; dueOdometer?: number | null; previousDueDate?: string; dueDate?: string };
type Reminder = { id: string; plate: string; chassis: string; type: string; dueDate: string; dueOdometer: number | null; notes: string; status: MaintenanceStatus; createdAt: string; updatedAt?: string; closedAt?: string; closingObservation?: string; history?: HistoryEntry[]; manager?: string; lastMaintenanceDate?: string; lastMaintenanceOdometer?: number; lastRoutine?: number; frequency?: number; brand?: string; model?: string; client?: string; fleetStatus?: string; source?: string; performedOdometer?: number; serviceLocation?: string; parentMaintenanceId?: string };

const save = (items: Reminder[]) => writeJson("app/maintenance.json", items);
export const migrateMaintenanceRoutines = (items: Reminder[]) => {
  let changed = false;
  for (const item of items) {
    if (item.lastRoutine != null || item.source !== "Frecuencias de mantenimiento Titania.xlsx") continue;
    const match = String(item.notes || "").match(/rutina:\s*([\d.,]+)/i);
    const parsed = match ? Number(match[1].replace(/\./g, "").replace(",", ".")) : NaN;
    const fallback = Number(item.dueOdometer) - Number(item.frequency);
    const lastRoutine = Number.isFinite(parsed) ? parsed : fallback;
    if (!Number.isFinite(lastRoutine) || lastRoutine < 0) continue;
    item.lastRoutine = lastRoutine;
    if (Number(item.frequency) > 0 && item.status === "Pendiente") item.dueOdometer = lastRoutine + Number(item.frequency);
    changed = true;
  }
  return changed;
};
const read = async (): Promise<Reminder[]> => {
  const items = await readJson<Reminder[]>("app/maintenance.json", []);
  if (migrateMaintenanceRoutines(items)) await save(items);
  return items;
};
const send = (res: ServerResponse, status: number, data: unknown) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(data)); };
const body = async (req: IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); };

export const nextRoutineOdometer = (completedRoutine: number, frequency: number) => {
  if (!Number.isFinite(completedRoutine) || completedRoutine < 0 || !Number.isFinite(frequency) || frequency <= 0) throw new Error("Rutina o frecuencia no válida.");
  return completedRoutine + frequency;
};

export function createMaintenanceApi() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/maintenance")) return next();
    try {
      if (req.method === "GET") return send(res, 200, { items: await read() });
      if (req.method === "POST") {
        const data = await body(req);
        if (!data.plate || !data.type || (!data.dueDate && !data.dueOdometer)) return send(res, 400, { error: "Vehículo, tipo y al menos una condición son obligatorios." });
        const createdAt = new Date().toISOString();
        const item: Reminder = { id: randomBytes(10).toString("hex"), plate: String(data.plate), chassis: String(data.chassis || ""), type: String(data.type), dueDate: data.dueDate ? String(data.dueDate) : "", dueOdometer: data.dueOdometer ? Number(data.dueOdometer) : null, notes: String(data.notes || ""), status: "Pendiente", createdAt, frequency: data.frequency ? Number(data.frequency) : undefined, lastMaintenanceOdometer: data.lastMaintenanceOdometer != null ? Number(data.lastMaintenanceOdometer) : undefined, lastRoutine: data.lastRoutine != null ? Number(data.lastRoutine) : undefined, history: [{ action: "Creado", observation: String(data.notes || ""), at: createdAt }] };
        const items = await read(); items.unshift(item); await save(items); return send(res, 201, { item });
      }
      if (req.method === "PATCH") {
        const data = await body(req); const items = await read(); const item = items.find((x) => x.id === data.id);
        if (!item) return send(res, 404, { error: "Mantenimiento no encontrado." });
        const at = new Date().toISOString(); const action = String(data.action || ""); const observation = String(data.observation || "").trim(); item.history ||= [];
        if (action === "complete") {
          const performedOdometer = Number(data.performedOdometer);
          const frequency = Number(item.frequency || data.frequency || 0);
          if (!Number.isFinite(performedOdometer) || performedOdometer < 0) return send(res, 400, { error: "El kilometraje realizado no es válido." });
          item.status = "Completado";
          item.closedAt = at;
          item.closingObservation = observation;
          item.performedOdometer = performedOdometer;
          item.serviceLocation = String(data.serviceLocation || "").trim();
          const completedRoutine = Number(item.dueOdometer || item.lastRoutine || performedOdometer);
          item.lastRoutine = completedRoutine;
          item.history.push({ action: "Completado", observation: `${observation}${item.serviceLocation ? ` | Lugar: ${item.serviceLocation}` : ""} | Km: ${performedOdometer}`, at });
          if (frequency > 0) {
            const nextItem: Reminder = {
              ...item,
              id: randomBytes(10).toString("hex"),
              status: "Pendiente",
              createdAt: at,
              updatedAt: undefined,
              closedAt: undefined,
              closingObservation: undefined,
              performedOdometer: undefined,
              serviceLocation: undefined,
              lastMaintenanceDate: at.slice(0, 10),
              lastMaintenanceOdometer: performedOdometer,
              lastRoutine: completedRoutine,
              frequency,
              dueOdometer: nextRoutineOdometer(completedRoutine, frequency),
              dueDate: "",
              parentMaintenanceId: item.id,
              history: [{ action: "Creado", observation: `Generado automáticamente al completar ${item.id}. Intervalo: ${frequency} km.`, at }],
            };
            items.unshift(nextItem);
          }
        }
        else if (action === "not_done") { if (!observation) return send(res, 400, { error: "La observación es obligatoria." }); item.status = "No realizado"; item.closedAt = at; item.closingObservation = observation; item.history.push({ action: "No realizado", observation, at }); }
        else if (action === "delete") { if (!observation) return send(res, 400, { error: "El motivo de eliminación es obligatorio." }); item.status = "Eliminado"; item.closedAt = at; item.closingObservation = observation; item.history.push({ action: "Eliminado", observation, at }); }
        else if (action === "reschedule") {
          const dueOdometer = data.dueOdometer ? Number(data.dueOdometer) : null; const dueDate = data.dueDate ? String(data.dueDate) : "";
          if (!dueOdometer && !dueDate) return send(res, 400, { error: "La nueva meta es obligatoria." });
          item.history.push({ action: "Reprogramado", observation, at, previousDueOdometer: item.dueOdometer, dueOdometer, previousDueDate: item.dueDate, dueDate });
          item.dueOdometer = dueOdometer; item.dueDate = dueDate; item.status = "Pendiente"; item.closedAt = undefined; item.closingObservation = undefined;
          if (data.frequency) item.frequency = Number(data.frequency);
          if (data.lastMaintenanceOdometer != null) item.lastMaintenanceOdometer = Number(data.lastMaintenanceOdometer);
          if (data.lastRoutine != null) item.lastRoutine = Number(data.lastRoutine);
        } else if (action === "edit") {
          const lastMaintenanceOdometer = Number(data.lastMaintenanceOdometer);
          const frequency = Number(data.frequency);
          if (!Number.isFinite(lastMaintenanceOdometer) || lastMaintenanceOdometer < 0 || !Number.isFinite(frequency) || frequency <= 0) return send(res, 400, { error: "Kilometraje y frecuencia no válidos." });
          item.manager = String(data.manager || "").trim();
          item.lastMaintenanceDate = String(data.lastMaintenanceDate || "");
          item.lastMaintenanceOdometer = lastMaintenanceOdometer;
          item.frequency = frequency;
          if (data.lastRoutine != null) item.lastRoutine = Number(data.lastRoutine);
          item.dueOdometer = nextRoutineOdometer(Number(item.lastRoutine ?? lastMaintenanceOdometer), frequency);
          item.status = "Pendiente";
          item.closedAt = undefined;
          item.closingObservation = undefined;
          item.history.push({ action: "Editado", observation: observation || "Datos base actualizados", at, dueOdometer: item.dueOdometer });
        } else return send(res, 400, { error: "Acción no válida." });
        item.updatedAt = at; await save(items); return send(res, 200, { item });
      }
      send(res, 405, { error: "Método no permitido." });
    } catch { send(res, 400, { error: "Solicitud inválida." }); }
  };
}
