// Shared by the fixtures: records which control the extension pressed, for scripts/e2e.mjs.
window.__cpr = { clicked: [] };
window.record = (name) => window.__cpr.clicked.push(name);
window.later = (ms, fn) => setTimeout(fn, ms);
window.on = (sel, fn, root = document) =>
  root.querySelector(sel).addEventListener('click', (e) => {
    e.preventDefault();
    fn(e);
  });
window.article = () => `
  <header style="padding:16px 32px;border-bottom:1px solid #ddd;font:700 20px system-ui">THE DAILY FIXTURE</header>
  <main style="max-width:680px;margin:32px auto;font:17px/1.6 Georgia,serif;color:#222">
    <h1>Local council approves new bike lanes</h1>
    ${'<p>The plan adds twelve kilometres of protected lanes over the next two years, connecting the station, the university and the old harbour. Residents had asked for safer routes for years.</p>'.repeat(14)}
  </main>`;
