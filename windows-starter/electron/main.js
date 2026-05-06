const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const isDev = !!process.env.VITE_DEV_SERVER_URL;
let db;

function sanitizeCategory(value) {
  const allowed = ['voiture', 'camion', 'moto'];
  return allowed.includes(value) ? value : 'voiture';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  return Math.max(0, Math.trunc(toNumber(value, fallback)));
}

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'stock-batteries.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('voiture','camion','moto')),
      voltage_v REAL NOT NULL,
      capacity_ah REAL NOT NULL,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('entree', 'sortie')),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDb();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('products:list', () => {
  return db.prepare('SELECT * FROM products ORDER BY id DESC').all();
});

ipcMain.handle('products:create', (_, payload) => {
  const data = {
    sku: String(payload.sku || '').trim(),
    brand: String(payload.brand || '').trim(),
    model: String(payload.model || '').trim(),
    category: sanitizeCategory(payload.category),
    voltage_v: Math.max(0, toNumber(payload.voltage_v, 12)),
    capacity_ah: Math.max(0, toNumber(payload.capacity_ah, 60)),
    stock_qty: toInt(payload.stock_qty, 0),
    min_stock_alert: toInt(payload.min_stock_alert, 0),
    sale_price: Math.max(0, toNumber(payload.sale_price, 0))
  };

  const stmt = db.prepare(`
    INSERT INTO products (sku, brand, model, category, voltage_v, capacity_ah, stock_qty, min_stock_alert, sale_price)
    VALUES (@sku, @brand, @model, @category, @voltage_v, @capacity_ah, @stock_qty, @min_stock_alert, @sale_price)
  `);

  const result = stmt.run(data);
  return { id: result.lastInsertRowid };
});

ipcMain.handle('products:delete', (_, id) => {
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  return { deleted: stmt.run(id).changes };
});

ipcMain.handle('stock:move', (_, payload) => {
  const product = db.prepare('SELECT id, stock_qty FROM products WHERE id = ?').get(payload.product_id);
  if (!product) throw new Error('Produit introuvable');

  const quantity = toInt(payload.quantity, 0);
  if (quantity <= 0) throw new Error('Quantité invalide');

  const movementType = payload.movement_type === 'sortie' ? 'sortie' : 'entree';
  const nextStock = movementType === 'entree' ? product.stock_qty + quantity : product.stock_qty - quantity;

  if (nextStock < 0) throw new Error('Stock insuffisant');

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO stock_movements (product_id, movement_type, quantity, note) VALUES (?, ?, ?, ?)'
    ).run(product.id, movementType, quantity, String(payload.note || ''));

    db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?').run(nextStock, product.id);
  });

  tx();
  return { ok: true };
});

ipcMain.handle('stock:history', () => {
  return db.prepare(`
    SELECT sm.id, p.sku, p.brand, p.model, sm.movement_type, sm.quantity, sm.note, sm.created_at
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    ORDER BY sm.id DESC
    LIMIT 100
  `).all();
});
