// safemap.go.kr 단순 프록시.
// GitHub Actions(Azure 데이터센터 IP)에서 safemap.go.kr로 직접 연결이
// 구조적으로 막혀 있어, Cloudflare 엣지 네트워크를 경유해 요청을 우회한다.
// /openApiService/ 하위 경로만 허용해 오픈 프록시로 악용되는 것을 막는다.

const ALLOWED_PREFIX = "/openApiService/";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (!incoming.pathname.startsWith(ALLOWED_PREFIX)) {
      return new Response("Not Found", { status: 404 });
    }

    const targets = [
      `https://www.safemap.go.kr${incoming.pathname}${incoming.search}`,
      `http://www.safemap.go.kr${incoming.pathname}${incoming.search}`,
    ];

    let lastErr;
    for (const target of targets) {
      try {
        const res = await fetch(target, { method: "GET" });
        return new Response(res.body, {
          status: res.status,
          headers: res.headers,
        });
      } catch (err) {
        lastErr = err;
      }
    }

    return new Response(`Upstream fetch failed: ${lastErr?.message ?? "unknown"}`, {
      status: 502,
    });
  },
};
