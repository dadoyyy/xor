async function probe() {
  const routes = [
    "/",
    "/login",
    "/signup",
    "/home",
    "/subjects",
    "/rooms",
    "/calendar",
    "/offline"
  ];

  console.log("=== PROBING RUNNING SERVER AT http://localhost:3001 ===");
  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:3001${r}`, { redirect: "manual" });
      console.log(`${r}: ${res.status} ${res.statusText} ${res.headers.get("location") || ""}`);
    } catch (e) {
      console.log(`${r}: ERROR ${e.message}`);
    }
  }
}

probe();

