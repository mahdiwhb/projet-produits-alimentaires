# 🥗 Santé Globale des Produits - Food Analytics Platform

Une plateforme complète de gestion et d'analyse nutritionnelle des produits alimentaires avec interface de visualisation interactive et synchronisation multi-base de données.

## 📋 Vue d'ensemble

Ce projet intègre trois couches principales:

- **Backend ETL** : Pipeline de transformation des données d'OpenFoodFacts vers SQLite
- **API REST** : Express.js avec endpoints documentés
- **Dashboard React** : Interface interactive avec visualisations en temps réel
- **Bases de données** : SQLite (primaire) + MongoDB (archivage/synchronisation)

## 🗄️ Structure des données

### Tables SQLite (source de vérité)

#### `products` (320 enregistrements)
Colonne principale contenant tous les produits alimentaires:

```sql
id (INT)                    -- Identifiant unique
raw_id (TEXT)              -- Identifiant source OpenFoodFacts
barcode (TEXT)             -- Code-barre EAN/UPC (UNIQUE)
subcategory_id (INT)       -- Lien vers sous-catégorie
product_name (TEXT)        -- Nom du produit
brand (TEXT)               -- Marque
nutriscore (TEXT)          -- Score nutritionnel (A-E)
energy_kcal_100g (REAL)    -- Calories pour 100g
sugars_100g (REAL)         -- Sucres pour 100g
salt_100g (REAL)           -- Sel pour 100g
protein_100g (REAL)        -- Protéines pour 100g (estimées si NULL)
price (REAL)               -- Prix unitaire
healthy_score (INT)        -- Score de santé 0-100 (calculé)
image_url (TEXT)           -- URL de l'image produit
```

**Caractéristiques:**
- Barcode est une colonne directe de la table `products` (fusionné)
- Tous les 320 produits ont un barcode
- Score de santé calculé automatiquement (0-100)
- Protéines estimées basées sur catégorie si manquantes

#### Autres tables

| Table | Docs | Contenu |
|-------|------|---------|
| `categories` | 12 | Catégories principales (Dairy, Meat, Grains, etc.) |
| `subcategories` | 61 | Sous-catégories détaillées (Cheese, Beef, Bread, etc.) |
| `allergens` | 14 | Types d'allergènes |
| `product_allergens` | 0 | Relations produit-allergène (optionnel) |
| `raw_products` | 320 | Archive des données brutes OpenFoodFacts |
| `enriched_products` | 320 | Archive des données enrichies post-traitement |

### Collections MongoDB (synchronisation)

Toutes les tables SQLite sont synchronisées vers MongoDB dans la base `pipeline_db`:

```
allergens               (14 docs)
categories            (12 docs)
subcategories         (61 docs)
products              (320 docs) ← Inclut barcodes
product_allergens     (0 docs)
enriched_products     (320 docs)
raw_products          (320 docs)
sync_metadata         (1 doc)    ← Métadonnées de synchro
```

## 🚀 Installation et démarrage

### Prérequis
- Node.js 18+
- SQLite3
- MongoDB 5.0+ (optionnel pour Compass)
- npm ou yarn

### Installation

```bash
# 1. Cloner/naviguer au projet
cd projet-data

# 2. Installer les dépendances racine
npm install

# 3. Installer par module
cd api && npm install
cd ../dashboard && npm install
cd ../etl && npm install
```

### Lancer les services

#### Option 1 : Démarrage manuel

```bash
# Terminal 1 - ETL (si régénération nécessaire)
cd etl
rm -f data.sqlite* && node etl.js

# Terminal 2 - API
cd api
npm start    # Port 4000

# Terminal 3 - Dashboard
cd dashboard
npm run dev  # Port 5175
```

#### Option 2 : Docker Compose

```bash
docker-compose up -d
```

## 📡 API REST

### Base URL
`http://localhost:4000`

### Endpoints

#### Catégories
```bash
GET /categories                          # Toutes les catégories
GET /categories/:id/subcategories        # Sous-catégories d'une catégorie
GET /subcategories/:id/products          # Produits paginés
GET /items/:id                           # Détails d'un produit
```

#### Recherche
```bash
GET /barcodes/:barcode                   # Trouver produit par code-barre
```

#### Statistiques
```bash
GET /stats                               # Statistiques nutritionnelles globales
```

### Réponse type `/stats`

```json
{
  "total": 320,
  "averages": {
    "avg_protein": 5.62,
    "avg_score": 36.04,
    "avg_kcal": 453.28,
    "avg_sugars": 19.96,
    "avg_salt": 1.21,
    "avg_price": null
  }
}
```

## 📊 Dashboard

Accueil: `http://localhost:5175`

### Pages disponibles

1. **Overview** - Statistiques clés principales
2. **Categories** - Analyse par catégorie avec table des produits
3. **Nutrition** - Comparaison nutritionnelle par subcatégorie
4. **Calories** - Analyse énergétique
5. **Settings** - Statistiques détaillées et filtres

### Caractéristiques

