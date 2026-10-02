

const { URL } = require("url");

function pathToRegex(routePath) {
  const paramNames = [];
  const pattern = routePath
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${pattern}/?$`), paramNames };
}

class Router {
  constructor() {
    this.routes = []; // { method, regex, paramNames, handlers }
    this.middlewares = []; // global middleware, run before route matching
    this.errorHandler = null;
  }

  use(fn) {
    this.middlewares.push(fn);
  }

  _add(method, routePath, handlers) {
    const { regex, paramNames } = pathToRegex(routePath);
    this.routes.push({ method, regex, paramNames, handlers });
  }

  get(routePath, ...handlers) {
    this._add("GET", routePath, handlers);
  }
  post(routePath, ...handlers) {
    this._add("POST", routePath, handlers);
  }
  put(routePath, ...handlers) {
    this._add("PUT", routePath, handlers);
  }
  delete(routePath, ...handlers) {
    this._add("DELETE", routePath, handlers);
  }

  setErrorHandler(fn) {
    this.errorHandler = fn;
  }

  async handle(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    req.path = parsedUrl.pathname;
    req.params = {};

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (obj) => {
      const body = JSON.stringify(obj);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(body);
    };

    try {
      // Parse JSON body for methods that may carry one.
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        req.body = await parseJsonBody(req);
      } else {
        req.body = {};
      }

      const runMiddlewares = async (index) => {
        if (index < this.middlewares.length) {
          await new Promise((resolve, reject) => {
            const next = (err) => (err ? reject(err) : resolve());
            Promise.resolve(this.middlewares[index](req, res, next)).catch(reject);
          });
          if (res.writableEnded) return;
          await runMiddlewares(index + 1);
        }
      };
      await runMiddlewares(0);
      if (res.writableEnded) return;

      const match = this.routes.find(
        (r) => r.method === req.method && r.regex.test(req.path)
      );

      if (!match) {
        res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
        return;
      }

      const values = match.regex.exec(req.path).slice(1);
      match.paramNames.forEach((name, i) => (req.params[name] = decodeURIComponent(values[i])));

      const runHandlers = async (index) => {
        if (index >= match.handlers.length) return;
        const handler = match.handlers[index];
        await new Promise((resolve, reject) => {
          const next = (err) => (err ? reject(err) : resolve());
          Promise.resolve(handler(req, res, next)).then(resolve).catch(reject);
        });
        if (res.writableEnded) return;
        await runHandlers(index + 1);
      };
      await runHandlers(0);
    } catch (err) {
      if (this.errorHandler) this.errorHandler(err, req, res);
      else {
        console.error(err);
        if (!res.writableEnded) res.status(500).json({ success: false, message: "Internal server error" });
      }
    }
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) req.destroy(); // 2MB safety cap
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({}); // malformed JSON -> treated as empty body; validation layer will reject missing fields
      }
    });
    req.on("error", reject);
  });
}

module.exports = { Router };
