// Contrôle des deux forfaits dans un vrai navigateur.
//   node controle.cjs <port-avant> <port-apres> [--detail]
// 1. MV : chaque écran doit afficher le même texte avant et après.
// 2. Patronage : aucun mot du jeu ne doit s'afficher, pour le directeur,
//    l'éducateur, la famille connectée et la famille entrée par son code.
const { chromium } = require('playwright');
const fs = require('fs');
const [avant, apres] = process.argv.slice(2);
const DETAIL = process.argv.includes('--detail');
const MOTS = /vaillant|maisons? vaillante|\bmaisons?\b|foyer|badge|palier|bronze|\bargent\b|\bor\b|objectif|\bpoints?\b|\bpts\b|classement|c[ée]r[ée]monie|grand[- ]fr[èe]re|grande[- ]s[œo]eur|\bcorps\b|\b[âa]me\b|\bc[œo]eur\b|\besprit\b/i;
const DEPART = ['/piloter', '/mes-roles', '/preparer', '/jour-j', '/appel', '/archives', '/vaillants', '/educateurs',
  '/familles', '/familles/en-ligne', '/papiers', '/papiers/classeur', '/bibliotheque', '/galerie', '/documents',
  '/patro', '/conformite', '/securite', '/importer', '/vaillants/corbeille'];
const propre = (t) => t.replace(/\s+/g, ' ').replace(/code \d{4}/g, 'code NNNN').replace(/[0-9a-f]{16}…/g, 'empreinte…').trim();

async function parcourir(b, port, entree, options = {}) {
  const { depart = DEPART, max = 45, vp = { width: 1280, height: 900 } } = options;
  const c = await b.newContext({ viewport: vp }); const p = await c.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const base = `http://localhost:${port}`;
  await p.goto(base + entree); await p.waitForTimeout(1500);
  const vus = new Map(); const file = [new URL(p.url()).pathname, ...depart];
  while (file.length && vus.size < max) {
    const r = file.shift(); if (vus.has(r)) continue;
    await p.goto(base + r); await p.waitForTimeout(900);
    let texte = propre(await p.locator('body').innerText());
    if (options.fouille) {
      // Ce que le texte visible ne dit pas : les libellés d'accessibilité, les infobulles, les indications de champ.
      const attributs = await p.evaluate(() => [...document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')]
        .flatMap(e => ['aria-label', 'title', 'placeholder', 'alt'].map(a => e.getAttribute(a))).filter(Boolean).join(' | '));
      texte += ' ⟦attributs⟧ ' + propre(attributs);
      // Les dialogues et la recherche, là où ils s'ouvrent.
      for (const sel of ['#inscrire', '#modifier-vaillant', '#recherche', '#attester', '#selectionner']) {
        const b = p.locator(sel).first();
        if (!(await b.count()) || !(await b.isVisible().catch(() => false))) continue;
        await b.click().catch(() => {}); await p.waitForTimeout(350);
        texte += ' ⟦' + sel + '⟧ ' + propre(await p.locator('body').innerText());
        await p.keyboard.press('Escape'); await p.waitForTimeout(200);
        if (sel === '#selectionner') { await p.locator('#cb-fin').click().catch(() => {}); }
      }
    }
    vus.set(r, texte);
    const liens = await p.locator('#vue a[href^="/"]').evaluateAll(l => l.map(a => a.getAttribute('href')));
    // Une fiche d'enfant, une séance et une fiche d'éducateur suffisent par famille d'écrans.
    for (const l of liens) {
      const famille = l.replace(/\/[^/]*\d[^/]*/g, '/:id');
      if (![...vus.keys(), ...file].some(x => x.replace(/\/[^/]*\d[^/]*/g, '/:id') === famille)) file.push(l);
    }
  }
  await c.close();
  return { vus, erreurs };
}

(async () => {
  const b = await chromium.launch(); let mauvais = 0;
  // 1. Non-régression du forfait MV.
  for (const entree of ['/demo', '/demo/educateur', '/demo/famille', '/demo/parent']) {
    const depart = entree.includes('famille') || entree.includes('parent') ? [] : DEPART;
    const A = await parcourir(b, avant, entree, { depart }); const B = await parcourir(b, apres, entree, { depart });
    let ecarts = 0;
    for (const [r, t] of A.vus) {
      const u = B.vus.get(r);
      if (u !== t) { ecarts++; mauvais++;
        let i = 0; while (u && i < t.length && t[i] === u[i]) i++;
        console.log(`  MV ${entree} ${r} DIFFÈRE : avant «${t.slice(Math.max(0, i - 40), i + 60)}» après «${(u || '(absent)').slice(Math.max(0, i - 40), i + 60)}»`); }
    }
    console.log(`MV ${entree} : ${A.vus.size} écrans, ${ecarts} écart(s), erreurs avant ${A.erreurs.length} après ${B.erreurs.length}`);
    mauvais += B.erreurs.length;
  }
  // 2. Le forfait Patronage ne dit rien du jeu.
  const bilan = {};
  for (const [entree, role, depart] of [['/demo/patronage', 'directeur', DEPART], ['/demo/patronage/educateur', 'éducateur', DEPART],
    ['/demo/patronage/famille', 'famille (compte)', []], ['/demo/patronage/parent', 'famille (code)', []]]) {
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
      const R = await parcourir(b, apres, entree, { depart, vp, fouille: true });
      let fuites = 0;
      for (const [r, t] of R.vus) {
        const trouves = []; const re = new RegExp(MOTS.source, 'gi'); let m;
        while ((m = re.exec(t))) trouves.push(t.slice(Math.max(0, m.index - 28), m.index + m[0].length + 28));
        if (trouves.length) { fuites += trouves.length; bilan[`${role} ${r}`] = trouves;
          if (DETAIL && vp.width === 1280) console.log(`  ${role} ${r} (${trouves.length}) : ` + trouves.slice(0, 6).map(x => `«${x}»`).join(' '));
          else if (vp.width === 1280) console.log(`  ${role} ${r} : ${trouves.length}`); }
      }
      console.log(`Patronage ${role} ${vp.width}px : ${R.vus.size} écrans, ${fuites} mot(s) du jeu, ${R.erreurs.length} erreur(s)${R.erreurs.length ? ' → ' + R.erreurs[0] : ''}`);
      mauvais += fuites + R.erreurs.length;
    }
  }
  fs.writeFileSync(__dirname + '/controle-bilan.json', JSON.stringify(bilan, null, 1));
  await b.close(); process.exit(mauvais ? 1 : 0);
})();
