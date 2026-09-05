import { Game, GameSnapshot, planShots } from "./simulation";

self.onmessage = (
  event: MessageEvent<{ id: number; snapshot: GameSnapshot }>,
) => {
  const { id, snapshot } = event.data;
  try {
    const game = Game.restore(snapshot);
    const planner = planShots(game);
    const run = () => {
      try {
        const deadline = performance.now() + 12;
        let item = planner.next();
        while (!item.done && performance.now() < deadline)
          item = planner.next();
        self.postMessage({ id, plan: item.value, done: item.done });
        if (!item.done) setTimeout(run, 0);
      } catch {
        self.postMessage({ id, error: true });
      }
    };
    run();
  } catch {
    self.postMessage({ id, error: true });
  }
};
