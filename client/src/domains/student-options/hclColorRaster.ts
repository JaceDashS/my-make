const PNG_SIGNATURE = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
]);

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type PickerImageOptions = {
  chromaMax: number;
  chromaMin?: number;
  height: number;
  hueMax?: number;
  hueMin?: number;
  lightness: number;
  width: number;
};

const pickerImageCache = new Map<string, string>();

export function buildHclPickerImageDataUri({
  chromaMax,
  chromaMin = 0,
  height,
  hueMax = 360,
  hueMin = 0,
  lightness,
  width,
}: PickerImageOptions) {
  const cacheKey = [
    width,
    height,
    hueMin,
    hueMax,
    chromaMin,
    chromaMax,
    Number(lightness.toFixed(2)),
  ].join(':');
  const cached = pickerImageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const hue = hueMin + (x / (width - 1)) * (hueMax - hueMin);
      const chroma =
        chromaMin +
        ((height - 1 - y) / (height - 1)) * (chromaMax - chromaMin);
      const rgb = hclToRgb(hue, chroma, lightness);
      const offset = (y * width + x) * 4;

      rgba[offset] = rgb.r;
      rgba[offset + 1] = rgb.g;
      rgba[offset + 2] = rgb.b;
      rgba[offset + 3] = 255;
    }
  }

  const dataUri = `data:image/png;base64,${encodePngToBase64({height, rgba, width})}`;
  pickerImageCache.set(cacheKey, dataUri);
  return dataUri;
}

export function hclToHexColor(h: number, c: number, l: number) {
  const {r, g, b} = hclToRgb(h, c, l);
  return `#${[r, g, b]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hclToRgb(h: number, c: number, l: number): RgbColor {
  const hueRadians = (h * Math.PI) / 180;
  const a = Math.cos(hueRadians) * c;
  const b = Math.sin(hueRadians) * c;
  const xyz = labToXyz(l, a, b);
  return xyzToRgb(xyz.x, xyz.y, xyz.z);
}

function labToXyz(L: number, a: number, b: number) {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const x3 = Math.pow(x, 3);
  const y3 = Math.pow(y, 3);
  const z3 = Math.pow(z, 3);

  x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
  y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
  z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

  return {
    x: refX * x,
    y: refY * y,
    z: refZ * z,
  };
}

function xyzToRgb(x: number, y: number, z: number): RgbColor {
  let nx = x / 100;
  let ny = y / 100;
  let nz = z / 100;

  let r = nx * 3.2406 + ny * -1.5372 + nz * -0.4986;
  let g = nx * -0.9689 + ny * 1.8758 + nz * 0.0415;
  let b = nx * 0.0557 + ny * -0.204 + nz * 1.057;

  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);

  return {
    r: Math.round(clamp(r, 0, 1) * 255),
    g: Math.round(clamp(g, 0, 1) * 255),
    b: Math.round(clamp(b, 0, 1) * 255),
  };
}

function gammaCorrect(value: number) {
  return value > 0.0031308
    ? 1.055 * Math.pow(value, 1 / 2.4) - 0.055
    : 12.92 * value;
}

function encodePngToBase64({
  height,
  rgba,
  width,
}: {
  height: number;
  rgba: Uint8Array;
  width: number;
}) {
  const scanlineLength = width * 4 + 1;
  const raw = new Uint8Array(scanlineLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * scanlineLength;
    raw[rowStart] = 0;
    raw.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      rowStart + 1,
    );
  }

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = buildZlibStore(raw);
  const png = concatBytes(
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', new Uint8Array(0)),
  );

  return bytesToBase64(png);
}

function buildZlibStore(data: Uint8Array) {
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  let offset = 0;

  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(65535, remaining);
    const isFinal = offset + blockSize >= data.length;
    const header = new Uint8Array(5 + blockSize);

    header[0] = isFinal ? 0x01 : 0x00;
    header[1] = blockSize & 0xff;
    header[2] = (blockSize >> 8) & 0xff;

    const nlen = (~blockSize) & 0xffff;
    header[3] = nlen & 0xff;
    header[4] = (nlen >> 8) & 0xff;
    header.set(data.subarray(offset, offset + blockSize), 5);

    blocks.push(header);
    offset += blockSize;
  }

  const checksum = new Uint8Array(4);
  writeUint32(checksum, 0, adler32(data));
  blocks.push(checksum);

  return concatBytes(...blocks);
}

function createChunk(type: string, data: Uint8Array) {
  const typeBytes = new Uint8Array(
    type.split('').map(character => character.charCodeAt(0)),
  );
  const length = new Uint8Array(4);
  writeUint32(length, 0, data.length);
  const crcPayload = concatBytes(typeBytes, data);
  const crc = new Uint8Array(4);
  writeUint32(crc, 0, crc32(crcPayload));

  return concatBytes(length, crcPayload, crc);
}

function concatBytes(...arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  arrays.forEach(array => {
    result.set(array, offset);
    offset += array.length;
  });

  return result;
}

function writeUint32(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = (value >>> 24) & 0xff;
  buffer[offset + 1] = (value >>> 16) & 0xff;
  buffer[offset + 2] = (value >>> 8) & 0xff;
  buffer[offset + 3] = value & 0xff;
}

function adler32(data: Uint8Array) {
  let a = 1;
  let b = 0;

  for (let index = 0; index < data.length; index += 1) {
    a = (a + data[index]) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (let index = 0; index < data.length; index += 1) {
    crc ^= data[index];

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triplet = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);

    output += BASE64_ALPHABET[(triplet >> 18) & 63];
    output += BASE64_ALPHABET[(triplet >> 12) & 63];
    output += b === undefined ? '=' : BASE64_ALPHABET[(triplet >> 6) & 63];
    output += c === undefined ? '=' : BASE64_ALPHABET[triplet & 63];
  }

  return output;
}
