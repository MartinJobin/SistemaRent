import { describe, expect, it } from "vitest";
import { nextRoutineOdometer } from "./maintenance-api";

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
