export default function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const isHttps = (req.headers["x-forwarded-proto"] || "https") === "https"
                  && !host.startsWith("localhost");
  const secureFlag = isHttps ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `steamid=; Path=/; Max-Age=0; HttpOnly;${secureFlag} SameSite=Lax`
  );
  res.redirect(302, "/");
}
