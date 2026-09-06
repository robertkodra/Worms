import { Game, Worm } from "./simulation";

export interface MoveCommand {
  direction: number;
  jump?: boolean;
}
export interface Route {
  commands: MoveCommand[];
  x: number;
  y: number;
  score: number;
  label: string;
  terrainRevision: number;
}

/** Preview navigation with the very same capsule, gravity, jump and fall rules.
 * Only worm physics runs in the scratch state: no RNG, terrain edits or attacks. */
export function previewRoute(
  game: Game,
  commands: MoveCommand[],
): Route | null {
  const scratch: Game = Object.assign(
    Object.create(Game.prototype) as Game,
    game,
    {
      worms: game.worms.map((w) => ({ ...w })),
      events: [],
      projectiles: [],
      stats: { ...game.stats },
    },
  );
  const actor = scratch.active;
  const hp = actor.hp;
  for (const input of commands) {
    executeMove(scratch, input);
    scratch.advanceWorm(actor);
    if (
      actor.hp < hp ||
      actor.x < 28 ||
      actor.x > 1572 ||
      actor.y > game.water - 35
    )
      return null;
    if (
      game.worms.some(
        (w) =>
          w.id !== actor.id &&
          w.hp > 0 &&
          Math.abs(w.x - actor.x) < 20 &&
          Math.abs(w.y - actor.y) < 27,
      )
    )
      return null;
  }
  if (!actor.grounded || actor.y - game.active.y > 85) return null;
  return {
    commands,
    x: actor.x,
    y: actor.y,
    score: 0,
    label: "Finding a firing position",
    terrainRevision: game.terrain.revision,
  };
}

function positionScore(
  game: Game,
  w: Pick<Worm, "x" | "y">,
  retreat: boolean,
): number {
  const actor = game.active;
  const enemies = game.worms.filter((o) => o.hp > 0 && o.team !== actor.team);
  const nearest = Math.min(
    ...enemies.map((o) => Math.hypot(o.x - w.x, o.y - w.y)),
  );
  const allies = game.worms.filter(
    (o) => o.hp > 0 && o.team === actor.team && o.id !== actor.id,
  );
  let score =
    -Math.abs(nearest - (retreat ? 480 : 300)) * 0.045 + (actor.y - w.y) * 0.06;
  for (const ally of allies)
    score -= Math.max(0, 140 - Math.hypot(ally.x - w.x, ally.y - w.y)) * 0.18;
  for (const dir of [-1, 1])
    if (game.terrain.surface(w.x + dir * 20, w.y - 8) > w.y + 45) score -= 7;
  if (retreat && game.projectile)
    score +=
      Math.min(
        160,
        Math.hypot(w.x - game.projectile.x, w.y - game.projectile.y),
      ) * 0.08;
  return score;
}

function seesEnemy(game: Game, actor: Pick<Worm, "x" | "y" | "team">): boolean {
  return game.worms.some((enemy) => {
    if (enemy.hp <= 0 || enemy.team === actor.team) return false;
    const steps = Math.ceil(
      Math.hypot(enemy.x - actor.x, enemy.y - actor.y) / 4,
    );
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (
        game.terrain.solid(
          actor.x + (enemy.x - actor.x) * t,
          actor.y - 18 + (enemy.y - actor.y) * t,
        )
      )
        return false;
    }
    return true;
  });
}

export function planMovement(game: Game, retreat = false): Route {
  const actor = game.active;
  let best: Route = {
    commands: [],
    x: actor.x,
    y: actor.y,
    score: positionScore(game, actor, retreat),
    label: "Lining up a shot",
    terrainRevision: game.terrain.revision,
  };
  if (!actor.grounded || !game.acting) return best;
  for (const direction of [-1, 1])
    for (const hop of [false, true]) {
      const commands: MoveCommand[] = [];
      const walkingTicks = retreat ? 66 : 100;
      for (let tick = 0; tick < walkingTicks + 65; tick++)
        commands.push({
          direction: tick < walkingTicks ? direction : 0,
          jump: hop && tick === 6,
        });
      const route = previewRoute(game, commands);
      if (!route || Math.abs(route.x - actor.x) < 10) continue;
      route.score = positionScore(game, route, retreat) - (hop ? 0.2 : 0);
      route.label = retreat
        ? "Getting out of trouble"
        : hop
          ? "Hopping to a better angle"
          : "Finding a firing position";
      if (route.score > best.score + 0.25) best = route;
    }
  // A sheltered bot with no view of an opponent should try its cave entrance
  // before spending turns shooting the roof. Spawn metadata is only a hint:
  // preview the full route against today's destructible terrain and occupants.
  if (
    !retreat &&
    game.terrain.surface(actor.x) < actor.y - 36 &&
    !seesEnemy(game, actor)
  ) {
    const entrances = [
      ...new Set(
        game.terrain.spawnPoints
          .filter((p) => p.exitX !== null)
          .map((p) => p.exitX!),
      ),
    ];
    for (const exitX of entrances) {
      if (Math.abs(exitX - actor.x) > 320) continue;
      const walkingTicks = Math.min(
        360,
        Math.ceil((Math.abs(exitX - actor.x) * 60) / 52),
      );
      const direction = Math.sign(exitX - actor.x);
      const commands = Array.from({ length: walkingTicks + 65 }, (_, tick) => ({
        direction: tick < walkingTicks ? direction : 0,
      }));
      const route = previewRoute(game, commands);
      if (!route || Math.abs(route.x - exitX) >= Math.abs(actor.x - exitX) - 32)
        continue;
      const exposed = game.terrain.surface(route.x) >= route.y - 36;
      route.score =
        positionScore(game, route, false) +
        (exposed ? 18 : 0) +
        (seesEnemy(game, { ...route, team: actor.team }) ? 8 : 0);
      route.label = "Finding a way out of the burrow";
      if (route.score > best.score + 0.25) best = route;
    }
  }
  return best;
}

/** Shared input guard for preview and execution; callers replan after terrain edits. */
export function executeMove(game: Game, command: MoveCommand): void {
  const w = game.active;
  if (!game.acting || !w.grounded) return;
  if (command.jump) {
    game.move(command.direction);
    game.jump();
    return;
  }
  if (command.direction) {
    const ahead = w.x + command.direction * 15;
    if (
      game.terrain.surface(ahead, w.y - 6) > Math.min(w.y + 42, game.water - 30)
    ) {
      game.move(0);
      return;
    }
  }
  game.move(command.direction);
}
