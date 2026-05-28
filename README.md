# Suivi de Chantier - Application de Gestion

Une application web moderne pour le suivi de chantiers, permettant la gestion des pointages, de la météo, des photos et des équipes.

## Installation & Démarrage

Suivez ces étapes pour lancer le projet localement :

### 1. Prérequis
- Node.js (v18+)
- Une base de données PostgreSQL (ou un projet Supabase)
- Un compte Supabase (pour l'authentification et le stockage)

### 2. Installation
```bash
# Cloner le dépôt
git clone <url-du-repo>
cd suivi-chantier-app

# Installer les dépendances
npm install
```

### 3. Configuration
1. Copiez le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```
2. Modifiez le fichier `.env` avec vos propres accès (DATABASE_URL, SUPABASE_URL, etc.).

### 4. Base de données
```bash
# Synchroniser le schéma Prisma avec votre base
npx prisma migrate dev
```

### 5. Lancer l'application
```bash
npm run dev
```
L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

---

##  Développement

### Synchronisation Météo
En mode développement (`NODE_ENV !== 'production'`), la vérification de `CRON_SECRET` est ignorée pour faciliter les tests.
- Déclenchement manuel : `GET /api/meteo/sync`
- En production : `GET /api/meteo/sync?key=VOTRE_SECRET` (nécessite `CRON_SECRET`)

### Tests
```bash
npm test
```

##  Stack Technique
- **Framework** : [Next.js 15+](https://nextjs.org/)
- **Base de données** : [PostgreSQL](https://www.postgresql.org/) avec [Prisma ORM](https://www.prisma.io/)
- **Auth & Stockage** : [Supabase](https://supabase.com/)
- **Emails** : [Resend](https://resend.com/) / [Nodemailer](https://nodemailer.com/)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/)

---
