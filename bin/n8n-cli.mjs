#!/usr/bin/env node
// n8n CLI — wraps n8n REST API for use from shell / Alice bash tool
//
// Config (env vars or ~/.n8n-cli.json):
//   N8N_BASE_URL  — default: http://localhost:5678
//   N8N_API_KEY   — optional, n8n API key

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  let file = {};
  try {
    file = JSON.parse(readFileSync(join(homedir(), ".n8n-cli.json"), "utf8"));
  } catch {}
  return {
    baseURL: (process.env.N8N_BASE_URL || file.base_url || "http://localhost:5678").replace(/\/$/, ""),
    apiKey: process.env.N8N_API_KEY || file.api_key || "",
  };
}

// ── HTTP client ───────────────────────────────────────────────────────────────

async function req(cfg, method, path, body) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (cfg.apiKey) headers["X-N8N-API-KEY"] = cfg.apiKey;

  const res = await fetch(cfg.baseURL + path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg = data?.message || data?.error || text;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

// ── Commands ──────────────────────────────────────────────────────────────────

const commands = {
  // list-workflows
  async "list-workflows"(cfg, _args) {
    const data = await req(cfg, "GET", "/api/v1/workflows?limit=100");
    const workflows = data.data ?? [];
    if (!workflows.length) return "No workflows found.";
    return workflows
      .map(w => `${w.id}\t${w.active ? "✓" : "○"}\t${w.name}`)
      .join("\n");
  },

  // get-workflow <id>
  async "get-workflow"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n get-workflow <id>");
    const w = await req(cfg, "GET", `/api/v1/workflows/${id}`);
    return JSON.stringify(w, null, 2);
  },

  // trigger <webhook-path> [--method GET|POST] [--body '{}'] [--test]
  async trigger(cfg, args) {
    if (!args[0]) throw new Error("Usage: n8n trigger <webhook-path> [--method GET|POST] [--body '{}'] [--test]");

    const path = args[0].replace(/^\//, "");
    const flags = parseFlags(args.slice(1));
    const method = (flags.method || "POST").toUpperCase();
    const useTest = "test" in flags;
    const prefix = useTest ? "/webhook-test/" : "/webhook/";

    let body;
    if (flags.body) {
      try { body = JSON.parse(flags.body); }
      catch { throw new Error("--body must be valid JSON"); }
    }

    const data = await req(cfg, method, prefix + path, method === "GET" ? undefined : body);
    return typeof data === "string" ? data : JSON.stringify(data, null, 2);
  },

  // executions [--workflow <id>] [--status success|error|waiting] [--limit N]
  async executions(cfg, args) {
    const flags = parseFlags(args);
    const limit = Math.min(parseInt(flags.limit || "10", 10), 50);
    const params = new URLSearchParams({ limit: String(limit), includeData: "false" });
    if (flags.workflow) params.set("workflowId", flags.workflow);
    if (flags.status) params.set("status", flags.status);

    const data = await req(cfg, "GET", `/api/v1/executions?${params}`);
    const execs = data.data ?? [];
    if (!execs.length) return "No executions found.";
    return execs
      .map(e => `${e.id}\t[${e.status}]\twf:${e.workflowId}\t${e.startedAt}\t(${e.mode})`)
      .join("\n");
  },

  // activate <workflow-id>
  async activate(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n activate <workflow-id>");
    await req(cfg, "POST", `/api/v1/workflows/${id}/activate`);
    return `Workflow ${id} activated.`;
  },

  // deactivate <workflow-id>
  async deactivate(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n deactivate <workflow-id>");
    await req(cfg, "POST", `/api/v1/workflows/${id}/deactivate`);
    return `Workflow ${id} deactivated.`;
  },

  // execute <workflow-id> [--body '{}']
  async execute(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n execute <workflow-id> [--body '{\"key\":\"val\"}']");
    const flags = parseFlags(args.slice(1));
    let inputData = {};
    if (flags.body) {
      try { inputData = JSON.parse(flags.body); }
      catch { throw new Error("--body must be valid JSON"); }
    }
    const data = await req(cfg, "POST", `/api/v1/workflows/${id}/execute`, inputData);
    return JSON.stringify(data, null, 2);
  },

  // get-execution <execution-id>
  async "get-execution"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n get-execution <execution-id>");
    const data = await req(cfg, "GET", `/api/v1/executions/${id}`);
    return JSON.stringify(data, null, 2);
  },

  // stop-execution <execution-id>
  async "stop-execution"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n stop-execution <execution-id>");
    await req(cfg, "POST", `/api/v1/executions/${id}/stop`);
    return `Execution ${id} stopped.`;
  },

  // delete-execution <execution-id>
  async "delete-execution"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n delete-execution <execution-id>");
    await req(cfg, "DELETE", `/api/v1/executions/${id}`);
    return `Execution ${id} deleted.`;
  },

  // create-workflow --file <path.json>  |  --body '{...}'
  async "create-workflow"(cfg, args) {
    const flags = parseFlags(args);
    let body;
    if (flags.file) {
      const { readFileSync } = await import("fs");
      try { body = JSON.parse(readFileSync(flags.file, "utf8")); }
      catch (e) { throw new Error(`Cannot read file ${flags.file}: ${e.message}`); }
    } else if (flags.body) {
      try { body = JSON.parse(flags.body); }
      catch { throw new Error("--body must be valid JSON"); }
    } else {
      throw new Error("Usage: n8n create-workflow --file <path.json>  OR  --body '{...}'");
    }
    const data = await req(cfg, "POST", "/api/v1/workflows", body);
    return `Created workflow id=${data.id} name="${data.name}"`;
  },

  // update-workflow <id> --file <path.json>  |  --body '{...}'
  async "update-workflow"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n update-workflow <id> --file <path.json>  OR  --body '{...}'");
    const flags = parseFlags(args.slice(1));
    let body;
    if (flags.file) {
      const { readFileSync } = await import("fs");
      try { body = JSON.parse(readFileSync(flags.file, "utf8")); }
      catch (e) { throw new Error(`Cannot read file ${flags.file}: ${e.message}`); }
    } else if (flags.body) {
      try { body = JSON.parse(flags.body); }
      catch { throw new Error("--body must be valid JSON"); }
    } else {
      throw new Error("Usage: n8n update-workflow <id> --file <path.json>  OR  --body '{...}'");
    }
    const data = await req(cfg, "PUT", `/api/v1/workflows/${id}`, body);
    return `Updated workflow id=${data.id} name="${data.name}"`;
  },

  // delete-workflow <id>
  async "delete-workflow"(cfg, args) {
    const id = args[0];
    if (!id) throw new Error("Usage: n8n delete-workflow <id>");
    await req(cfg, "DELETE", `/api/v1/workflows/${id}`);
    return `Workflow ${id} deleted.`;
  },

  // health
  async health(cfg, _args) {
    const data = await req(cfg, "GET", "/healthz");
    return `n8n is ${data.status ?? "ok"} at ${cfg.baseURL}`;
  },
};

