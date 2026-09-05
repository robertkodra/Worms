import { Game, ShotPlan } from "./simulation";

// A worker owns a single immutable planning request. Termination cancels both
// its CPU work and pending messages; the generation guard rejects stale replies.
export class BackgroundPlanner {
  private worker: Worker | null = null;
  private generation = 0;
  cancel(): void {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
  }
  start(
    game: Game,
    onPlan: (plan: ShotPlan, done: boolean) => void,
    onError: () => void,
  ): void {
    this.cancel();
    const id = this.generation;
    try {
      const worker = new Worker(new URL("./ai.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;
      const turn = game.turn,
        actor = game.activeId,
        revision = game.terrain.revision;
      worker.onmessage = ({ data }) => {
        if (id !== this.generation || data.id !== id) return;
        if (
          game.turn !== turn ||
          game.activeId !== actor ||
          game.terrain.revision !== revision
        ) {
          this.cancel();
          onError();
          return;
        }
        if (data.error) {
          this.cancel();
          onError();
          return;
        }
        onPlan(data.plan, Boolean(data.done));
        if (data.done) this.cancel();
      };
      worker.onerror = (event) => {
        event.preventDefault();
        if (id === this.generation) {
          this.cancel();
          onError();
        }
      };
      const snapshot = game.snapshot();
      worker.postMessage({ id, snapshot }, [snapshot.terrain.cells.buffer]);
    } catch {
      this.cancel();
      onError();
    }
  }
}
