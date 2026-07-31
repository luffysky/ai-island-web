import { describe, it, expect } from "vitest";
import { openApiOperations, isSafePublicUrl, parseOpenApiToTools } from "./openapi-tools";

const SPEC = {
  servers: [{ url: "https://api.example.com/v1" }],
  paths: {
    "/users/{id}": {
      get: { operationId: "getUser", summary: "取得使用者", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] },
      delete: { operationId: "deleteUser", parameters: [{ name: "id", in: "path", required: true }] },
    },
    "/users": {
      get: { operationId: "listUsers", parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }] },
      post: { operationId: "createUser", requestBody: { content: { "application/json": {} } } },
    },
  },
};

describe("openApiOperations", () => {
  const ops = openApiOperations(SPEC, "demo");
  it("每個 method 都變成一個 operation", () => {
    expect(ops.map((o) => o.name).sort()).toEqual(["demo.createUser", "demo.deleteUser", "demo.getUser", "demo.listUsers"]);
  });
  it("risk 依 HTTP method：GET=read、POST/PUT/PATCH=write、DELETE=dangerous", () => {
    const by = Object.fromEntries(ops.map((o) => [o.name, o.risk]));
    expect(by["demo.getUser"]).toBe("read");
    expect(by["demo.listUsers"]).toBe("read");
    expect(by["demo.createUser"]).toBe("write");
    expect(by["demo.deleteUser"]).toBe("dangerous");
  });
  it("path/query 參數 + body 都抽進 args", () => {
    const getUser = ops.find((o) => o.name === "demo.getUser")!;
    expect(getUser.pathParams).toEqual(["id"]);
    const list = ops.find((o) => o.name === "demo.listUsers")!;
    expect(list.queryParams).toEqual(["limit"]);
    const create = ops.find((o) => o.name === "demo.createUser")!;
    expect(create.hasBody).toBe(true);
    expect(create.args.body).toBeDefined();
  });
  it("壞 spec 不炸、回空陣列", () => {
    expect(openApiOperations(null)).toEqual([]);
    expect(openApiOperations({})).toEqual([]);
    expect(openApiOperations({ paths: "x" as any })).toEqual([]);
  });
});

describe("parseOpenApiToTools", () => {
  it("轉成 AgentTool、base URL 取 spec.servers 或 opts", () => {
    const tools = parseOpenApiToTools(SPEC, { namespace: "demo" });
    expect(tools.length).toBe(4);
    expect(typeof tools[0].execute).toBe("function");
    expect(tools[0].platforms).toContain("web");
  });
});

describe("isSafePublicUrl (SSRF)", () => {
  it("擋內網/私有/保留位址與非 http", () => {
    for (const u of [
      "http://localhost/x", "http://127.0.0.1/x", "http://10.0.0.5/x", "http://192.168.1.1/x",
      "http://172.16.0.1/x", "http://169.254.169.254/latest", "http://0.0.0.0/x",
      "ftp://example.com/x", "file:///etc/passwd", "http://foo.internal/x", "not a url",
    ]) {
      expect(isSafePublicUrl(u)).toBe(false);
    }
  });
  it("放行正常公開 https", () => {
    for (const u of ["https://api.example.com/v1", "http://example.org/openapi.json", "https://api.github.com"]) {
      expect(isSafePublicUrl(u)).toBe(true);
    }
  });
});