// ── Flag parser ───────────────────────────────────────────────────────────────

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

// ── Help ──────────────────────────────────────────────────────────────────────

function help() {
  return `n8n CLI — n8n REST API wrapper

Commands:
  list-workflows                              List all workflows
  get-workflow <id>                           Show workflow JSON
  create-workflow --file <path> | --body '{}' Create a workflow from JSON
  update-workflow <id> --file <path> | --body Update a workflow
  delete-workflow <id>                        Delete a workflow
  activate <id>                               Activate a workflow
  deactivate <id>                             Deactivate a workflow
  trigger <path> [--method GET|POST]          Trigger a webhook workflow
                 [--body '{}'] [--test]
  execute <id> [--body '{}']                  Execute a workflow via API
  executions [--workflow <id>]                List recent executions
             [--status success|error|waiting]
             [--limit N]
  get-execution <id>                          Get single execution details
  stop-execution <id>                         Stop a running execution
  delete-execution <id>                       Delete an execution record
  health                                      Check n8n status

Config:
  N8N_BASE_URL   Base URL (default: http://localhost:5678)
  N8N_API_KEY    API key (optional)
  ~/.n8n-cli.json  {"base_url": "...", "api_key": "..."}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === "--help" || cmd === "-h") {
  console.log(help());
  process.exit(0);
}

const handler = commands[cmd];
if (!handler) {
  console.error(`Unknown command: ${cmd}\nRun "n8n --help" for usage.`);
  process.exit(1);
}

try {
  const cfg = loadConfig();
  const result = await handler(cfg, rest);
  if (result) console.log(result);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
