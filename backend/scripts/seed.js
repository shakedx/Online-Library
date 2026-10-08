import { normalizeDatabaseUrl } from '../src/config.js';
import { createPool } from '../src/db.js';

const examples = [
  ['Капитанская дочка', 'Александр Пушкин', 'Роман', 1836, 'История Петра Гринёва на фоне Пугачёвского восстания.'],
  ['Дубровский', 'Александр Пушкин', 'Роман', 1841, 'История дворянина, потерявшего имение и ставшего разбойником.'],
  ['Шинель', 'Николай Гоголь', 'Повесть', 1842, 'Петербургский чиновник мечтает о новой шинели.'],
  ['Каштанка', 'Антон Чехов', 'Рассказ', 1887, 'Потерявшаяся собака попадает к цирковому артисту.'],
];
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!databaseUrl) throw new Error('Set DATABASE_URL before seeding.');
const pool = createPool(databaseUrl);
let added = 0;
try {
  for (const [title, author, genre, publicationYear, description] of examples) {
    const result = await pool.query(`
      INSERT INTO books (title, author, genre, publication_year, description)
      SELECT $1, $2, $3, $4, $5
      WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = $1 AND author = $2)
      RETURNING id
    `, [title, author, genre, publicationYear, description]);
    added += result.rowCount;
  }
  console.log(`Добавлено книг: ${added}.`);
} finally {
  await pool.end();
}
