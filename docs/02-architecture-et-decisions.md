# Architecture et décisions techniques

## Vue d'ensemble

```
mobile/   (Expo SDK 58, React Native 0.88, TypeScript, Expo Router)
  src/app/          routes : un fichier = un écran
  src/components/   design system (ui/), audio/, profile/, chat/
  src/domain/       logique pure, testée : taxonomie, matching, plans, liens, validation
  src/data/         contrat Backend + 2 implémentations (supabase/, demo/) + hooks TanStack Query
  src/state/        Zustand : session, lecteur audio, filtres, toasts
  src/i18n/         français et anglais
supabase/
  migrations/       schéma, données de référence, fonctions et RLS, stockage
  functions/        delete-account, push-on-message (Deno, sans dépendance npm)
  tests/            tests d'intégration contre une vraie stack locale
scripts/            génération des médias de démo, seed local
docs/               stratégie, architecture, design system, mise en route
```

Le flux de données passe par une seule interface. Les écrans appellent les hooks de `src/data/queries.ts`. Ces hooks appellent `backend` (le contrat de `src/data/backend.ts`), qui pointe soit vers `SupabaseBackend`, soit vers `DemoBackend`. Aucun écran n'importe Supabase directement.

## Décisions (format ADR condensé)

### D1. Expo et React Native plutôt que Flutter ou le natif
- **Contexte** : iOS, Android et web demandés, petite équipe, besoin d'itérer vite.
- **Décision** : Expo SDK 58 avec Expo Router et TypeScript strict.
- **Conséquences** : une base de code ; builds cloud EAS (pas besoin de Mac) ; mises à jour OTA ; la version web sert aussi aux tests automatisés (Playwright). Les modules natifs passent par des config plugins, sans dossiers `ios/` ni `android/` versionnés.

### D2. Supabase (PostgreSQL) plutôt que Firebase
- **Contexte** : le matching repose sur des requêtes relationnelles (recoupements de genres, rôles, exclusions de blocages et de swipes).
- **Décision** : Supabase, avec Postgres, Auth, Storage, Realtime et Edge Functions.
- **Conséquences** : le score de compatibilité est calculé en SQL au plus près des données. La RLS protège chaque ligne. C'est open source et auto-hébergeable, donc sans enfermement.

### D3. RLS partout, écritures sensibles via RPC `SECURITY DEFINER`
- Le client ne peut pas écrire directement dans `swipes`, `connections`, `collab_requests`, `blocks` ou `reports`. Il passe par `record_swipe`, `send_collab_request`, `block_user`, etc., qui appliquent les règles : limites quotidiennes, blocages, consentement mutuel avant la messagerie.
- Les fonctions fixent `search_path = ''` et qualifient chaque nom, comme le recommande Supabase.
- Les fonctions internes (`ensure_connection`, `bump_usage`…) ne sont pas exposées à l'API, et c'est vérifié par un test.
- Les erreurs portent un code stable (`daily_interest_limit`…), que l'app traduit, et un statut HTTP correct via les SQLSTATE `PTxxx` : 401, 404, 429.

### D4. Un matching explicable, en SQL et en TypeScript
- La formule existe deux fois : `public.compatibility()`, source de vérité en production, et `src/domain/matching.ts`, pour le mode démo et l'affichage.
- **Test de parité** : 300 paires de profils aléatoires sont calculées des deux côtés et doivent donner des résultats identiques (`supabase/tests/api.test.ts`).
- Le score est la somme de 7 critères pondérés et affichés. L'interface montre un palier (Très compatible, Compatible, À explorer) et les raisons, jamais un pourcentage brut.
- **Évolution prévue** : remplacer la formule par un classement appris ou des embeddings (pgvector) derrière la même RPC `discover_feed`.

### D5. L'intérêt reste privé, la messagerie se débloque au consentement
- Un `interest` n'est jamais lisible par sa cible (RLS sur `swipes`). La connexion est créée côté serveur quand l'intérêt devient réciproque, ou quand une demande de collaboration est acceptée.
- On ne peut écrire dans une conversation directe que si le link existe et qu'aucun blocage ne s'applique (`can_post`).

### D6. Un mode démo complet, local et clairement signalé
- **Contexte** : le brief exige des données de démonstration identifiables tant que le backend n'est pas connecté.
- **Décision** : `DemoBackend` implémente tout le contrat sur l'appareil (AsyncStorage) avec 12 profils fictifs marqués « Profil démo ». Les limites, blocages et consentements y suivent les mêmes règles que le serveur.
- Les médias de démo sont **générés par programme** (`scripts/generate_demo_assets.py`) : pochettes abstraites et sons synthétisés, sans échantillon, sans voix, sans contenu tiers.
- Le mode est choisi automatiquement : Supabase si `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` sont définies, démo sinon.

