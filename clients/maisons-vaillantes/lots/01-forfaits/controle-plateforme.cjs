// Le parcours de l'écran de la plateforme en démonstration, à 1280 et 390 px.
const { chromium } = require('playwright');
const U = 'http://localhost:4180';
(async () => {
  const b = await chromium.launch();
  const bilan = [];
  const note = (nom, ok, detail = '') => bilan.push(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' → ' + detail : ''}`);
  for (const [l, h, schema] of [[1280, 900, 'light'], [390, 800, 'light'], [390, 800, 'dark']]) {
    const c = await b.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1, colorScheme: schema });
    const p = await c.newPage();
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(U + '/demo/plateforme'); await p.waitForTimeout(1500);
    const t = `${l}px ${schema}`;
    note(`${t} : l'écran s'ouvre`, await p.locator('text=Inviter un patronage').count() === 1);
    note(`${t} : trois patros avec leur forfait`, await p.locator('[data-forfait-patro]').count() === 3);
    note(`${t} : forfait proposé d'abord = patronage`, await p.locator('#p-forfait').inputValue() === 'patronage');
    await p.screenshot({ path: `${__dirname}/plateforme-${l}-${schema}.png`, fullPage: true });

    // Inviter en Maisons Vaillantes.
    await p.fill('#p-email', 'nouveau@patro-exemple.fr');
    await p.selectOption('#p-forfait', 'mv');
    await p.click('#p-inviter'); await p.waitForTimeout(500);
    note(`${t} : invitation créée en mv`,
      await p.locator('[data-forfait-invitation="nouveau@patro-exemple.fr"]').inputValue() === 'mv');

    // Régler une invitation ouverte.
    await p.selectOption('[data-forfait-invitation="nouveau@patro-exemple.fr"]', 'patronage'); await p.waitForTimeout(400);
    note(`${t} : invitation réglée sur patronage`,
      await p.locator('[data-forfait-invitation="nouveau@patro-exemple.fr"]').inputValue() === 'patronage');

    // Changer un patro : refuser d'abord, accepter ensuite.
    await p.selectOption('[data-forfait-patro="demo-p1"]', 'patronage'); await p.waitForTimeout(300);
    note(`${t} : la confirmation s'ouvre`, await p.locator('dialog[open]').count() === 1);
    if (l === 390 && schema === 'light') await p.screenshot({ path: `${__dirname}/plateforme-confirmation-390.png` });
    await p.click('dialog[open] [data-non]'); await p.waitForTimeout(400);
    note(`${t} : annuler ne change rien`, await p.locator('[data-forfait-patro="demo-p1"]').inputValue() === 'mv');
    await p.selectOption('[data-forfait-patro="demo-p1"]', 'patronage'); await p.waitForTimeout(300);
    await p.click('dialog[open] [data-oui]'); await p.waitForTimeout(400);
    note(`${t} : confirmer change le forfait`, await p.locator('[data-forfait-patro="demo-p1"]').inputValue() === 'patronage');

    // Rien ne déborde en largeur.
    const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    note(`${t} : pas de défilement horizontal`, !deborde);
    // Le rechargement garde l'accès.
    await p.reload(); await p.waitForTimeout(1200);
    note(`${t} : l'accès tient au rechargement`, await p.locator('text=Inviter un patronage').count() === 1);
    note(`${t} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' | '));
    await c.close();
  }
  // La démonstration ordinaire ne montre pas la plateforme, même après être passé par elle.
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
  await p.goto(U + '/demo/plateforme'); await p.waitForTimeout(1000);
  await p.goto(U + '/demo'); await p.waitForTimeout(1200);
  note('démo directeur : pas de lien Plateforme', await p.locator('a[href="/plateforme"]').count() === 0);
  await p.goto(U + '/plateforme'); await p.waitForTimeout(1000);
  const txt = await p.locator('#vue').innerText();
  note('démo directeur : écran réservé, sans nommer MV', /Réservé à la plateforme/.test(txt) && !/Vaillant/i.test(txt), txt.slice(0, 120));
  await b.close();
  console.log(bilan.join('\n'));
  process.exit(bilan.some(x => x.startsWith('ÉCHEC')) ? 1 : 0);
})();
