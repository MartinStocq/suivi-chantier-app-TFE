# Suivi de Chantier - Application de Gestion

Une application web moderne (« Mobile-First ») pour le suivi de chantiers, permettant la gestion des pointages, de la surveillance météorologique automatisée, de la documentation photographique et de la gestion des équipes. Développée dans le cadre d'un Travail de Fin d'Études (TFE).

---

## 🚀 Évaluation rapide (Mode Démo pour le Jury)

Pour faciliter l'évaluation du projet sans avoir à configurer une base de données locale, un environnement bac à sable (Sandbox) est disponible.

**Identifiants de démonstration :**
*   **Compte Chef de Chantier :** `admin@demo.com` / `MotDePasse123!`
*   **Compte Ouvrier :** `ouvrier@demo.com` / `MotDePasse123!`

Si vous souhaitez faire tourner le code localement avec cette base de test, remplacez simplement les valeurs de votre fichier `.env` par les clés secrètes Supabase qui vous ont été fournies dans le document d'accompagnement du TFE.

---

## 🛠️ Installation & Démarrage local (Mode Complet)

Si vous souhaitez déployer l'application depuis zéro avec votre propre base de données, suivez ces étapes :

### 1. Prérequis
- Node.js (v18+)
- Un compte [Supabase](https://supabase.com/) (gratuit) pour l'authentification, la base de données PostgreSQL et le stockage (Buckets).

### 2. Installation
```bash
# Cloner le dépôt
git clone https://github.com/MartinStocq/suivi-chantier-app-TFE.git
cd suivi-chantier-app

# Installer les dépendances
npm install
```

### 3. Configuration de l'environnement (`.env`)
Le fichier `.env.example` contient la structure attendue. Copiez-le :
```bash
cp .env.example .env
```
Remplissez-le avec vos identifiants Supabase (disponibles dans *Project Settings > API* et *Project Settings > Database*) :
*   `DATABASE_URL` : L'URL de connexion à la base de données PostgreSQL (Transaction pooler).
*   `NEXT_PUBLIC_SUPABASE_URL` : L'URL publique de votre projet Supabase.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY` : La clé publique anonyme.

### 4. Initialisation de la Base de données
```bash
# Pousse le schéma Prisma vers votre base de données Supabase
npx prisma migrate dev
```

### 5. Lancer l'application
```bash
npm run dev
```
L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

---

## 🔐 Gestion des rôles (Gatekeeping)

La sécurité de l'application repose sur un modèle "Zero-Trust". 

**À l'inscription (Sign Up) :** 
N'importe qui possédant l'URL peut créer un compte. Cependant, l'application attribue **strictement et par défaut** le rôle `OUVRIER` avec un statut `approuve = false`. Le compte est bloqué par le Middleware Edge et ne peut accéder à aucune page.

**Comment attribuer le rôle Chef ?**
Le premier utilisateur (le créateur de l'entreprise) doit être promu manuellement dans la base de données :
1. Créez un compte via l'interface web (`/register`).
2. Ouvrez Prisma Studio pour manipuler la base locale :
   ```bash
   npx prisma studio
   ```
3. Dans la table `Utilisateur`, trouvez votre compte.
4. Passez le champ `approuve` à `true`.
5. Modifiez le champ `role` de `OUVRIER` à `CHEF_CHANTIER`.
6. Enregistrez. Vous avez désormais accès au Tableau de Bord et pouvez approuver les futurs inscrits directement depuis l'interface web.

---

## 🧪 Tests Automatisés

Le projet est couvert par une suite de 77 tests automatisés (Unitaires et Intégration) utilisant Vitest et React Testing Library. Ils ne nécessitent aucune base de données pour fonctionner.

```bash
# Lancer la suite de tests complète
npm run test
```

---

## ⚙️ Développement & Architecture Asynchrone

### Synchronisation Météo (Cron Job)
L'application intègre une "State Machine" qui suspend automatiquement les chantiers en cas de météo critique via une route API (`/api/meteo/sync`).
*   **En production :** Cette route est appelée toutes les 4 heures par Vercel Cron. Elle exige que le header ou le paramètre corresponde au `CRON_SECRET` de votre fichier `.env`.
*   **En développement :** Si `NODE_ENV !== 'production'`, la vérification du `CRON_SECRET` est ignorée pour faciliter vos tests manuels depuis le navigateur.

---

## 💻 Stack Technique
- **Framework Front/Back** : [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Edge Middleware)
- **Base de données & Auth** : [Supabase](https://supabase.com/) (PostgreSQL managé, GoTrue, Storage)
- **ORM** : [Prisma](https://www.prisma.io/)
- **API Externe** : Open-Meteo (Géocodage & Forecast)
- **Styling** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Tests** : Vitest & React Testing Library
