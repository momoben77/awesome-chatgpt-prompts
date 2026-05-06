import React, { useEffect, useState } from 'react';

const EMPTY = {
  sku: '',
  brand: '',
  model: '',
  category: 'voiture',
  voltage_v: 12,
  capacity_ah: 60,
  stock_qty: 0,
  min_stock_alert: 2,
  sale_price: 0
};

const EMPTY_MOVE = {
  product_id: '',
  movement_type: 'entree',
  quantity: 1,
  note: ''
};

export function App() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVE);
  const [error, setError] = useState('');

  const load = async () => {
    const [products, moves] = await Promise.all([window.api.listProducts(), window.api.stockHistory()]);
    setItems(products);
    setHistory(moves);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await window.api.createProduct({
        ...form,
        voltage_v: Number(form.voltage_v),
        capacity_ah: Number(form.capacity_ah),
        stock_qty: Number(form.stock_qty),
        min_stock_alert: Number(form.min_stock_alert),
        sale_price: Number(form.sale_price)
      });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(`Erreur création produit: ${err.message}`);
    }
  };

  const onDelete = async (id) => {
    setError('');
    try {
      await window.api.deleteProduct(id);
      await load();
    } catch (err) {
      setError(`Erreur suppression: ${err.message}`);
    }
  };

  const onMove = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await window.api.moveStock({
        ...moveForm,
        product_id: Number(moveForm.product_id),
        quantity: Number(moveForm.quantity)
      });
      setMoveForm(EMPTY_MOVE);
      await load();
    } catch (err) {
      setError(`Erreur mouvement stock: ${err.message}`);
    }
  };

  return (
    <main className="container">
      <h1>Stock Batteries (Windows Starter)</h1>
      {error && <p className="error">{error}</p>}

      <form className="card" onSubmit={onSubmit}>
        <h2>Nouveau produit</h2>
        <div className="grid">
          {Object.keys(EMPTY).map((field) => (
            <label key={field}>
              {field}
              {field === 'category' ? (
                <select value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}>
                  <option value="voiture">voiture</option>
                  <option value="camion">camion</option>
                  <option value="moto">moto</option>
                </select>
              ) : (
                <input
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required={['sku', 'brand', 'model'].includes(field)}
                />
              )}
            </label>
          ))}
        </div>
        <button type="submit">Ajouter</button>
      </form>

      <form className="card" onSubmit={onMove}>
        <h2>Mouvement de stock</h2>
        <div className="grid movement-grid">
          <label>
            Produit
            <select
              value={moveForm.product_id}
              onChange={(e) => setMoveForm({ ...moveForm, product_id: e.target.value })}
              required
            >
              <option value="">-- choisir --</option>
              {items.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} - {p.brand} {p.model}</option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={moveForm.movement_type}
              onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value })}
            >
              <option value="entree">entrée</option>
              <option value="sortie">sortie</option>
            </select>
          </label>
          <label>
            Quantité
            <input
              type="number"
              min="1"
              value={moveForm.quantity}
              onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })}
              required
            />
          </label>
          <label>
            Note
            <input
              value={moveForm.note}
              onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })}
            />
          </label>
        </div>
        <button type="submit">Valider mouvement</button>
      </form>

      <section className="card">
        <h2>Produits</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th><th>Marque</th><th>Modèle</th><th>Catégorie</th><th>Stock</th><th>Seuil</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={p.stock_qty <= p.min_stock_alert ? 'low' : ''}>
                <td>{p.sku}</td>
                <td>{p.brand}</td>
                <td>{p.model}</td>
                <td>{p.category}</td>
                <td>{p.stock_qty}</td>
                <td>{p.min_stock_alert}</td>
                <td><button className="danger" onClick={() => onDelete(p.id)}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Historique stock (100 derniers)</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Produit</th><th>Type</th><th>Qté</th><th>Note</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.created_at}</td>
                <td>{h.sku} - {h.brand} {h.model}</td>
                <td>{h.movement_type}</td>
                <td>{h.quantity}</td>
                <td>{h.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
