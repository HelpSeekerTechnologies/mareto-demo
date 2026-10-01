"""Provision the sandbox intake on demo.mareto: the receive workflow and the public gateway route.

Idempotent: re-running updates the workflow steps and leaves the route in place. Reads the admin token
from ~/.tokens-demo-wave.json (minted by Alina with mint-tokens.ps1); never prints it.

  python sandbox/provision_demo.py
"""
from __future__ import annotations
import sys
sys.path.insert(0, r"C:\Users\alina\.claude\jobs\98050f0d\tmp")
from demo_api import get, post, put

NS = "sandbox-intake"; MOD = "sandbox_request"; HANDLE = "sandbox_request_receive"; ENDPOINT = "/sandbox-request"
ORIGIN = "https://demo.helpseeker.org"

PARSE = r"""
var body = String(input || "");
var out = {};
try { out = JSON.parse(body) || {}; } catch (e) { out = {}; }
function s(v) { return v == null ? "" : String(v); }
var programs = Array.isArray(out.programs) ? out.programs.filter(function (p) { return p && p.name; }) : [];
return {
  org: s(out.org), province: s(out.province), website: s(out.website), email: s(out.email).toLowerCase(), role: s(out.role),
  second: s(out.second), timeline: s(out.timeline), contract_end: s(out.contract), source: s(out.source),
  programs: JSON.stringify(programs), roles: JSON.stringify(Array.isArray(out.roles) ? out.roles : []),
  program_count: programs.length,
  forms_names: (out.forms || []).map(function (f) { return f.name; }).join(", "),
  samples_names: (out.samples || []).map(function (f) { return f.name; }).join(", "),
  ok: !!(out.org && out.email && programs.length)
};
"""


def vis(i, name):
    return {"name": "", "description": "", "visual": {"defaultName": False, "id": str(i), "parent": str(i), "value": name, "xywh": [0, 100 * i, 220, 80]}}


def steps():
    def V(k, e):
        return {"target": f"newReq.values.{k}", "expr": e, "type": "String"}
    return [
        {"stepID": "1", "kind": "expressions", "arguments": [
            {"target": "rawBody", "expr": "request.Body", "type": "Reader"}, {"target": "rawBodyStr", "expr": "rawBody", "type": "String"}, {"target": "result", "expr": "\"\"", "type": "String"}], "results": [], "meta": vis(1, "Capture request")},
        {"stepID": "2", "kind": "function", "ref": "jsenvExecute", "arguments": [
            {"target": "scope", "expr": "rawBodyStr", "type": "Any"}, {"target": "source", "value": PARSE, "type": "String"}], "results": [{"target": "payload", "expr": "resultAny", "type": "Any"}], "meta": vis(2, "Parse JSON")},
        {"stepID": "3", "kind": "gateway", "ref": "excl", "arguments": [], "results": [], "meta": vis(3, "Valid?")},
        {"stepID": "4", "kind": "function", "ref": "composeNamespacesLookup", "arguments": [{"target": "namespace", "value": NS, "type": "Handle"}], "results": [{"target": "namespace", "expr": "namespace", "type": "ComposeNamespace"}], "meta": vis(4, "Namespace")},
        {"stepID": "5", "kind": "function", "ref": "composeRecordsNew", "arguments": [{"target": "module", "value": MOD, "type": "Handle"}, {"target": "namespace", "expr": "namespace", "type": "ComposeNamespace"}], "results": [{"target": "newReq", "expr": "record", "type": "ComposeRecord"}], "meta": vis(5, "New request")},
        {"stepID": "6", "kind": "expressions", "arguments": [
            V("org", "payload.org"), V("province", "payload.province"), V("website", "payload.website"), V("email", "payload.email"), V("role", "payload.role"),
            V("second", "payload.second"), V("timeline", "payload.timeline"), V("contract_end", "payload.contract_end"), V("source", "payload.source"),
            V("programs", "payload.programs"), V("roles", "payload.roles"), V("request", "rawBodyStr"), V("status", "\"received\""),
            V("notes", "\"Forms: \" + payload.forms_names + \" | Samples: \" + payload.samples_names")], "results": [], "meta": vis(6, "Fill values")},
        {"stepID": "7", "kind": "function", "ref": "composeRecordsCreate", "arguments": [{"target": "record", "expr": "newReq", "type": "ComposeRecord"}], "results": [{"target": "saved", "expr": "record", "type": "ComposeRecord"}], "meta": vis(7, "Create")},
        {"stepID": "8", "kind": "expressions", "arguments": [{"target": "result", "expr": "\"{\\\"ok\\\":true,\\\"id\\\":\\\"\" + saved.recordID + \"\\\"}\"", "type": "String"}], "results": [], "meta": vis(8, "Respond ok")},
        {"stepID": "9", "kind": "termination", "arguments": [], "results": [], "meta": vis(9, "End")},
        {"stepID": "10", "kind": "expressions", "arguments": [{"target": "result", "expr": "\"{\\\"ok\\\":false,\\\"error\\\":\\\"missing organization, email or programs\\\"}\"", "type": "String"}], "results": [], "meta": vis(10, "Respond invalid")},
        {"stepID": "11", "kind": "termination", "arguments": [], "results": [], "meta": vis(11, "End invalid")},
    ]


