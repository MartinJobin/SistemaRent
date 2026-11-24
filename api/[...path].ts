import type { IncomingMessage, ServerResponse } from "node:http";
import { createAuthApi } from "../server/auth-api.ts";
import { createFleetApi } from "../server/fleet-api.ts";
import { createMaintenanceApi } from "../server/maintenance-api.ts";

const auth = createAuthApi();
const fleet = createFleetApi(process.env as Record<string, string>);
const maintenance = createMaintenanceApi();
const send = (res: ServerResponse, status: number, data: unknown) => { if (res.writableEnded) return; res.statusCode=status; res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Cache-Control","no-store"); res.end(JSON.stringify(data)); };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await auth.middleware(req, res, async () => {
    if (!(await auth.isAuthenticated(req))) return send(res, 401, { error: "Sesión requerida." });
    await fleet(req, res, async () => {
      await maintenance(req, res, () => send(res, 404, { error: "Ruta no encontrada." }));
    });
  });
}
