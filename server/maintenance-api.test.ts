import { describe, expect, it } from "vitest";
import { migrateMaintenanceRoutines, nextRoutineOdometer } from "./maintenance-api";

describe("reprogramación automática de mantenimiento", () => {
  it("suma la frecuencia a la rutina completada", () => {
    expect(nextRoutineOdometer(170000, 5000)).toBe(175000);
  });

  it("no desplaza la rutina por el kilometraje real tardío", () => {
    const performedOdometer = 172361;
    expect(nextRoutineOdometer(170000, 5000)).toBe(175000);
    expect(nextRoutineOdometer(170000, 5000)).not.toBe(performedOdometer + 5000);
  });

  it("rechaza frecuencias inválidas", () => {
    expect(() => nextRoutineOdometer(170000, 0)).toThrow();
  });
});

describe("migración de rutinas importadas", () => {
  it("recupera la última rutina y corrige la próxima meta", () => {
    const items: any[] = [{ source: "Frecuencias de mantenimiento Titania.xlsx", status: "Pendiente", notes: "Importado. Última rutina: 170000.", frequency: 5000, dueOdometer: 175122 }];
    expect(migrateMaintenanceRoutines(items)).toBe(true);
    expect(items[0].lastRoutine).toBe(170000);
    expect(items[0].dueOdometer).toBe(175000);
  });
});