### D7. Stockage audio : URLs signées derrière une seule fonction
- `tracks` et `message-audio` sont des buckets privés. La lecture passe par des URLs signées valables une heure et mises en cache. `images` est public pour profiter du CDN.
- Toutes les URLs audio passent par `trackSource()` et `messageAudioSource()`. On pourra déplacer l'audio vers Cloudflare R2, sans frais de sortie, sans toucher aux écrans.
- **Limites** : 15 Mo par extrait et 25 Mo par son de conversation (vérifiées par le bucket), 3 extraits en gratuit (trigger). L'app conseille 90 s maximum.

### D8. Un seul lecteur audio pour toute l'app
- Un store Zustand pilote une instance unique d'expo-audio. Un seul son joue à la fois, la lecture survit à la navigation, et le mini-player, les waveforms et les boutons lisent le même état.
- **Écoute continue** : si un son de Découvrir jouait, la carte suivante enchaîne sur son premier extrait.

### D9. Waveforms : calculées côté client quand c'est possible
- Sur le web, l'API Web Audio décode le fichier et en tire 64 pics.
- Sur iOS et Android, il n'existe pas de décodeur audio en JavaScript. La durée est lue via le lecteur et la waveform reste `null`. L'interface affiche alors une simple ligne de progression plutôt que d'inventer une forme.
- **Prévu** : une analyse côté serveur (voir la mise en route).

### D10. Edge Functions sans dépendance npm
- Elles appellent Supabase en REST (`functions/_shared/supabase.ts`) : démarrage à froid plus rapide, rien à télécharger, moins de surface d'attaque.

### D11. Freemium appliqué côté serveur
- `plan_limits` et `entitlements` ne sont modifiables que par le serveur (service role, futurs webhooks RevenueCat ou Stripe). Le client les lit.
- Les limites gratuites servent d'anti-spam : 50 links et 10 propositions par jour, 3 sons, 100 sauvegardes. **Se connecter n'est jamais payant.**
- Aucun écran d'achat : Plus et Pro n'existent pas encore, et l'app le dit. Rien n'est simulé.

### D12. Internationalisation dès le départ
- Dictionnaires typés en français et en anglais (une clé manquante est une erreur de compilation). La langue suit l'appareil et peut être changée dans les Réglages.
- La taxonomie (rôles, genres…) est stockée en slugs. Les libellés vivent dans l'app, et les notifications push utilisent la langue enregistrée avec le token.

### D13. Accessibilité et mouvement
- Rôles et libellés d'accessibilité sur tous les contrôles. La waveform est `adjustable` : on avance et recule par pas de 10 %.
- L'option « réduire les animations » du système est respectée (Reanimated `useReducedMotion`).
- **Pas d'animations de mise en page Reanimated sur les éléments flexibles** : sur le web, elles figent la hauteur de la carte. On utilise des animations par valeurs partagées.

## Sécurité : récapitulatif

| Risque | Mesure |
|---|---|
| Lecture des données d'autrui | RLS sur 20 tables ; profils visibles seulement s'ils sont onboardés et hors paire bloquée |
| Contournement des règles métier | Écritures sensibles uniquement via RPC ; tables critiques sans politique d'écriture |
| Usurpation dans la messagerie | `sender_id = auth.uid()` imposé ; les messages système sont réservés au serveur |
| Fichiers | Chemins imposés par dossier (`{uid}/…`, `{conversation_id}/…`), types MIME et tailles limités par bucket |
| Clés | Seules l'URL et la clé publique (anon) sont dans l'app. La clé service role ne vit que dans les Edge Functions. Aucun secret versionné (`.env` ignoré). |
| Spam et harcèlement | Limites quotidiennes, messagerie après consentement, blocage (qui coupe le link, la conversation et les propositions), signalements avec capture de preuve |
| Données personnelles | Export JSON en libre-service ; suppression complète du compte et des fichiers ; localisation facultative et limitée à la ville |
| Mineurs | 18 ans et plus confirmés à l'onboarding (contrainte en base). Le motif de signalement « pourrait avoir moins de 18 ans » existe. |

## Tests

| Commande | Ce qui est vérifié |
|---|---|
| `npm --prefix mobile run typecheck` | TypeScript strict, y compris l'exhaustivité des traductions |
| `npm --prefix mobile test` | Domaine : matching, liens, validation, plans (16 tests) |
| `npm run test:db` | 22 tests d'intégration contre une stack Supabase locale : RLS, RPC, parité SQL/TS sur 300 paires, stockage, Realtime, demandes, limites, blocage, signalement, export. Plus 3 tests des Edge Functions (suppression de compte réelle) si `supabase functions serve` tourne. |
| Playwright (manuel, voir la mise en route) | Parcours complet en démo (FR et EN) et parcours à deux utilisateurs réels sur Supabase local, avec temps réel et audio |
