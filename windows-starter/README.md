# Starter Windows - Stock Batteries

Application desktop Windows (Electron) pour une boutique de batteries voiture/camion/moto.

## Prérequis
- Node.js 20+
- npm 10+

## Lancer en développement
```bash
npm install
npm run dev
```

## Générer l'exécutable Windows
```bash
npm run dist
```

Le setup sera généré dans le dossier `dist/`.

## Fonctions incluses
- Base SQLite locale automatique
- Création et suppression de produits
- Mouvements de stock (entrée/sortie) avec contrôle stock insuffisant
- Historique des 100 derniers mouvements
- Alerte visuelle de stock bas

## API renderer exposée
- `window.api.listProducts()`
- `window.api.createProduct(payload)`
- `window.api.deleteProduct(id)`
- `window.api.moveStock(payload)`
- `window.api.stockHistory()`

## Prochaines étapes
- Module ventes + ticket PDF
- Authentification utilisateurs (admin/vendeur)
- Export/backup/restauration de la base SQLite
- Import CSV catalogue batteries
