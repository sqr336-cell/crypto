# BEATLINK — Stratégie produit et architecture

> Document de phase 1 (recherche et architecture). Il répond aux 8 questions du brief et explique les choix qui s'écartent du brief initial.
> Dernière mise à jour : 15 novembre 2026.

---

## 1. Vision

**BEATLINK est le réseau où les créateurs de musique se trouvent par le son.**

Le problème de fond n'est pas de rencontrer *des* gens : Instagram, TikTok et Discord en sont pleins. Le vrai problème est double :

1. **Trouver la bonne personne** : quelqu'un dont l'univers sonore colle au tien et dont les compétences complètent les tiennes (un beatmaker R&B alternatif a besoin d'une toplineuse, pas d'un autre beatmaker).
2. **Transformer la rencontre en morceau.** La critique récurrente faite aux apps existantes est que les connexions ne débouchent sur rien (voir la section concurrence).

BEATLINK se positionne donc sur la couche « trouver et démarrer » de la collaboration :

- ce n'est pas un DAW (BandLab, Soundtrap) ;
- ce n'est pas une marketplace de prestations (SoundBetter, AirGigs) ni de beats (BeatStars) ;
- ce n'est pas un réseau de diffusion (SoundCloud, TikTok).

**Métrique étoile (North Star) : collaborations démarrées par semaine.** On compte une connexion où les deux personnes ont échangé au moins un son. On ne mesure pas le nombre de swipes ou de matches : ces chiffres peuvent monter alors que le produit échoue.

### Ce que je remets en question dans le brief

| Idée du brief | Ma position | Pourquoi |
|---|---|---|
| Application internationale dès le départ | **Produit prêt pour l'international (FR/EN, aucune dépendance géographique), mais lancement concentré** sur une scène : francophone, R&B alternatif, trap, drill, afro | Un réseau de mise en relation meurt du vide. Dix profils pertinents valent mieux que dix mille profils dispersés. On ensemence avec 50 à 100 créateurs choisis avant d'ouvrir. |
| Mécanique de rencontre type Tinder | **Découverte « écoute d'abord »** : le son est le héros de la carte, la photo passe au second plan. Le geste de swipe existe, mais les boutons restent l'interaction principale. | Swiper sur une photo produit des jugements superficiels. Pour une collaboration, c'est le son qui compte. Et le « Tinder pour musiciens » est devenu une commodité (au moins six apps en 2025-2026). |
| Score de compatibilité | **Niveau qualitatif** (Très compatible / Compatible / À explorer) **avec les raisons affichées**. Le détail des points reste consultable. | Un « 87 % » laisse croire à une précision scientifique qui n'existe pas. Des raisons lisibles (« Tu produis, elle écrit des toplines ») sont plus honnêtes et plus utiles. |
| Voir qui s'intéresse à moi | **L'intérêt reste privé jusqu'à ce qu'il soit réciproque.** En revanche, une demande de collaboration (avec message) est toujours visible par son destinataire. | Cela protège du rejet et limite le spam. Surtout, cela évite le paywall n° 1 des apps de rencontre (« voir qui vous a liké »), que le brief interdit à juste titre pour la mise en relation. |
| Messagerie ouverte | **Messagerie uniquement après consentement mutuel** (intérêt réciproque ou demande acceptée) | Anti-spam et anti-harcèlement. C'est indispensable dans une communauté qui compte beaucoup de jeunes. |
| Âge | **18 ans et plus au lancement** (décision à confirmer par toi) | Messages privés entre inconnus et contenu généré par les utilisateurs. On pourra ouvrir aux 16-17 ans plus tard avec des protections dédiées. |
| Limites quotidiennes | **Des limites généreuses, pensées comme un anti-spam et non comme un levier de vente** (50 links et 10 demandes par jour en gratuit) | Plus vend du confort et de la visibilité, jamais l'accès à la mise en relation. |
| Extraits audio | **Extraits de 90 s maximum et 15 Mo maximum, 3 par profil en gratuit.** Les morceaux complets restent sur SoundCloud ou Spotify via des liens. | Cela maîtrise les coûts de bande passante (le premier poste de coût, voir la section 5) et réduit l'exposition aux problèmes de droits d'auteur. |
| BEATLINK Pro | À terme, **une commission sur une marketplace de services** sera probablement plus alignée sur la valeur créée qu'un troisième abonnement | À valider après la bêta. L'architecture des droits (`entitlements`) permet les deux. |

