# Mise en route, configuration et ce qui manque

## 1. Lancer l'app tout de suite (mode démo, sans backend)

```bash
cd mobile
npm install
npx expo start          # puis « i » (simulateur iOS), « a » (Android) ou « w » (navigateur)
```

Sans variables d'environnement, l'app démarre en **mode démo** : 12 créateurs fictifs (marqués « Profil démo »), des sons et des pochettes générés par programme, et tout ce que tu fais reste sur l'appareil. Toutes les fonctionnalités marchent : découverte, links, propositions, messagerie, sons, blocage et signalement.

> Sur un téléphone avec **Expo Go**, scanne le QR code. Les notifications push, Sign in with Apple et l'upload natif demandent un *development build* (voir la section 4).

## 2. Développer avec un vrai backend en local

Prérequis : Docker et Node 20 ou plus.

```bash
npm install                 # à la racine (CLI Supabase, outils de test)
npx supabase start          # Postgres, Auth, REST, Realtime, Storage en local
npm run db:reset            # applique supabase/migrations
npm run db:seed             # 12 créateurs fictifs avec sons et pochettes (mot de passe : beatlink-demo)
npx supabase status         # affiche API_URL et ANON_KEY
```

Puis `mobile/.env` (copié depuis `mobile/.env.example`) :

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY de supabase status>
```

`npx expo start` démarre alors en mode Supabase. Sur un téléphone physique, remplace `127.0.0.1` par l'IP locale de ton ordinateur.

**Tests :**

```bash
npm --prefix mobile run typecheck && npm --prefix mobile test   # domaine
npm run test:db                                                 # intégration (stack locale démarrée)
npx supabase functions serve    # dans un autre terminal, pour inclure les tests des Edge Functions
```

> Juste après un `db reset`, le premier test Realtime peut échouer, le temps que Realtime recrée son slot de réplication. Relance `npm run test:db`.

**Tests de bout en bout (navigateur)** : voir `mobile/e2e/README.md`.

## 3. Mettre en production : ce qu'il te faut fournir

### 3.1 Supabase (obligatoire)

1. Crée un projet sur supabase.com, en région **eu-west** pour le RGPD. Passe en offre **Pro (25 $/mois)** avant l'ouverture publique : sur l'offre gratuite, un projet est mis en pause au bout de 7 jours d'inactivité.
2. Lie le projet et pousse le schéma :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   npx supabase functions deploy delete-account
   npx supabase functions deploy push-on-message --no-verify-jwt
   ```
3. Récupère **Project URL** et **anon (publishable) key** (Settings > API), puis renseigne-les dans `mobile/.env` et dans les variables EAS (voir la section 4).
4. **Ne mets jamais la clé `service_role` dans l'app.** Elle n'est utilisée que par les Edge Functions, qui la reçoivent automatiquement.

### 3.2 Emails d'authentification (obligatoire en production)

