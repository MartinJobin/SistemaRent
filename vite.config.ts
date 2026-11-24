import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createFleetApi } from "./server/fleet-api.ts";
import { createAuthApi } from "./server/auth-api.ts";
import { createMaintenanceApi } from "./server/maintenance-api.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);
  const fleetApi = createFleetApi(env);
  const auth = createAuthApi();
  const maintenanceApi = createMaintenanceApi();
  const guardedFleet = async (req:any,res:any,next:any) => {
    if (req.url?.startsWith("/api/") && !(await auth.isAuthenticated(req))) {
      res.statusCode=401;
      res.setHeader("Content-Type","application/json");
      return res.end(JSON.stringify({error:"Sesión requerida."}));
    }
    return fleetApi(req,res,next);
  };
  return {
    plugins: [react(), {
      name: "fleet-api",
      configureServer(server) {
        server.middlewares.use(auth.middleware);
        server.middlewares.use(guardedFleet);
        server.middlewares.use(maintenanceApi);
      },
      configurePreviewServer(server) {
        server.middlewares.use(auth.middleware);
        server.middlewares.use(guardedFleet);
        server.middlewares.use(maintenanceApi);
      },
    }],
  };
});
