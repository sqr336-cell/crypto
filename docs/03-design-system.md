# Design system « Session de nuit »

Source de vérité : `mobile/src/theme/tokens.ts`. Les composants vivent dans `mobile/src/components/`.

## Principe

Un studio tard le soir : la pénombre d'une cabine, et pour seule lumière le **signal**. La couleur Signal (lavande) est réservée à quatre usages :

1. **Ce qui joue** : bouton lecture actif, tête de lecture, barre de progression du mini-player.
2. **Ce qui est vivant** : vu-mètre de disponibilité.
3. **Ce qui est nouveau** : non-lus, badges, demandes en attente.
4. **L'action principale** d'un écran (un seul bouton plein par écran).

Partout ailleurs : des noirs, des gris et du blanc cassé.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `booth` | `#0E0D12` | Fond de l'app |
| `desk` | `#16151B` | Surfaces : cartes, lignes, réglages |
| `rack` | `#1F1D26` | Surfaces surélevées : champs, bulles envoyées, mini-player |
| `fader` / `faderHigh` | `#2E2B38` / `#423D50` | Waveform non jouée, contrôles inactifs |
| `paper` | `#EEEBF5` | Texte principal, waveform jouée |
| `mist` | `#9C98AB` | Texte secondaire |
| `dim` | `#6D6979` | Texte tertiaire, placeholders |
| `signal` | `#A99BFF` | Accent unique |
| `signalInk` | `#15112A` | Texte posé sur Signal (contraste 7,7:1) |
| `signalSoft` / `signalLine` | lavande 14 % / 38 % | Fonds et bordures de sélection |
| `clip` | `#FF6B73` | Destruction, erreurs |
| `hairline` / `hairlineStrong` | blanc 8 % / 14 % | Séparateurs, bordures |

Contrastes WCAG mesurés sur `booth` : `paper` 16,4:1, `mist` 6,9:1, `signal` 8,1:1, `clip` 7,0:1 (tous AA). `dim` fait 3,6:1 : il est réservé aux placeholders, aux horodatages et aux textes non essentiels, jamais à une information nécessaire.

## Typographie

- **Syne ExtraBold et Bold** : titres d'écran, noms d'artistes, logo. Interlettrage négatif, de -0,3 à -1.
- **Instrument Sans** (400, 500, 600, 700) : toute l'interface.
- Chiffres tabulaires (`tabular`) pour les durées, les BPM et les compteurs.

| Variante | Taille et interligne | Usage |
|---|---|---|
| `hero` | 44/46 Syne | Accueil, « Nouveau link » |
| `display` | 34/38 Syne | Titres d'onboarding, noms sur les profils |
| `title` | 24/29 Syne | Titres d'onglets |
| `heading` | 18/23 Syne Bold | Titres de section forts, titres de projets |
| `body` / `bodyStrong` | 16/23 | Texte courant |
| `label` / `labelStrong` | 14/19 | Libellés, puces |
| `caption` | 13/18 | Métadonnées |
| `micro` | 11/14 | Badges, onglets |

Pas de capitales espacées, pas de police monospace décorative.

## Espacements, rayons, mouvement

- **Espacements** : 2, 4, 8, 12, 16, 24, 32, 48. Marge latérale des écrans : 20 à 24. Largeur de contenu plafonnée à 560 sur tablette et bureau.
- **Rayons selon la hiérarchie** : vignette 10, champ 14, tuile 20, carte 28, feuille 32, pilule pour les contrôles.
- **Mouvement** :
  - pression : ressort court, échelle à 0,96 ;
  - interface : de 160 à 320 ms en décélération ;
  - carte de découverte : ressort (`cardSpring`) avec suivi du doigt et rotation légère ;
  - **moment orchestré unique** : les barres de l'accueil qui s'animent, et les deux waveforms qui convergent dans « Nouveau link ».
  - L'option système « réduire les animations » coupe tout mouvement non essentiel.

## Éléments signature

| Élément | Où | Détail |
|---|---|---|
| **Point Signal** | `Wordmark`, tête de lecture, non-lus, onglet actif | Le point du « i » de « beatlink ». Syne fournit le « ı » sans point, sur lequel on pose un disque lavande. |
| **Vu-mètre de disponibilité** | `AvailabilityMeter` | 3 barres pour « cherche activement », 2 pour « disponible », 1 pour « ouvert », 0 (grisé) pour « indisponible » |
| **Waveform** | `Waveform` | Barres fines arrondies. Si les pics sont inconnus : une ligne (on n'invente pas de forme). Toucher ou glisser pour se déplacer dans le son. |
| **Palier de compatibilité** | `FitTier` | Trois points, jamais un pourcentage |

## Composants

| Composant | Variantes et états |
|---|---|
| `Button` | primary (Signal), secondary, ghost, danger ; tailles md et sm ; loading ; disabled (opacité 40 %) |
| `IconButton` | plain, filled, outline, signal ; `active` (fond Signal doux) ; zone tactile d'au moins 44 px |
| `Chip` / `Tag` | sélectionnable (coche ou numéro d'ordre), désactivé quand le maximum est atteint ; Tag en lecture seule avec surbrillance pour ce qui est partagé |
| `Field` | label, facultatif, préfixe, multiligne, compteur au focus, aide et erreur ; bordure Signal au focus, Clip en erreur |
| `Toggle` / `Switch` | case (consentements), interrupteur (réglages) |
| `Segmented` | onglets en pilules, compteur, point d'attention |
| `PlayButton` | idle (Paper), lecture (Signal), chargement |
| `TrackRow` | titre, BPM, tonalité, genre, durée ou position, waveform scrubbable, suppression |
| `MiniPlayer` | pochette, titre, artiste, progression, lecture et pause, fermeture |
| `DiscoverCard` | densités regular, compact et tight selon la hauteur disponible ; swipe ; tampons Link et Passer |
| `MessageBubble` | texte (liens cliquables), lien (carte plateforme), son, morceau, système, en cours d'envoi |
| `EmptyState`, `Skeleton`, `Loading` | états vides avec une action, chargement qui respire |
| `Menu`, `confirm()`, toasts | feuille d'actions, dialogue de confirmation multiplateforme, notifications éphémères |

## Écriture

- Tutoiement, phrases courtes, vocabulaire de studio (prod, topline, session).
- Un bouton dit ce qu'il fait : « Envoyer la proposition », puis le toast « Proposition envoyée ».
- Les erreurs disent quoi faire, sans s'excuser : « Tu as utilisé tes 50 links du jour. Ils reviennent demain. »
- Un état vide propose une action.