Le SMTP intégré à Supabase est limité à quelques emails par heure et réservé aux tests.
- Crée un compte **Resend** (gratuit jusqu'à 3 000 emails par mois) et vérifie ton domaine.
- Dans Supabase, va dans Authentication > SMTP Settings et saisis les identifiants Resend.
- Dans Authentication > URL Configuration, ajoute `beatlink://auth-callback` et l'URL web `https://<ton-domaine>/auth-callback`.

### 3.3 Connexion Google (optionnelle mais prévue)

1. Dans Google Cloud Console, crée un *OAuth client ID* de type « Web application ».
2. Ajoute l'URI de redirection `https://<ref>.supabase.co/auth/v1/callback`.
3. Dans Supabase, va dans Authentication > Providers > Google, active-le et colle le Client ID et le Secret.

Les boutons Google et Apple n'apparaissent dans l'app **que si le fournisseur est activé** côté Supabase (lecture de `/auth/v1/settings`).

### 3.4 Sign in with Apple (obligatoire sur iOS dès qu'un login social est proposé)

1. Compte **Apple Developer** (99 $/an).
2. Identifiant d'app `app.beatlink.mobile` (modifiable dans `mobile/app.json`) avec la capacité Sign in with Apple.
3. Pour le web et Android : crée un *Services ID* et une clé Sign in with Apple, puis renseigne-les dans Supabase > Providers > Apple.
4. Sur iOS, l'app utilise la connexion native (`expo-apple-authentication`). Il suffit d'activer Apple dans Supabase avec l'identifiant de l'app.

### 3.5 Notifications push

1. `npx eas-cli@latest init` dans `mobile/`. Cela ajoute `extra.eas.projectId` dans la config : l'app en a besoin pour obtenir un token.
2. iOS : `eas credentials` génère la clé APNs. Android : ajoute le fichier de service account **FCM v1** dans EAS.
3. Crée un secret pour le webhook :
   ```bash
   npx supabase secrets set PUSH_WEBHOOK_SECRET=<chaîne aléatoire longue>
   ```
4. Dans Supabase, va dans Database > Webhooks et crée un webhook :
   - table `messages`, événement **INSERT** ;
   - type « Supabase Edge Function » ;
   - fonction `push-on-message` ;
   - en-tête HTTP `x-webhook-secret: <la même chaîne>`.
5. Facultatif : si « Enhanced push security » est activé sur Expo, ajoute le secret `EXPO_ACCESS_TOKEN`.

Dans l'app : Réglages > Notifications > « Activer les notifications ». Toucher une notification ouvre la conversation.

### 3.6 Builds iOS et Android (EAS)

```bash
cd mobile
npx eas-cli@latest build:configure
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility plaintext
npx eas-cli@latest build --profile development --platform all   # pour tester sur ton téléphone
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios      # puis android
```

Il te faudra aussi un compte **Google Play** (25 $, payés une seule fois).

### 3.7 Pages légales

Les brouillons sont dans `legal/` (**à faire valider par un juriste**). Publie-les, par exemple sur la landing page, puis renseigne `EXPO_PUBLIC_PRIVACY_URL` et `EXPO_PUBLIC_TERMS_URL`.

### 3.8 Modération (à organiser avant l'ouverture)

- Les signalements arrivent dans la table `reports` (statut `open`), avec une copie du contenu signalé dans `evidence`.
- Pour la bêta, traite-les depuis le Table Editor de Supabase. Requête utile :
  ```sql
  select r.created_at, r.reason, r.details, r.evidence, p.display_name as target
  from reports r left join profiles p on p.id = r.target_profile_id
  where r.status = 'open' order by r.created_at;
  ```
- Une sanction consiste à supprimer ou suspendre le compte (Authentication > Users > Ban user) et à passer le signalement en `actioned`.
- Apple exige un moyen de contacter l'éditeur : ajoute une adresse de support dans la fiche App Store.

## 4. Limites connues (non simulées, documentées)

| Sujet | État actuel | Suite prévue |
|---|---|---|
| Waveform des sons ajoutés **depuis iOS ou Android** | Durée lue ; waveform vide (une ligne de progression s'affiche) | Analyse côté serveur : une fonction qui décode le fichier (WASM ou worker ffmpeg) et remplit `tracks.waveform` |
| Enregistrement d'un mémo vocal dans le chat | Non développé (envoi de fichiers audio uniquement) | `expo-audio` sait enregistrer : bouton micro dans le composer |
| Lecture en arrière-plan et écran de verrouillage | Non configurée | `UIBackgroundModes: audio` et `setActiveForLockScreen` d'expo-audio |
| Export de données sur mobile | Partagé en texte via la feuille de partage | Écrire un fichier `.json` et le partager |
| Anti-spam des messages | Messagerie après consentement mutuel et blocage ; pas de quota par minute | Limite de débit en SQL ou Edge Function |
| Abonnements Plus et Pro | Architecture prête (`entitlements`, `plan_limits`), rien n'est vendu | RevenueCat (achats intégrés) et Stripe (web) via webhook qui écrit `entitlements` |
| Analytics et suivi d'erreurs | Non branchés | PostHog et Sentry (offres gratuites). Liste d'événements dans `05-lancement.md` |
| Liens externes | Liens https vers la page de la plateforme, sans API tierce (Spotify, SoundCloud…) | Aperçus oEmbed côté serveur si besoin |
| Démo sur le web | Les fichiers ajoutés en démo ne survivent pas à un rechargement de page (URL `blob:`) | Normal pour une démo locale |
