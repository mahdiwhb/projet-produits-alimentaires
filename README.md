🍎 Food Analytics – Full-Stack Data Pipeline

Projet d’administration BDD / data full-stack.

Pipeline complet :
Collecte → MongoDB (RAW) → MongoDB (ENRICHED) → ETL → SQLite (SQL) → API Express → Dashboard React

📌 Objectif du projet

Mettre en place une architecture complète de traitement de données :

Collecte de données depuis une API publique (OpenFoodFacts)

Stockage brut (RAW)

Enrichissement métier

Intégration vers une base SQL

Exposition via API REST

Visualisation via un dashboard moderne

🏗️ Architecture du projet
1️⃣ Collecte (Collector)

Source : OpenFoodFacts API

Récupération de 300+ produits

Insertion en MongoDB dans la collection raw

Données stockées sans modification

2️⃣ Enrichissement

Lecture de la collection RAW

Normalisation des nutriments :

energy_kcal_100g

sugars_100g

salt_100g

Calcul d’un healthy_score

Insertion dans la collection enriched

Gestion d’un champ status (success / failed)

3️⃣ ETL (Mongo → SQL)

Lecture des données enriched avec status=success

Transformation vers modèle relationnel

Insertion / upsert dans SQLite

Base utilisée : data.sqlite

4️⃣ API REST (Express)

Endpoints :

GET /items?page=1&pageSize=10

GET /items/:id

GET /stats

Fonctionnalités :

Pagination

Filtres

Statistiques agrégées

Format JSON

5️⃣ Dashboard React

Technologies :

React

Recharts

Framer Motion

Axios

Fonctionnalités :

KPI dynamiques

Graphiques (Pie + Bar)

Table paginée

Tri dynamique

4 filtres minimum :

Recherche texte

Nutriscore

Catégorie

Score minimum

Export CSV

Modal détail produit

Thème Dark / Light

🛠️ Choix techniques
Technologie	-Justification
Node.js-Simplicité et rapidité d’implémentation
MongoDB-Adapté aux données semi-structurées RAW
SQLite-Base SQL légère, facile à déployer localement
Express-API REST simple et efficace
React-Interface moderne
Recharts-Graphiques simples et performants
Docker-Isolation de MongoDB

SQLite a été choisi pour simplifier l’installation par rapport à PostgreSQL tout en respectant les exigences SQL.

📂 Structure du dépôt
projet-data/
├── collector/
├── enrichment/
├── etl/
│   └── schema.sql
├── api/
├── dashboard/
├── docker-compose.yml
├── README.md
⚙️ Installation
Prérequis

Node.js (LTS recommandé)

Docker Desktop

Git

1️⃣ Cloner le projet
git clone https://github.com/TON_USERNAME/TON_REPO.git
cd TON_REPO
2️⃣ Lancer MongoDB
docker compose up -d
docker ps
3️⃣ Installer les dépendances
cd collector && npm install && cd ..
cd enrichment && npm install && cd ..
cd etl && npm install && cd ..
cd api && npm install && cd ..
cd dashboard && npm install && cd ..
▶️ Exécution du pipeline

Lancer dans cet ordre :

1) Collecte
cd collector
node collect.js
2) Enrichissement
cd ../enrichment
node enrich.js
3) ETL
cd ../etl
node etl.js
🚀 Lancer l’API
cd api
npm run dev

API disponible sur :

http://localhost:4000
📊 Lancer le Dashboard

Dans un second terminal :

cd dashboard
npm run dev

Ouvrir :

http://localhost:5173
🧪 Tests

Tests unitaires :

Calcul healthy_score

Normalisation nutriments

Tests d’intégration :

GET /items

GET /stats

Lancer :

npm test

(selon configuration du dossier tests)

🗄️ Schéma SQL

Le schéma SQL est fourni dans :

etl/schema.sql

Il contient :

Création de la table products

Colonnes nutritives

healthy_score

Index éventuels

⚠️ Limites du projet

Tri et filtres effectués côté front (limité à la page chargée)

Données OpenFoodFacts parfois incomplètes

healthy_score simplifié (objectif pédagogique)

SQLite non adapté à un usage multi-utilisateur en production

✅ Conclusion

Ce projet met en œuvre :

Une architecture data complète

Séparation RAW / ENRICHED

ETL vers SQL

API REST

Dashboard moderne interactif

Tests

Déploiement reproductible via Docker
