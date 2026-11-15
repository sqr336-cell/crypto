# Tests de bout en bout (navigateur)

Ces scripts pilotent le build web de l'app avec Playwright, sur un téléphone simulé de 390 × 844, et enregistrent des captures dans `e2e/screenshots/`.

Prérequis : `npm i -D playwright && npx playwright install chromium` (ces dépendances ne sont pas installées par défaut, pour garder l'installation légère).

## Mode démo

```bash
cd mobile
npx expo export --platform web            # génère dist/
npx serve -s dist -l 8081 &
node e2e/demo-flow.cjs                    # LOCALE=fr-FR pour la version française
```

Le script parcourt : accueil, onboarding en 5 étapes, Découvrir (lecture audio), détail de la compatibilité, link mutuel, conversation, demande reçue acceptée, profil, réglages, blocage, proposition de projet.

## Mode Supabase (stack locale)

```bash
npx supabase start && npm run db:reset && npm run db:seed      # à la racine
cd mobile
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon> \
  npx expo export --platform web --output-dir dist-supabase
npx serve -s dist-supabase -l 8082 &
node e2e/supabase-flow.cjs
```

Deux vrais comptes (Alma et Bruno) :

1. Inscription par email.
2. Upload d'une photo et d'un son ; la waveform est calculée dans le navigateur.
3. Link mutuel.
4. Conversation qui apparaît en temps réel.
5. Messages et son envoyés et lus en direct.
6. Proposition de projet, puis acceptation.
7. Blocage, qui ferme la conversation chez l'autre.
