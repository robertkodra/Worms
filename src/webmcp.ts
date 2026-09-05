interface GameTool {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
}
interface Context {
  registerTool(
    tool: GameTool,
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
}

/** Progressive enhancement: browsers without WebMCP retain the complete UI. */
export function registerGameTools(tools: GameTool[]): void {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return;
  const life = new AbortController();
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: life.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser capability. */
    }
  }
  if (import.meta.hot) import.meta.hot.dispose(() => life.abort());
  window.addEventListener("pagehide", () => life.abort(), { once: true });
}
