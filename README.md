# 🎲 Système de Tirages au Sort – Test Technique

Ce projet a été réalisé dans le cadre d’un **test technique pour un stage / une alternance**.  
Il implémente un système complet de **tirages au sort pour restaurants**, avec une gestion côté restaurateur et une participation côté client.

L’objectif principal était de respecter une **stack technique imposée**, de concevoir une **base de données cohérente**, et d’implémenter une **logique métier sécurisée**.

---

## 🧱 Architecture

Le projet est composé de trois parties :


### Backend
- Node.js 18 + TypeScript
- API REST serverless (Vercel Functions)
- PostgreSQL (Supabase)
- Accès DB via `pg` (sans ORM)

### Frontend
- React Native + Expo
- Une application dédiée aux restaurateurs
- Une application dédiée aux clients

---

## 🗄️ Base de Données & Modélisation

La base de données repose sur 4 tables principales :

- `businesses` : restaurants
- `users` : utilisateurs (user / restaurant / admin)
- `draws` : tirages au sort
- `draw_participants` : participations

### Points clés
- Contrainte `UNIQUE (draw_id, user_id)` pour empêcher les doubles participations
- Relations SQL sécurisées (`ON DELETE CASCADE`)
- Index pour optimiser les requêtes
- Sécurité assurée à la fois côté base de données et côté API

---

## 🔐 Sécurité & Logique Métier

- Authentification via JWT
- Vérification des rôles à chaque endpoint sensible
- Un restaurateur ne peut gérer que les tirages de son établissement
- Règles métier implémentées :
  - Impossible de participer deux fois à un tirage
  - Impossible de modifier ou supprimer un tirage avec des participants
  - Séparation claire des droits entre client et restaurateur

---

## 🧪 Fonctionnalités Implémentées

### Restaurateur
- Création et gestion des tirages
- Consultation des participants
- Blocage des modifications dès qu’un participant est inscrit

### Client
- Consultation des tirages disponibles
- Participation à un tirage
- Gestion des erreurs métier (déjà participé, tirage invalide, etc.)

---

## 🧠 Choix Techniques

- Pas d’ORM pour garder un contrôle total sur les requêtes SQL
- Contraintes fortes au niveau de la base de données
- Architecture serverless simple et scalable
- Expo pour un développement mobile rapide et efficace

---

## 📌 Contexte

Ce projet est un **exercice technique** et non un produit final.  
Il vise à démontrer :
- la structuration d’un projet full-stack
- la compréhension des enjeux backend (sécurité, données, logique métier)
- la clarté et l’organisation du code

---

## 📜 Licence

MIT
