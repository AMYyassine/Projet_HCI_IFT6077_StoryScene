import type { Story, Workspace } from "./model";
export type AIStatus = { provider: string; model: string; configured: boolean };
export type Impact = {
  summary: string;
  affected: { sceneId: string; reason: string; suggestion: string }[];
  uncertainties: string[];
};
export async function request<T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(
        path === "/config" || path === "/project" ? 5_000 : 125_000,
      ),
    });
  } catch {
    throw new Error(
      "The local server is unavailable or the request timed out. Check the terminal and try again.",
    );
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status}).`;
    try {
      const json = await response.json();
      if (typeof json.detail === "string") detail = json.detail;
    } catch {
      /* Non-JSON gateway response. */
    }
    throw new Error(detail);
  }
  return response.json();
}
export const aiStatus = () => request<AIStatus>("/config");
export const saveWorkspace = (workspace: Workspace) =>
  request<{ saved: boolean }>("/project", workspace, "PUT");
export const loadWorkspace = () => request<Workspace | null>("/project");
export const generateStory = (text: string, acts: number, scenes: number) =>
  request<Story>("/generate", { text, acts, scenes });
export const analyzeImpact = (story: Story, sceneId: string, change: string) =>
  request<Impact>("/analyze", { story, sceneId, change });
export const rewriteScene = (
  story: Story,
  sceneId: string,
  instruction: string,
) =>
  request<{ text: string; explanation: string }>("/rewrite", {
    story,
    sceneId,
    change: instruction,
  });