---

## 2. Concurrence

> Les chiffres viennent des fiches publiques (App Store, presse) et n'ont pas été vérifiés indépendamment.

### Concurrents directs

| Produit | Ce qu'il fait bien | Faiblesse, et donc opportunité pour BEATLINK |
|---|---|---|
| **Vampr** (2015, Melbourne, plus d'un million d'utilisateurs revendiqués) | Pionnier du « swipe entre musiciens », offres de jobs, base installée | Généraliste (groupes, tous les instruments), l'audio n'est pas central, et les connexions débouchent rarement sur de vraies collaborations (critique récurrente, encore en 2026) |
| **Nouvelle vague 2024-2026** : OpenMic (matching par les top titres Spotify), Astrid (matching IA et gestion de projet), KollabMe, Collabry (matching par style et vibe), MetaJamz (annonces de projets), Feeture | La catégorie est validée, et les apps récentes tentent toutes le matching par le goût | Marché fragmenté, aucun leader, peu d'avis. Le « swipe pour musiciens » ne différencie plus. |
| BandMix, JoinMyBand | Petites annonces pour recruter un groupe | Interfaces datées, orientées scène live et groupes |

### Concurrents indirects (là où les collaborations naissent aujourd'hui)

| Produit | Rôle actuel | Limite |
|---|---|---|
| **Instagram, TikTok, Discord** | Prise de contact par messages privés, serveurs de producteurs | Aucun matching, messages privés saturés, rien pour dire « je cherche X » |
| **SoundCloud, YouTube (« type beat »), Audiomack** | Découverte des prods | Diffusion à sens unique, pas de mise en relation structurée |
| **BandLab** | DAW gratuit, couche sociale, très grosse base | Collaboration dans *son* DAW ; trouver le bon partenaire n'est pas son cœur de métier |
| **SoundBetter (Spotify), AirGigs, Vocalizr** | Engager un professionnel (mix, voix, session) | Transactionnel, pas de collaboration entre pairs |
| **BeatStars, Airbit, Traktrain** | Vendre des beats en licence | Relation commerciale producteur vers artiste, pas de co-création |
| Kompoz, Splice, Audiomovers | Outils de collaboration une fois le partenaire trouvé | Complémentaires plutôt que concurrents : ce sont des intégrations possibles |

**Conclusion :** la demande existe et elle est prouvée. Le différenciateur ne peut pas être la mécanique de découverte seule. Il faut gagner sur **la qualité du « fit » et sur la conversion d'une connexion en collaboration réelle.**

---

## 3. Ce qui différencie vraiment BEATLINK

Classés par impact et faisabilité pour le MVP :

1. **Découverte par le son.** Les extraits se jouent depuis la carte, l'écoute continue d'un profil à l'autre et le mini-player persiste dans toute l'app. On décide à l'oreille.
2. **La complémentarité plutôt que la ressemblance.** La plupart des apps cherchent des gens *similaires*. Une collaboration a besoin de rôles *complémentaires* (prod et topline, beatmaker et rappeur, compositeur et ingé son) dans un univers proche. Le score combine les deux.
3. **Une compatibilité explicable.** Chaque carte dit *pourquoi* : « 2 genres en commun », « Tu produis, il écrit », « Cherche activement ».
4. **L'intention en avant.** Le champ « Je cherche » (« une chanteuse pour un EP R&B alternatif »), les objectifs et un indicateur de disponibilité façon vu-mètre font remonter les personnes réellement disponibles.
5. **La demande de collaboration avec brief.** C'est un message, un titre de projet et un de tes sons joint. Une fois acceptée, elle crée la conversation **et** le projet : on passe du like à une proposition concrète.
6. **Une messagerie nativement audio.** Un son envoyé s'affiche avec sa waveform et se lit dans la bulle. Ce n'est pas une pièce jointe générique.
7. **La confiance dès la conception.** Messagerie après consentement, blocage et signalement partout, suppression du compte et export des données en libre-service.

