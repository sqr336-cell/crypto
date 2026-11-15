# BEATLINK

**Le réseau où les créateurs de musique se trouvent par le son.**
Beatmakers, producteurs, chanteurs, rappeurs et musiciens découvrent des profils compatibles en écoutant d'abord. Ils se « linkent » quand l'intérêt est réciproque, puis échangent des messages et des sons pour démarrer un projet.

> Find your sound. Find your people.

## État du projet

Le MVP est fonctionnel sur iOS, Android et le web (Expo), avec un backend Supabase complet.

| Domaine | Fonctionnalités |
|---|---|
| Compte | Email et mot de passe, Google, Apple (boutons visibles si le fournisseur est activé), confirmation 18 ans et plus |
| Onboarding | 5 étapes : identité et photo, rôles et compétences, genres et influences, objectifs et disponibilité, premier son |
| Découvrir | Cartes « écoute d'abord » avec lecture, waveform scrubbable et plusieurs extraits ; swipe ou boutons (passer, sauvegarder, proposer un projet, link) ; filtres ; compatibilité expliquée ; écoute continue ; mini-player persistant |
| Links | Connexions, demandes reçues et envoyées (accepter, refuser, retirer), projets en cours ou terminés, sauvegardés |
| Messagerie | Temps réel, texte, liens (plateforme détectée), envoi et lecture de sons, non-lus, lancement d'un projet depuis une conversation |
| Profil | Vitrine (bannière, sons, genres, influences, compétences, liens externes), édition, gestion des sons |
| Sécurité | Blocage, signalement (profil ou message, avec preuve conservée), messagerie seulement après consentement, export des données, suppression du compte |
| Freemium | Limites anti-spam appliquées côté serveur ; architecture des droits prête pour Plus et Pro (rien n'est vendu) |
| Langues | Français et anglais |

Sans backend configuré, l'app tourne en **mode démo** avec 12 créateurs fictifs clairement signalés, des pochettes abstraites et des sons générés par programme.

## Démarrer

```bash
cd mobile && npm install && npx expo start      # mode démo, aucun compte requis
```

Backend local, tests et mise en production : **[docs/04-mise-en-route.md](docs/04-mise-en-route.md)**.

## Documentation

**[Dossier de production complet (PDF, 24 pages)](docs/BEATLINK-dossier-de-production.pdf)** : synthèse de tout ce qui suit.

**[Dossier de refonte (audit, contre-analyse, directions artistiques, prototype)](docs/refonte/index.html)** : à ouvrir dans un navigateur. Phases 1 à 6, en attente de validation avant toute modification du code.

1. [Stratégie produit](docs/01-strategie-produit.md) : vision, concurrence, différenciation, MVP, stack et coûts, données, écrans, direction artistique
2. [Architecture et décisions](docs/02-architecture-et-decisions.md)
3. [Design system « Session de nuit »](docs/03-design-system.md)
4. [Mise en route, configuration, ce qui manque](docs/04-mise-en-route.md)
5. [Préparation au lancement](docs/05-lancement.md)
6. [Plan d'action communication sur 12 semaines](docs/06-plan-communication.md) (commence par vérifier le nom : une app « BeatLink » existe déjà)
7. Brouillons légaux : [confidentialité](legal/politique-de-confidentialite.md), [conditions d'utilisation](legal/conditions-utilisation.md) (**à faire valider par un juriste**)

## Structure

```
mobile/      App Expo (iOS, Android, web) : src/app (écrans), src/components, src/domain, src/data, e2e/
supabase/    migrations SQL (schéma, RLS, RPC, stockage), Edge Functions, tests d'intégration
landing/     site statique (landing page, pages légales ; démo web sous /app via scripts/build-landing.sh)
scripts/     génération des médias de démo, seed local, build du site
docs/        documentation produit et technique
```

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm --prefix mobile run typecheck` | Vérification TypeScript |
| `npm --prefix mobile test` | Tests du domaine (matching, liens, validation, plans) |
| `npm run db:start` / `npm run db:reset` / `npm run db:seed` | Stack Supabase locale, migrations, données fictives |
| `npm run test:db` | Tests d'intégration contre la stack locale |
| `./scripts/build-landing.sh` | Construit le site statique dans `landing/` |
| `python3 scripts/generate_demo_assets.py` | Régénère les sons et pochettes de démo |
