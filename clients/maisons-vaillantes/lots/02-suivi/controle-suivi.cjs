// Le suivi des patros dans l'écran de la plateforme, en démonstration, à 1280 et 390 px,
// en clair et en sombre. Joué sur le serveur de développement de mv-app (modules séparés),
// pour pouvoir simuler une panne de la lecture du suivi en réécrivant un module au vol.
// Tout trafic hors de localhost est coupé.
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://localhost:4181';

(async () => {
  const b = await chromium.launch();
  const bilan = [];
  const note = (nom, ok, detail = '') => bilan.push(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' → ' + detail : ''}`);

  for (const [l, h, schema] of [[1280, 900, 'light'], [390, 800, 'light'], [390, 800, 'dark']]) {
    const c = await b.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1, colorScheme: schema });
    await c.route(u => !u.href.startsWith(U), r => r.abort());
    // L'application démarre en jour tant qu'on n'a rien choisi : le sombre se choisit.
    if (schema === 'dark') await c.addInitScript(() => { try { localStorage.setItem('mv2_theme', 'dark'); } catch (_) {} });
    const p = await c.newPage();
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(U + '/demo/plateforme'); await p.waitForTimeout(2500);
    const t = `${l}px ${schema}`;
    const cartes = p.locator('.sv-carte');
    note(`${t} : le suivi s'ouvre en tête`, await p.locator('h2', { hasText: 'Le suivi des patros' }).count() === 1);
    note(`${t} : une carte par patro`, await cartes.count() === 4, String(await cartes.count()));
    const signaux = await cartes.evaluateAll(cs => cs.map(c => c.dataset.signal));
    note(`${t} : à relancer d'abord, puis pas démarré`, signaux[0] === 'a_relancer' && signaux[1] === 'pas_demarre', signaux.join());
    note(`${t} : le portillon reste là`, await p.locator('text=Inviter un patronage').count() === 1);
    note(`${t} : plus de liste des patros en double`, await p.locator('h2', { hasText: 'Les patros et leur forfait' }).count() === 0);

    const mv = p.locator('[data-suivi-patro="demo-p1"]'), pat = p.locator('[data-suivi-patro="demo-p3"]');
    note(`${t} : une carte MV compte ses foyers`, await mv.locator('dt', { hasText: 'foyers' }).count() === 1);
    note(`${t} : une carte Patronage ne les compte pas`, await pat.locator('dt', { hasText: 'foyers' }).count() === 0);
    note(`${t} : une date absente se dit « jamais »`, (await p.locator('[data-suivi-patro="demo-p4"] .sv-dates').innerText()).includes('jamais'));
    note(`${t} : la mise en route se lit`, /\d+ \/ \d+/.test(await pat.locator('.sv-route-tete').innerText()));

    // Le filtre.
    await p.click('[data-filtre="a_relancer"]'); await p.waitForTimeout(200);
    note(`${t} : filtrer « À relancer »`, await cartes.count() === 1
      && await p.locator('[data-filtre="a_relancer"]').getAttribute('aria-pressed') === 'true');
    await p.click('[data-filtre="tous"]'); await p.waitForTimeout(200);
    note(`${t} : revenir à « Tous »`, await cartes.count() === 4);

    if (schema === 'light' || l === 390) await p.screenshot({ path: `${__dirname}/suivi-${l}-${schema}.png`, fullPage: true });

    // Passer un patro Patronage en MV depuis sa carte : ses foyers apparaissent.
    await p.selectOption('[data-forfait-patro="demo-p3"]', 'mv'); await p.waitForTimeout(300);
    note(`${t} : changer le forfait demande confirmation`, await p.locator('dialog[open]').count() === 1);
    await p.click('dialog[open] [data-oui]'); await p.waitForTimeout(500);
    note(`${t} : la carte suit le forfait`, await p.locator('[data-suivi-patro="demo-p3"] dt', { hasText: 'foyers' }).count() === 1
      && /\/ 10/.test(await p.locator('[data-suivi-patro="demo-p3"] .sv-route-tete').innerText()));

    note(`${t} : pas de défilement horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    if (schema === 'dark') note(`${t} : le sombre est appliqué`, await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
    note(`${t} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' | '));
    await c.close();
  }

  // La panne : la lecture du suivi échoue, le portillon reste utilisable.
  const c = await b.newContext({ viewport: { width: 390, height: 800 } });
  await c.route(u => !u.href.startsWith(U), r => r.abort());
  await c.route(u => /\/src\/demo-plateforme\.js/.test(u.href), async (r) => {
    const rep = await r.fetch(); let corps = await rep.text();
    corps = corps.replace('suivi: () => ({', "suivi: () => { throw Object.assign(new Error('Failed to fetch'), { code: '' }); },\n  _suivi: () => ({");
    await r.fulfill({ response: rep, body: corps });
  });
  const p = await c.newPage();
  await p.goto(U + '/demo/plateforme'); await p.waitForTimeout(2500);
  note('panne : le suivi dit qu’il ne se lit pas', await p.locator('text=Le suivi ne se lit pas').count() === 1);
  note('panne : le portillon reste utilisable', await p.locator('#p-inviter').count() === 1);
  note('panne : la liste des patros et leur forfait revient', await p.locator('[data-forfait-patro]').count() === 4);
  await p.screenshot({ path: `${__dirname}/suivi-panne-390.png`, fullPage: true });
  await c.close();
  await b.close();

  console.log(bilan.join('\n'));
  const ko = bilan.filter(x => x.startsWith('ÉCHEC')).length;
  console.log(`\n${bilan.length - ko}/${bilan.length} contrôles`);
  process.exit(ko ? 1 : 0);
})();
