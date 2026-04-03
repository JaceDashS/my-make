#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Jimp, ResizeStrategy } = require('jimp');
const pngToIcoModule = require('png-to-ico');

const pngToIco = pngToIcoModule.default || pngToIcoModule.imagesToIco;

const rootDir = path.resolve(__dirname, '..');
const sourceIconPath = path.join(rootDir, 'icon.png');
const clientDir = path.join(rootDir, 'client');
const electronIconDir = path.join(clientDir, 'build', 'icons');
const electronWinDir = path.join(electronIconDir, 'win');
const electronRuntimeDir = path.join(electronIconDir, 'runtime');
const androidResDir = path.join(clientDir, 'android', 'app', 'src', 'main', 'res');

const electronIcoSizes = [16, 24, 32, 48, 64, 128, 256];
const androidIconSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function assertSourceIconExists() {
  if (!fs.existsSync(sourceIconPath)) {
    throw new Error(`Source icon not found: ${sourceIconPath}`);
  }
}

function calculateFit(width, height, targetSize) {
  const scale = Math.min(targetSize / width, targetSize / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function renderSquareIcon(sourceImage, size, options = {}) {
  const { round = false } = options;
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
  const fit = calculateFit(sourceImage.bitmap.width, sourceImage.bitmap.height, size);
  const resized = sourceImage.clone().resize({
    w: fit.width,
    h: fit.height,
    mode: ResizeStrategy.BICUBIC,
  });
  const x = Math.floor((size - fit.width) / 2);
  const y = Math.floor((size - fit.height) / 2);

  canvas.composite(resized, x, y);

  if (round) {
    canvas.circle();
  }

  return canvas;
}

async function writePng(image, filePath) {
  ensureDir(path.dirname(filePath));
  await image.write(filePath);
}

async function generateElectronIcons(sourceImage) {
  ensureDir(electronWinDir);
  ensureDir(electronRuntimeDir);

  const icoBuffers = [];

  for (const size of electronIcoSizes) {
    const icon = await renderSquareIcon(sourceImage, size);
    const pngBuffer = await icon.getBuffer('image/png');
    icoBuffers.push(pngBuffer);

    if (size === 256) {
      await writePng(icon, path.join(electronRuntimeDir, 'app-icon.png'));
    }
  }

  const icoBuffer = await pngToIco(icoBuffers);
  fs.writeFileSync(path.join(electronWinDir, 'icon.ico'), icoBuffer);
}

async function generateAndroidIcons(sourceImage) {
  for (const [density, size] of Object.entries(androidIconSizes)) {
    const targetDir = path.join(androidResDir, `mipmap-${density}`);
    const squareIcon = await renderSquareIcon(sourceImage, size);
    const roundIcon = await renderSquareIcon(sourceImage, size, { round: true });

    await writePng(squareIcon, path.join(targetDir, 'ic_launcher.png'));
    await writePng(roundIcon, path.join(targetDir, 'ic_launcher_round.png'));
  }
}

async function main() {
  assertSourceIconExists();

  const sourceImage = await Jimp.read(sourceIconPath);

  await generateElectronIcons(sourceImage);
  await generateAndroidIcons(sourceImage);

  console.log('Generated Electron and Android app icons from', sourceIconPath);
}

main().catch((error) => {
  console.error('[generate-app-icons] Failed:', error.message);
  process.exitCode = 1;
});
