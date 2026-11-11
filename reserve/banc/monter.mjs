import { monterBase } from './socle.mjs';
const { echecs, retraits, fichiers } = await monterBase(process.argv[2], { verbeux: false });
console.log(fichiers.length, 'migrations,', echecs.length, 'échecs');
for (const r of retraits) console.log(' ~ retrait', r.f, r.fonction);
for (const e of echecs) console.log(' -', e.f, '→', e.message.slice(0, 200));
