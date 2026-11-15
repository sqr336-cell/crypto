# Préparation au lancement

## Plan de bêta (8 semaines)

| Semaine | Objectif | Détail |
|---|---|---|
| 0 | Ensemencer | Recruter 50 à 100 créateurs à la main sur une seule scène (francophone, R&B alternatif, trap, drill, afro) : DM Instagram, serveurs Discord de beatmakers, écoles (SAE, ICMP…). Ils créent leur profil **avec un son** avant l'ouverture. |
| 1 à 2 | Bêta fermée (TestFlight et test interne Play) | Une vague de 200 personnes avec invitation. Entretien de 20 min avec 10 d'entre eux. |
| 3 à 6 | Bêta ouverte, géographiquement concentrée | Paris, Lyon, Bruxelles, Montréal, Abidjan. Une session d'écoute en live chaque semaine (« Session de nuit ») pour animer la communauté. |
| 7 à 8 | Décision | Critères de succès dans `01-strategie-produit.md` §4. Si c'est validé : construire les Calls (appels à collaboration). |

## Mesure : événements produit (PostHog, à brancher)

Aucun outil n'est intégré pour l'instant. Voici les événements à envoyer, sans contenu de message ni donnée sensible :

| Événement | Propriétés | Sert à mesurer |
|---|---|---|
| `onboarding_step_completed` | step (1 à 5), duration_s | L'entonnoir d'inscription (cible : moins de 2 min) |
| `sound_added` | source (onboarding ou profil), duration_s | La part des profils avec un son |
| `track_played` | context (discover, profile, message), listened_pct | L'écoute réelle |
| `discover_decision` | decision (pass ou interest), fit_tier, had_played | Écoute-t-on avant de décider ? |
| `link_created` | origin (mutual ou proposal) | Le volume de links |
| `proposal_sent` / `proposal_answered` | with_track, accepted | La qualité des propositions |
| `message_sent` | kind (text, link, audio) | L'engagement |
| `audio_exchanged_both_ways` | — (calculé côté serveur) | **North Star** |
| `user_blocked` / `report_filed` | reason | La santé de la communauté |

## Stores : éléments à préparer

- **Nom** : BEATLINK. **Sous-titre** : « Trouve ton son. Trouve tes gens. »
- **Catégorie** : Musique (secondaire : Réseaux sociaux). **Âge** : 17+ sur iOS (contenu généré par les utilisateurs et messagerie), PEGI 16 ou plus sur Android.
- **Captures** : à générer depuis le build (Découvrir en lecture, compatibilité expliquée, Nouveau link, conversation avec un son, profil vitrine). Le script `mobile/e2e/demo-flow.cjs` produit déjà les écrans ; les refaire à 1290 × 2796 pour iOS.
- **Données collectées** (App Privacy et Data Safety) : email, nom d'artiste, photo, ville facultative, contenus audio, messages, identifiant d'appareil pour les notifications. Aucun suivi publicitaire.
- **Revue Apple, guideline 1.2** (contenu généré par les utilisateurs) : signalement, blocage, filtrage et contact sont présents. Fournir un **compte de démonstration** aux reviewers, ou un build avec `EXPO_PUBLIC_FORCE_DEMO=1`.
- **Guideline 5.1.1(v)** : la suppression du compte se fait dans l'app (Réglages > Supprimer mon compte).
- **Guideline 4.8** : Sign in with Apple est présent dès qu'un login social est proposé.

## Avant d'ouvrir

- [ ] Projet Supabase Pro et migrations poussées (`04-mise-en-route.md` §3.1)
- [ ] SMTP Resend et domaine vérifié
- [ ] Google et Apple configurés
- [ ] Push : EAS projectId, APNs et FCM, webhook en place
- [ ] Pages légales relues par un juriste et publiées
- [ ] Adresse de support et procédure de modération (`04-mise-en-route.md` §3.8)
- [ ] Sentry et PostHog branchés
- [ ] Sauvegardes Supabase vérifiées (Pro : quotidiennes)
- [ ] Test sur appareils réels : iPhone SE, iPhone récent, Android d'entrée de gamme