- 🎨 Thème sombre par défaut
- 📈 6+ types de graphiques (Pie, Bar, Line, Radar)
- ⌚ Animations fluides (Framer Motion)
- 📱 Interface responsive
- 🔄 Données en temps réel de l'API

## 🏗️ Architecture ETL

Pipeline des données OpenFoodFacts vers SQLite/MongoDB:

```
MongoDB (raw_products)
    ↓ [Extract]
Parse & Classify
    ↓ [Transform]
Estimate missing values (protein)
Calculate health scores (0-100)
    ↓ [Load]
SQLite (products table)
    ↓ [Sync]
MongoDB (products + 7 autres tables)
```

### Calculateurs

#### Score de santé (0-100)
```
Base: 50 points
+ Nutriscore (A:+30, B:+20, C:+10, D:-10, E:-30)
+ Protéine (>15g:+15, >8g:+8, >3g:+3)
- Sucres (>30g:-25, >20g:-15)
- Sel (>2g:-15)
- Calories (>400:-10)
= Clamped [0-100]
```

#### Estimation de protéines
Si `protein_100g` est NULL, estimation basée sur:
- **Subcatégorie** : Cheese=25g, Meat=26g, Fish=20g, Yogurt=5g, etc.
- **Catégorie** : Dairy=6g, Meat=22g, Legumes=12g, etc.
- **Défaut** : 4g/100g

## 📦 Fusion des barcodes

**Avant** : Table `product_barcodes` séparée avec 321 enregistrements  
**Après** : Colonne `barcode` directement dans `products`

**Avantages:**
- ✅ Structure simplifiée
- ✅ Requêtes plus rapides (pas de JOIN)
- ✅ Données produit unifiées
- ✅ Un barcode par produit garanti (UNIQUE)

## 🔄 Synchronisation MongoDB

### Déclenchement automatique
Chaque exécution de `etl.js` synchronise tous les 8 collections:

```bash
cd etl && node etl.js
# Output: ✅ Synced 320 products with barcodes
```

### Vérification
```bash
# Via script fourni
node verify-mongo-final.js
# Affiche: MongoDB Collections Status + Sample product
```

### Metadata
Collection `sync_metadata` contient:
```json
{
  "_id": "latest_sync",
  "collections": [...],
  "total_products": 320,
  "last_synced": "2026-02-19T10:30:00Z"
}
```

## 🧪 Tests

```bash
# Tests API
cd api && npm test

# Tests ETL
cd etl && npm test
```

## 📊 Statistiques actuelles

| Métrique | Valeur |
|----------|--------|
| Total produits | 320 |
| Avec barcode | 320 (100%) |
| Score moyen | 36.04 |
| Protéine moyenne | 5.63 g/100g |
| Calorie moyenne | 453.3 kcal/100g |
| Sucre moyen | 19.96 g/100g |
| Sel moyen | 1.21 g/100g |
| Catégories | 12 |
| Subcatégories | 61 |

## ⚙️ Configuration

### Variables d'environnement

```bash
# API
PORT=4000
SQLITE_PATH=./etl/data.sqlite

# ETL
MONGO_URI=mongodb://localhost:27017
DB_NAME=pipeline_db

# Dashboard
VITE_API_URL=http://localhost:4000
```

## 🐛 Troubleshooting

### API ne se lance pas
```bash
# Vérifier le port
lsof -i :4000

# Régénérer la base
cd etl && rm -f data.sqlite* && node etl.js
```

### Dashboard vide
```bash
# Vider le cache
Cmd+Shift+Delete → Clear cache

# Redémarrer
pkill -f vite
cd dashboard && npm run dev
```

### MongoDB ne synchronise pas
```bash
# Vérifier la connexion
mongosh mongodb://localhost:27017

# Relancer l'ETL
cd etl && node etl.js
```

## 📚 Stack technique

### Backend
- **Runtime** : Node.js 18+
- **Framework** : Express.js
- **DB Primaire** : SQLite3 (better-sqlite3)
- **DB Secondaire** : MongoDB
- **Transformation** : Custom ETL pipeline

### Frontend
- **Framework** : React 18
- **Build** : Vite 7.3.1
- **Graphiques** : Recharts 3.7.0
- **Animations** : Framer Motion 12.34.0
- **HTTP** : Axios

### Infrastructure
- **Cache** : API response caching
- **Indices** : SQLite indices sur clés fréquentes
- **Sync** : Automatique via ETL

## 📝 Licence

Projet académique - 2026

## 👥 Équipe

- Backend & ETL : Mahdi
- Frontend & Dashboard : Mahdi
- Infrastructure & MongoDB : Mahdi

*Développé avec ❤️ pour l'analyse nutritionnelle*

---

### 🎯 Prochaines améliorations possibles

- [ ] Recherche full-text sur produits
- [ ] Filtrage avancé par nutriments
- [ ] Export CSV/PDF
- [ ] Intégration API OpenFoodFacts live
- [ ] Ajout/édition de produits
- [ ] Profils utilisateur et favoris
- [ ] Comparaison de produits côte à côte
