// Gera os ícones PNG do app a partir de um SVG (rodar: node scripts/icons.mjs)
import sharp from 'sharp';
const svg = (rx) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rx}" fill="#059669"/><path d="M186 120h104c56 0 92 28 92 74 0 30-17 52-44 61 34 8 56 33 56 68 0 50-39 81-101 81H186V120zm62 52v64h38c24 0 37-11 37-32s-13-32-37-32h-38zm0 112v68h46c26 0 40-12 40-34s-14-34-40-34h-46z" fill="#fff"/></svg>`);
await sharp(svg(0)).resize(512).png().toFile('public/icon-512.png');
await sharp(svg(0)).resize(192).png().toFile('public/icon-192.png');
await sharp(svg(0)).resize(180).png().toFile('public/apple-touch-icon.png');
console.log('ok');
