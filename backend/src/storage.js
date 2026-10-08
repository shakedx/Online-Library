import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { del, get, put } from '@vercel/blob';
import { fail } from './http.js';

function safeName(value) {
  if (typeof value !== 'string' || !/^(?:books\/)?[a-zA-Z0-9-]+\.txt$/.test(value)) {
    fail(409, 'В БД указан небезопасный путь к TXT.');
  }
  return value;
}

export function decodeText(data) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    fail(400, 'TXT должен быть сохранён в UTF-8.');
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.trim() || /[\u0000-\u0008\u000b-\u000c\u000e-\u001f\u007f]/.test(text)) {
    fail(400, 'TXT пуст или содержит недопустимые управляющие символы.');
  }
  return text;
}

function localPath(config, storedPath) {
  const name = safeName(storedPath);
  if (name.includes('/')) fail(409, 'В БД указан путь другого типа хранилища.');
  return path.join(config.storagePath, name);
}

export async function writeText(config, text) {
  const name = `book-${randomUUID()}.txt`;
  if (config.storageDriver === 'vercel') {
    const pathname = `books/${name}`;
    try {
      await put(pathname, text, { access: 'private', addRandomSuffix: false, contentType: 'text/plain; charset=utf-8', token: config.blobToken });
      return pathname;
    } catch {
      fail(503, 'Не удалось сохранить TXT в хранилище.');
    }
  }
  try {
    await mkdir(config.storagePath, { recursive: true });
    await writeFile(localPath(config, name), text, { encoding: 'utf8', flag: 'wx' });
    return name;
  } catch {
    fail(503, 'Не удалось сохранить TXT в хранилище.');
  }
}

export async function readText(config, storedPath) {
  if (!storedPath) fail(404, 'Текст книги ещё не загружен.');
  let data;
  if (config.storageDriver === 'vercel') {
    safeName(storedPath);
    try {
      const result = await get(storedPath, { access: 'private', token: config.blobToken });
      if (!result || result.statusCode === 404) fail(404, 'TXT-файл книги отсутствует.');
      if (result.statusCode !== 200) fail(503, 'Не удалось прочитать TXT из хранилища.');
      data = Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch (error) {
      if (error.status) throw error;
      fail(503, 'Не удалось прочитать TXT из хранилища.');
    }
  } else {
    try {
      data = await readFile(localPath(config, storedPath));
    } catch (error) {
      if (error.code === 'ENOENT') fail(404, 'TXT-файл книги отсутствует.');
      if (error.status) throw error;
      fail(503, 'Не удалось прочитать TXT из хранилища.');
    }
  }
  if (data.length > config.maxBookSize) fail(413, 'TXT превышает допустимый размер.');
  try {
    return decodeText(data);
  } catch (error) {
    if (error.status === 400) fail(422, 'TXT-файл пуст, повреждён или содержит некорректный UTF-8.');
    throw error;
  }
}

export async function removeText(config, storedPath) {
  if (!storedPath) return true;
  try {
    if (config.storageDriver === 'vercel') {
      safeName(storedPath);
      await del(storedPath, { token: config.blobToken });
    } else {
      await unlink(localPath(config, storedPath)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    }
    return true;
  } catch {
    return false;
  }
}
