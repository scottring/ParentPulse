// Vector artwork: an open book whose page edges become an alpine ridgeline.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'Relish/Assets.xcassets/AppIcon.appiconset');
await fs.mkdir(assets, {recursive:true});
const palettes = {
  AppIcon: ['#446669', '#335155', '#edf1ea', '#c2d2ce', '#9fbab5', '#73928c'],
  'AppIcon-dark': ['#233c40', '#182c30', '#d9e3dc', '#a6bfb8', '#7a9f98', '#547b76'],
  'AppIcon-tinted': ['#484848', '#2e2e2e', '#f4f4f4', '#d8d8d8', '#acacac', '#848484'],
};
for (const [name, [top, bottom, paper, edge, mountain, ridge]] of Object.entries(palettes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="bg" x2=".2" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <linearGradient id="page"><stop stop-color="${paper}"/><stop offset=".92" stop-color="${paper}"/><stop offset="1" stop-color="${edge}"/></linearGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="28" stdDeviation="24" flood-opacity=".2"/></filter>
  <clipPath id="pages"><path d="M214 308Q356 276 498 363V734Q356 652 214 688Z M526 363Q668 276 810 308V688Q668 652 526 734Z"/></clipPath></defs>
  <path fill="url(#bg)" d="M0 0h1024v1024H0z"/>
  <circle cx="780" cy="226" r="31" fill="${paper}" opacity=".16"/>
  <g filter="url(#shadow)">
    <path d="M185 333Q343 302 512 389Q681 302 839 333V713Q664 683 512 769Q360 683 185 713Z" fill="${edge}"/>
    <path d="M214 308Q356 276 498 363V734Q356 652 214 688Z M526 363Q668 276 810 308V688Q668 652 526 734Z" fill="url(#page)"/>
    <g clip-path="url(#pages)">
      <path d="M178 605L307 412L391 506L461 459L531 555L625 412L713 504L791 438L857 590V710H178Z" fill="${mountain}" opacity=".65"/>
      <path d="M216 621L311 507L380 576L444 533L529 628L625 511L695 569L777 512L833 592V757H216Z" fill="${ridge}" opacity=".55"/>
      <path d="M306 415L277 504L309 478L333 500L322 465L367 480Z M625 416L596 504L625 476L648 501L643 470L681 482Z" fill="${paper}"/>
      <path d="M215 644Q362 612 498 699M526 699Q670 613 810 644" fill="none" stroke="${paper}" stroke-width="8" opacity=".8"/>
    </g>
    <path d="M512 392V741" stroke="${bottom}" stroke-width="7" stroke-linecap="round" opacity=".45"/>
    <path d="M687 297Q712 291 735 292V409L711 391L687 416Z" fill="${top}"/>
  </g></svg>`;
  await fs.writeFile(path.join(root, 'design', `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).flatten({background:bottom}).removeAlpha().png().toFile(path.join(assets, `${name}.png`));
}
await fs.writeFile(path.join(assets, 'Contents.json'), JSON.stringify({images:[
  {filename:'AppIcon.png',idiom:'universal',platform:'ios',size:'1024x1024'},
  {filename:'AppIcon-dark.png',idiom:'universal',platform:'ios',size:'1024x1024',appearances:[{appearance:'luminosity',value:'dark'}]},
  {filename:'AppIcon-tinted.png',idiom:'universal',platform:'ios',size:'1024x1024',appearances:[{appearance:'luminosity',value:'tinted'}]},
],info:{author:'xcode',version:1}},null,2)+'\n');
console.log('Generated three opaque 1024px Relish icons.');
