// Manages step counts and converts to distance.

const STEP_M = 0.762; // average step length in meters

export class StepsTracker {
  constructor() {
    this.totalSteps = 0;
    this.history = []; // [{date: ISO string, steps: number}]
    this.onChange = null;
  }

  load(saved) {
    if (!saved) return;
    this.totalSteps = saved.totalSteps ?? 0;
    this.history = saved.history ?? [];
  }

  serialize() {
    return { totalSteps: this.totalSteps, history: this.history };
  }

  add(steps) {
    const n = Math.round(Number(steps));
    if (!n || n <= 0) return false;
    this.totalSteps += n;
    this.history.push({ date: new Date().toISOString(), steps: n });
    this.onChange?.();
    return true;
  }

  get distanceM() { return this.totalSteps * STEP_M; }
  get distanceKm() { return this.distanceM / 1000; }

  async importAppleHealthXML(file) {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'application/xml');

    const records = doc.querySelectorAll('Record[type="HKQuantityTypeIdentifierStepCount"]');
    if (!records.length) throw new Error('No se encontraron datos de pasos en el archivo.');

    // Sum steps per calendar day
    const byDay = {};
    records.forEach(r => {
      const day = (r.getAttribute('startDate') || '').slice(0, 10); // YYYY-MM-DD
      const val = parseInt(r.getAttribute('value') || '0', 10);
      if (day && val > 0) byDay[day] = (byDay[day] || 0) + val;
    });

    let imported = 0;
    let days = 0;
    for (const [day, steps] of Object.entries(byDay).sort()) {
      if (this.history.some(h => h.date.startsWith(day))) continue; // skip already imported days
      this.totalSteps += steps;
      this.history.push({ date: day + 'T12:00:00.000Z', steps });
      imported += steps;
      days++;
    }

    this.onChange?.();
    return { imported, days };
  }
}