**Après le MVP (le vrai fossé concurrentiel) :**

8. **Les « Calls » (appels à collaboration).** On publie un besoin concret avec un son de référence (« Cherche chanteuse alt-R&B, 92 BPM, do mineur ») et on reçoit des réponses. C'est le meilleur remède au problème de densité : une annonce attire plusieurs réponses.
9. **Les rooms de projet.** Versions, stems, notes, et surtout une **split sheet** (accord de répartition des droits). C'est une vraie douleur, un vrai différenciateur et une fonctionnalité Pro naturelle.
10. **Les crédits vérifiés.** « Fait avec @x sur BEATLINK » : des collaborations prouvées sur le profil, comme preuve sociale.

---

## 4. Le MVP le plus intelligent

**Principe : un seul parcours, parfait.** J'écoute, je link, je parle, j'envoie un son.

### Dans le MVP (P0)

| Domaine | Contenu |
|---|---|
| Authentification | Email et mot de passe, Google, Apple (Apple est obligatoire sur iOS dès qu'un login social tiers est proposé) |
| Onboarding | 5 étapes en moins de 2 minutes : Toi, Ce que tu fais, Ton son, Ce que tu cherches, Fais-toi entendre (premier son facultatif) |
| Profil vitrine | Photo, bannière, bio, rôles, genres, influences, compétences, objectifs, disponibilité, « Je cherche », liens externes, jusqu'à 3 sons |
| Découvrir | Cartes « écoute d'abord », passer, sauvegarder, linker, demander une collaboration, filtres de base (rôle, genre, disponibilité, à distance), raisons de compatibilité |
| Links | Connexions, demandes reçues et envoyées, projets en cours, sauvegardés |
| Messagerie | Texte, liens (détection de la plateforme), sons (upload, waveform, lecture), non-lus, temps réel |
| Sécurité | Bloquer, signaler (profil, message, son), suppression du compte, export des données (RGPD) |
| Freemium | Architecture des droits et des limites, appliquée **côté serveur** ; tout est gratuit au lancement |
| Notifications | Enregistrement des tokens Expo Push et fonction d'envoi (la configuration requise est documentée) |

### Hors MVP (P1 et plus)

Calls, matching IA, recherche BPM et tonalité (les champs existent déjà), communautés, rooms de groupe, stems, appels audio, marketplace, paiements.

### Critères de succès de la bêta (8 semaines, 300 à 1 000 créateurs)

- Rétention à J7 d'au moins 25 %.
- Au moins 30 % des links échangent un message.
- Au moins 10 % des links échangent un son dans les deux sens (c'est la North Star).
- Plus de 35 % des demandes de collaboration acceptées. En dessous, le matching ou la qualité des demandes est à revoir.

---

## 5. Stack technique et coûts

### Choix et alternatives écartées

| Couche | Choix | Alternatives considérées | Raison |
|---|---|---|---|
| Mobile | **Expo SDK 58 (React Native 0.88), TypeScript, Expo Router** | Flutter, natif Swift/Kotlin | Une base de code pour iOS, Android et le web (react-native-web) ; mises à jour OTA ; builds cloud EAS sans Mac ; TypeScript partagé avec le backend |
| Backend | **Supabase** (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | Firebase, Convex, Node et Postgres sur mesure | Le **relationnel** est indispensable pour le matching (scores calculés en SQL) ; la RLS Postgres sécurise au niveau des lignes ; Apple, Google et email intégrés ; open source et auto-hébergeable, donc sans enfermement. Firebase (NoSQL) se prête mal aux requêtes de matching. Une solution sur mesure aurait pris 3 à 4 fois plus de temps. |
| Données côté app | **TanStack Query** (cache et synchronisation) et **Zustand** (état du lecteur et de la session) | Redux, SWR | Peu de code, cache et invalidation solides, mises à jour optimistes |
| Audio | **expo-audio** | react-native-track-player | Module officiel Expo, sans configuration native ; écran de verrouillage disponible. À réévaluer si des files de lecture avancées deviennent nécessaires. |
| Gestes et animations | react-native-gesture-handler v3 et Reanimated 4 | Animated API | Animations à 60 et 120 fps exécutées sur le thread UI |
| Stockage audio | **Supabase Storage au MVP, puis Cloudflare R2** dès que la bande passante dépasse environ 200 Go par mois | S3 avec CloudFront | R2 ne facture **pas la sortie de données** : c'est le levier de coût n° 1 pour une app d'écoute |
| Notifications | Expo Push (gratuit) | OneSignal, FCM direct | Gratuit et intégré à Expo |
| Emails d'auth | Resend comme SMTP de Supabase | SMTP intégré de Supabase | Le SMTP intégré est très limité en débit et réservé aux tests |
| Analytics et erreurs | PostHog et Sentry (offres gratuites), **pas encore intégrés** | Amplitude, Mixpanel | Offres gratuites larges ; à brancher en phase 5 |
| Paiements (plus tard) | **RevenueCat** (achats intégrés Apple et Google) et Stripe (web) | Achats intégrés en direct | Les abonnements numériques vendus dans l'app doivent passer par les achats intégrés des stores. RevenueCat unifie Apple, Google et Stripe et remplit notre table `entitlements` via webhook. |

### Coûts estimés

> Tarifs publics vérifiés en novembre 2026 via des sources secondaires. À reconfirmer sur supabase.com/pricing et expo.dev/pricing avant d'engager une dépense.

| Poste | Développement | Bêta (jusqu'à 1 000 utilisateurs) | Lancement (10 000 à 50 000 utilisateurs) |
|---|---|---|---|
| Supabase | 0 € (offre Free, mais le projet est mis en pause après 7 jours d'inactivité) | 25 $/mois (Pro : pas de pause, sauvegardes, 8 Go de base, 100 Go de stockage) | 25 $/mois plus l'usage (sortie au-delà du quota à environ 0,09 $/Go) |
| Expo EAS | 0 € (builds gratuits limités chaque mois) | 0 à 19 $/mois | 19 $/mois ou plus |
| Apple Developer | — | 99 $/an | 99 $/an |
| Google Play | — | 25 $ une seule fois | — |
| Domaine | — | environ 12 €/an | environ 12 €/an |
| Landing page | 0 € (Cloudflare Pages) | 0 € | 0 € |
| Emails (Resend) | 0 € | 0 € (3 000 par mois) | environ 20 $/mois |
| Cloudflare R2 | — | — | environ 0,015 $/Go stocké par mois, **0 € de sortie** |
| **Total** | **0 €** | **environ 130 € de frais fixes la première année, puis environ 25 €/mois** | **environ 50 à 100 €/mois** |

**Le vrai risque de coût est la bande passante audio.** Exemple : 1 000 utilisateurs actifs par jour × 30 écoutes × 0,5 Mo en moyenne, soit environ 450 Go par mois. C'est au-dessus du quota Pro de Supabase, avec environ 20 à 40 $/mois de dépassement, et la facture croît linéairement avec l'audience. Avec R2, la sortie coûte 0 €. D'où trois décisions :

- encodage recommandé en AAC 96 à 128 kb/s ;
- extraits de 90 s maximum ;
- résolution des URLs audio derrière une seule fonction (`resolveTrackUrl`), pour pouvoir changer de stockage sans toucher à l'app.

---

## 6. Architecture de la base de données

Le schéma complet se trouve dans `supabase/migrations/`. Le principe : **la RLS est activée sur toutes les tables, et toute écriture sensible passe par des fonctions RPC `security definer`** qui appliquent les règles métier (limites, blocages, consentement).

```
auth.users ──1:1── profiles ──1:n── tracks
                       │  └──1:n── profile_links
                       ├──1:1── entitlements ──n:1── plan_limits
                       ├──1:n── daily_usage
                       ├──n:n── swipes (pass / interest)        [privé : visible par l'auteur seulement]
                       ├──n:n── favorites
                       ├──n:n── blocks
                       ├──1:n── reports
                       ├──1:n── push_tokens
                       ├──n:n── connections (user_a < user_b) ──1:1── conversations
                       ├──1:n── collab_requests (pending/accepted/declined/withdrawn)
                       │                         └──accepte──> collaborations ──n:n── collaboration_members
                       └──n:n── conversation_members ──n:1── conversations ──1:n── messages (text/link/audio/system)
```

| Table | Rôle | Accès (RLS) |
|---|---|---|
| `profiles` | Identité, univers, intentions. Les listes (`roles`, `genres`, `skills`, `goals`) sont des `text[]` validés contre `taxonomy` par un trigger. | Lecture : utilisateurs connectés, sauf paire bloquée, profils onboardés seulement. Écriture : soi-même. |
| `taxonomy` | Liste fermée des rôles, genres, compétences et objectifs (les libellés sont traduits dans l'app) | Lecture publique |
| `tracks` | Extraits : chemin de stockage, durée, waveform (pics de 0 à 100), BPM et tonalité facultatifs | Lecture hors paire bloquée. Écriture : propriétaire, avec un nombre maximal selon le plan (trigger). |
| `profile_links` | SoundCloud, Spotify, YouTube, Instagram, BeatStars… en **https uniquement** | Propriétaire |
| `swipes` | `pass` ou `interest`. **Jamais lisible par la cible.** | Lecture : l'auteur. Écriture : RPC `record_swipe` uniquement. |
| `favorites` | Profils sauvegardés (maximum selon le plan) | Propriétaire |
| `connections` | Le « link » : intérêt réciproque ou demande acceptée | Les deux membres. Création par RPC uniquement. |
| `collab_requests` | Demande avec message, titre de projet et son joint ; une seule demande en attente par paire | Expéditeur et destinataire. Transitions par RPC. |
| `collaborations` et `collaboration_members` | Projets en cours ou terminés, prêts pour les groupes | Membres |
| `conversations`, `conversation_members`, `messages` | Messagerie prête pour les groupes ; `last_read_at` pour les non-lus | Membres. Envoi refusé si la paire est bloquée. |
| `blocks`, `reports` | Sécurité. Le blocage supprime le link et annule les demandes en attente. Les signalements sont conservés pour la modération. | Auteur |
| `entitlements`, `plan_limits`, `daily_usage` | Freemium, écrit uniquement par le serveur (webhooks de paiement) | Lecture de ses propres données |
| `push_tokens` | Tokens Expo Push | Propriétaire |

**Fonctions RPC principales :** `discover_feed`, `compatibility`, `record_swipe`, `send_collab_request`, `respond_collab_request`, `withdraw_collab_request`, `list_conversations`, `mark_conversation_read`, `start_collaboration`, `set_collaboration_status`, `remove_connection`, `block_user`, `unblock_user`, `report_content`, `my_usage`, `export_my_data`.

**Stockage :**

| Bucket | Visibilité | Contenu et règles |
|---|---|---|
| `images` | Public | Avatars, bannières et pochettes sous `{uid}/…`. 5 Mo maximum, jpeg, png ou webp. |
| `tracks` | Privé, URLs signées | Extraits sous `{uid}/…`, lisibles par les utilisateurs connectés hors paire bloquée. 15 Mo maximum, formats audio uniquement. |
| `message-audio` | Privé | Sons de conversation sous `{conversation_id}/…`, lisibles par les membres de la conversation uniquement. 25 Mo maximum. |

**Temps réel :** les tables `messages`, `collab_requests` et `connections` sont publiées dans Supabase Realtime, et la RLS s'applique aux abonnements.

**Edge Functions :** `delete-account` (suppression complète, exigée par Apple) et `push-on-message` (notification à l'arrivée d'un message, déclenchée par un webhook de base de données).

**Matching (fonction `compatibility`) :** un score sur 100 calculé à partir de 7 critères **visibles et pondérés**. La même formule existe en TypeScript pour le mode démo, et des tests vérifient qu'elle est identique à la version SQL.

| Critère | Points | Calcul |
|---|---|---|
| Genres communs | 30 | Genres en commun ÷ min(3, taille de la plus petite liste) |
| Rôles complémentaires | 20 | 12 si l'autre correspond à ce que tu cherches, plus 8 si tu corresponds à ce qu'il cherche |
| Influences communes | 15 | 0, 8, 12 ou 15 points pour 0, 1, 2, 3 influences communes ou plus |
| Compétences complémentaires | 10 | 5 points par compétence qu'il a et que tu n'as pas (2 au maximum) |
| Disponibilité | 10 | Cherche activement : 10. Disponible : 8. Ouvert : 5. Indisponible : 0. |
| Objectifs communs | 10 | 5 points par objectif commun (2 au maximum) |
| Logistique | 5 | Langue commune : 3, plus 2 si les deux acceptent la distance ou sont dans la même ville |

Paliers : 70 points ou plus, « Très compatible » ; de 45 à 69, « Compatible » ; en dessous, « À explorer ». **Le moteur est isolé** : on pourra remplacer la formule par des embeddings audio et de goûts (pgvector) sans toucher à l'app.

---

## 7. Écrans et parcours

### Navigation

```
┌──────────────────────────────┐
│           (écran)            │
│                              │
├──────────────────────────────┤
│ ▶ Mini-player persistant     │  ← visible dès qu'un son est en cours
├──────────────────────────────┤
│ Découvrir  Links  Messages  Profil │
└──────────────────────────────┘
```

**Amélioration proposée : l'onglet « Matches » devient « Links ».** Le verbe de la marque, c'est *linker* (« Link »), et l'onglet regroupe 4 vues : Connexions, Demandes (reçues et envoyées), Projets, Sauvegardés. « Match » évoque une app de rencontre, alors que le link est une relation de travail. Un 5e onglet **Studio** (projets collaboratifs) viendra quand les rooms existeront.

### Écrans du MVP

| Écran | Contenu clé |
|---|---|
| Accueil | Logo, promesse, Apple, Google, email ; en mode démo, « Explorer la démo » |
| Connexion et inscription | Email et mot de passe, confirmation 18 ans et plus, acceptation des CGU |
| Onboarding (5 étapes) | Barre de progression, champs facultatifs clairement marqués, possibilité de passer l'étape du son |
| Découvrir | Carte « écoute d'abord », raisons de compatibilité, actions, filtres |
| Profil d'un créateur | Vitrine complète, sons, liens, actions, menu (bloquer, signaler) |
| Demande de collaboration | Message, titre de projet, son joint |
| Links | Segments Connexions, Demandes, Projets, Sauvegardés |
| Messages | Liste (non-lus, aperçu des sons) et conversation (texte, liens, sons) |
| Mon profil et édition | Vitrine, gestion des sons et des liens |
| Réglages | Visibilité (mettre son profil en pause), langue, utilisateurs bloqués, usage du jour, export des données, suppression du compte, déconnexion |
| Signalement | Motif et détails |

### Parcours principaux

1. **Première ouverture vers le premier son écouté (moins de 2 minutes)** : Accueil, inscription, 5 étapes d'onboarding, Découvrir. Le premier extrait se lance d'un tap.
2. **Link** : Découvrir, écouter, *Link*. Si l'intérêt est réciproque, l'écran « Nouveau link » s'affiche, puis « Envoyer un message » ouvre la conversation.
3. **Demande de collaboration** : depuis une carte ou un profil, *Proposer un projet*, rédiger le brief et joindre un son, puis envoyer. Le destinataire la retrouve dans Links > Demandes. S'il accepte, la conversation s'ouvre avec le brief et le son, et le projet est créé.
4. **Échange audio** : depuis une conversation, joindre un son, upload, puis le destinataire l'écoute dans la bulle.
5. **Vitrine** : Profil, *Ajouter un son* (fichier, titre, BPM et tonalité facultatifs), écoutable immédiatement.
6. **Sécurité** : menu ⋯ d'un profil ou d'une conversation, *Bloquer* ou *Signaler*, puis confirmation. Réglages > Utilisateurs bloqués > *Débloquer*.
7. **Droits RGPD et exigences Apple** : Réglages > *Exporter mes données* ou *Supprimer mon compte*.

---

## 8. Direction artistique

Le détail complet (tokens, composants, états) est dans `docs/03-design-system.md`.

**Concept : « Session de nuit ».** Un studio tard le soir : la pénombre d'une cabine, et pour seule lumière le **signal**, la LED d'une console ou le voyant « on air ». **L'accent lavande n'apparaît que là où il y a du signal** : ce qui joue, ce qui est vivant (disponibilité), ce qui est nouveau (non-lus), l'action principale. Partout ailleurs, des noirs et des gris.

### Palette

| Nom | Hex | Usage |
|---|---|---|
| Booth | `#0E0D12` | Fond principal : un noir charbon légèrement violacé, la cabine |
| Desk | `#16151B` | Surfaces (cartes, barres) |
| Rack | `#1F1D26` | Surfaces surélevées (feuilles, champs) |
| Fader | `#2E2B38` | Bordures, waveform non jouée, contrôles inactifs |
| Paper | `#EEEBF5` | Texte principal, waveform jouée |
| Mist | `#9C98AB` | Texte secondaire |
| **Signal** | `#A99BFF` | Accent unique : lecture, link, non-lus, disponibilité |
| Clip | `#FF6B73` | Destructif et erreurs (le voyant de saturation d'une console) |

Pas de dégradés décoratifs. Les seuls dégradés autorisés sont des voiles noirs sur les photos, pour la lisibilité du texte.

### Typographie

- **Syne** (titres, noms d'artistes, logo). Elle a été dessinée pour le centre d'art Synesthésies à Paris : un caractère né dans le monde de l'art, large et expressif dans ses graisses fortes. Les noms d'artistes deviennent des titres de pochette.
- **Instrument Sans** (interface et texte). Une grotesque compacte et très lisible en petite taille, qui contraste nettement avec Syne.
- Chiffres tabulaires pour les durées et les BPM. Pas de police monospace décorative.

### Éléments signature

1. **Le point Signal.** Le point du *i* de « beatlink » est un disque lavande. On le retrouve comme tête de lecture, indicateur de non-lu et repère d'onglet actif. C'est l'identité reconnaissable en un coup d'œil.
2. **Le vu-mètre de disponibilité.** Trois barres : 3 pour « cherche activement », 2 pour « disponible », 1 pour « ouvert aux propositions », 0 (grisé) pour « indisponible ».
3. **La waveform comme interface.** Des barres fines aux extrémités arrondies : jouée en Paper, non jouée en Fader, tête de lecture en Signal. On l'écoute et on la scrube d'un geste.

### Formes, mouvement et écriture

- **Rayons selon la hiérarchie, pas un rayon unique** : cartes 28, feuilles 32, contrôles en pilule, champs 14, vignettes 10.
- **Mouvement** : des ressorts physiques pour la carte de découverte, et 180 à 240 ms en décélération pour l'interface. **Un seul moment orchestré** : le « Nouveau link », où deux waveforms convergent en une seule. L'option « réduire les animations » du système est respectée.
- **Ton** : direct, entre pairs, vocabulaire de studio (prod, topline, session), tutoiement en français. Les erreurs disent quoi faire, sans s'excuser.
- **À éviter** : les dégradés partout, les boutons géants, les étiquettes en capitales espacées, les cartes toutes identiques, les flèches « → » collées aux boutons.