def paths():
    def P(a, b, expr=None):
        return {"parentID": str(a), "childID": str(b), "expr": expr or "", "meta": {"name": "", "description": "", "visual": {}}}
    return [P(1, 2), P(2, 3), P(3, 4, "payload.ok == true"), P(3, 10, "payload.ok != true"), P(4, 5), P(5, 6), P(6, 7), P(7, 8), P(8, 9), P(10, 11)]


def main():
    body = {"handle": HANDLE, "enabled": True, "trace": False, "keepSessions": 0, "scope": {}, "runAs": "0",
            "meta": {"name": "Sandbox: request receive", "description": "Stage B questionnaire from demo.helpseeker.org into sandbox_request."},
            "steps": steps(), "paths": paths()}
    ex = [w for w in get(f"/api/automation/workflows/?query={HANDLE}&limit=5")["response"]["set"] if w["handle"] == HANDLE]
    if ex:
        wid = ex[0]["workflowID"]; body["workflowID"] = wid
        r = put(f"/api/automation/workflows/{wid}", body); print("workflow updated", wid, str(r)[:200] if "http" in r else "")
    else:
        r = post("/api/automation/workflows/", body); wid = r.get("response", {}).get("workflowID"); print("workflow created", wid, str(r)[:300] if not wid else "")
    if not wid:
        sys.exit("no workflow id")
    routes = [x for x in get("/api/system/apigw/route/?limit=200")["response"]["set"] if x["endpoint"] == ENDPOINT and x["method"] == "POST"]
    if routes:
        rid = routes[0]["routeID"]; print("route exists", rid)
    else:
        r = post("/api/system/apigw/route", {"endpoint": ENDPOINT, "method": "POST", "enabled": True, "group": "0", "meta": {"debug": False, "async": False, "description": "Sandbox request POST"}})
        rid = r["response"]["routeID"]; print("route created", rid)
        for i, (ref, kind, params) in enumerate([("profiler", "prefilter", {}), ("workflow", "processer", {"workflow": wid}),
                ("response", "postfilter", {"header": {"Content-Type": ["application/json"], "Access-Control-Allow-Origin": [ORIGIN]}, "input": {"expr": "result", "type": "Any"}})], 1):
            fr = put("/api/system/apigw/filter", {"routeID": rid, "ref": ref, "kind": kind, "weight": str(i), "enabled": True, "params": params})
            print("  filter", ref, "ok" if "response" in fr else str(fr)[:200])
    print("endpoint: https://demo.mareto.helpseeker.org/api/gateway" + ENDPOINT)


if __name__ == "__main__":
    main()
