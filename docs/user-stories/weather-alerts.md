# User Story : Alertes Météo Proactives

**En tant que :** Ouvrier ou Chef de chantier
**Je veux :** Recevoir une notification automatique (Email ou In-App) le matin à 7h
**Afin de :** Savoir si mon chantier est suspendu à cause des intempéries avant de prendre la route.

## Critères d'acceptation :
1.  **Déclenchement temporel** : Le système doit vérifier l'état des chantiers chaque matin à 7h00.
2.  **Condition d'alerte** : Une alerte n'est envoyée que si le statut du chantier est passé à `SUSPENDU` ou est déjà `SUSPENDU` avec une raison météo défavorable.
3.  **Destinataires** : L'alerte doit être envoyée à tous les utilisateurs affectés au chantier (`AffectationChantier`).
4.  **Contenu du message** : Le message doit contenir le nom du chantier, la condition météo (ex: "Vent violent", "Pluie diluvienne") et l'instruction de ne pas se rendre sur place.
5.  **Canal de communication** : 
    *   Priorité 1 : Enregistrement dans la table `Notification` (déjà existante).
    *   Priorité 2 : Envoi d'un email (via Resend ou service similaire).

## Détails Techniques :
*   **Cron Job** : Utilisation d'une route API (ex: `/api/cron/weather-alerts`) appelée par un service de cron (Vercel Cron ou GitHub Actions).
*   **Logique existante** : Réutilisation de `checkWeatherFavorability` dans `lib/meteo.ts`.
*   **Sécurité** : La route doit être protégée par une clé secrète (`CRON_SECRET`).
