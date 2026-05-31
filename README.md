# Suivi de Chantier - Application de Gestion

Une application web moderne (« Mobile-First ») pour le suivi de chantiers, permettant la gestion des pointages, de la surveillance météorologique automatisée, de la documentation photographique et de la gestion des équipes. Développée dans le cadre d'un Travail de Fin d'Études (TFE).

---

## 🚀 Évaluation rapide (Mode Démo)

Pour faciliter l'évaluation du projet sans configuration complexe, un environnement de démonstration est disponible.

**Identifiants de démonstration :**
*   **Compte Chef de Chantier :** `admin@demo.com` / `MotDePasse123!`
*   **Compte Ouvrier :** `ouvrier@demo.com` / `MotDePasse123!`

---

Video tuto : 

https://youtu.be/pCp-K48-U9U

## 🛠️ Installation & Démarrage local

Si vous souhaitez faire tourner l'application localement, suivez ces étapes :

### 1. Prérequis
- **Node.js** (v20+)
- **PostgreSQL** (ou une instance [Supabase](https://supabase.com/))
- **Clés API Supabase** (Authentification et Stockage des photos)

### 2. Installation
```bash
# Cloner le dépôt
git clone https://github.com/MartinStocq/suivi-chantier-app-TFE.git
cd suivi-chantier-app-TFE

# Installer les dépendances
npm install
```

### 3. Configuration de l'environnement (`.env`)
Copiez le fichier d'exemple et remplissez les variables nécessaires :
```bash
cp .env.example .env
```
*Note : Si vous utilisez le CLI Supabase en local, la `DATABASE_URL` pointera généralement sur le port 54322.*

### 4. Initialisation de la Base de données
Utilisez Prisma pour synchroniser le schéma et appliquer les migrations. Cette étape va créer les tables nécessaires dans votre base de données :
```bash
npx prisma migrate dev
```
*💡 **Note sur les erreurs de synchronisation (Drift) :** Si Prisma détecte un décalage entre vos fichiers de migration et la base de données, il peut demander un reset. Dans ce cas, pour repartir sur une base saine, utilisez :*
```bash
npm run db:reset
```

### 5. Lancer l'application
```bash
npm run dev
```
L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

---

## 🔐 Architecture & Sécurité

### Gestion des Rôles (RBAC)

La sécurité repose sur un modèle "Zero-Trust" avec deux rôles principaux :
*   **OUVRIER** : Accès limité aux pointages personnels et aux chantiers assignés.
*   **CHEF_CHANTIER** : Gestion complète des chantiers, des équipes et validation des pointages.

À l'inscription, tout nouvel utilisateur est bloqué par défaut (`approuve = false`) jusqu'à validation manuelle par un administrateur via **Prisma Studio** ou l'interface de gestion.

Pour ouvrir l'explorateur de base de données :
```bash
npx prisma studio
```

### Automatisation Météo
L'application intègre une surveillance automatisée via Open-Meteo. En cas de conditions critiques (gel, vent violent, fortes pluies), le statut des chantiers est automatiquement mis à jour pour garantir la sécurité des ouvriers.

---

## 🧪 Tests & Qualité

Le projet inclut une suite complète de tests unitaires et d'intégration pour garantir la robustesse des fonctionnalités critiques (calcul des heures, synchronisation météo, notifications).

```bash
# Lancer les tests
npm run test
```

---



## 💻 Stack Technique
- **Framework** : Next.js 16 (App Router, Server Actions)
- **Base de données** : PostgreSQL & Prisma ORM
- **Authentification & Stockage** : Supabase
- **Styling** : Tailwind CSS v4
- **Tests** : Vitest & React Testing Library
