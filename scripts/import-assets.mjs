import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
const entries = [
  ['hue', 'Imperial_City_of_Huế'],
  ['hoi-an', 'Hội_An_Old_Town'],
  ['my-son', 'My_Son_Sanctuary'],
  ['ha-long', 'Hạ_Long_Bay'],
  ['thang-long', 'Imperial_Citadel_of_Thăng_Long'],
  ['trang-an', 'Tràng_An_Scenic_Landscape_Complex'],
];
await mkdir('public/images', { recursive: true });
await copyFile('asset/logo.png', 'public/images/logo.png');
const manifest = [];
for (const [id, title] of entries) {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  );
  if (!response.ok) throw new Error(`Wikipedia ${id}: ${response.status}`);
  const summary = await response.json();
  const original = new URL(summary.originalimage.source);
  const parts = original.pathname.split('/');
  const fileTitle =
    id === 'thang-long'
      ? 'Đoan Môn, Hoàng thành Thăng Long, Hà Nội 001.JPG'
      : decodeURIComponent(original.pathname.includes('/thumb/') ? parts.at(-2) : parts.at(-1));
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
  });
  const info = await (await fetch(api)).json();
  const ii = Object.values(info.query.pages)[0].imageinfo[0];
  const metadata = ii.extmetadata;
  const license = metadata.LicenseShortName?.value || '';
  if (!/CC|Public domain/i.test(license)) throw new Error(`Review license for ${id}: ${license}`);
  const imageUrl = ii.thumburl || ii.url;
  const photo = await fetch(imageUrl);
  if (!photo.ok) throw new Error(`Image ${id}: ${photo.status}`);
  const ext = path.extname(new URL(ii.url).pathname).toLowerCase();
  const local = `/images/${id}${ext}`;
  await writeFile(`public${local}`, Buffer.from(await photo.arrayBuffer()));
  const plain = (s) =>
    (s || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .trim();
  let coordinates = summary.coordinates;
  let coordinateSource = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  if (id === 'hoi-an') {
    const town = await (
      await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/H%E1%BB%99i_An_(city)')
    ).json();
    coordinates = town.coordinates;
    coordinateSource = 'https://en.wikipedia.org/wiki/Hội_An_(city)';
  }
  manifest.push({
    id,
    image: local,
    title: fileTitle,
    author: plain(metadata.Artist?.value),
    license,
    licenseUrl: (
      metadata.LicenseUrl?.value || 'https://creativecommons.org/publicdomain/mark/1.0/'
    ).replace('http://', 'https://'),
    source: ii.descriptionurl,
    coordinates,
    coordinateSource,
    importedAt: new Date().toISOString().slice(0, 10),
  });
  console.log(`${id}: ${license}, ${local}`);
}
await writeFile('src/data/image-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
// Provenance stays alongside local originals; never use the UI reference poster as a site photograph.
await mkdir('asset/heritage', { recursive: true });
for (const item of manifest)
  await copyFile(`public${item.image}`, `asset/heritage/${path.basename(item.image)}`);
await writeFile('asset/heritage/attribution.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Imported licensed heritage photographs and attribution.');
