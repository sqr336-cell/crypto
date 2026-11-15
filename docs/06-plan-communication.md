# Plan d'action communication : 12 semaines

> Objectif : prouver en 12 semaines, avec moins de 300 € de dépenses, que des créateurs utilisent BEATLINK **pour de vrais morceaux**. On ne cherche pas des téléchargements. On cherche des collaborations.

## Le principe qui guide tout

Une app de mise en relation vide ne retient personne. La com ne sert donc pas d'abord à « faire connaître ». Elle sert à **remplir le réseau au bon endroit, dans le bon ordre** :

1. **Une seule scène d'abord** : francophone, R&B alternatif, trap, drill, afro. On élargit seulement quand ça mord.
2. **Le côté rare d'abord** : il y a beaucoup plus de beatmakers que de chanteurs, rappeurs et toplineurs. Si 90 % des inscrits sont producteurs, les voix sont submergées et repartent. **On recrute les voix en priorité** et on fait entrer les producteurs par vagues.
3. **La preuve par le son** : chaque morceau né sur BEATLINK devient le meilleur contenu de com possible.

## Étape 0 (avant toute dépense) : le nom

Une app iOS appelée **« BeatLink »** existe déjà dans la même catégorie : elle « connecte artistes et producteurs ». Le nom est aussi utilisé par un outil pour producteurs (beatlink.io). Conséquences :
- **App Store** : deux apps ne peuvent pas porter exactement le même nom. Il faudra au minimum un nom complété, par exemple « BEATLINK : collabs musique ».
- **Marque** : risque d'opposition, et confusion dans les recherches.

À faire cette semaine :
- [ ] Rechercher le nom sur [INPI](https://data.inpi.fr) (France), EUIPO (UE) et sur le pseudo des réseaux (@beatlink sur Instagram, TikTok, YouTube).
- [ ] Si c'est bloqué : **renommer maintenant**. C'est gratuit aujourd'hui et coûteux après la com. Dans le code, ce n'est qu'une configuration (`app.json`, logo).
- [ ] Déposer la marque retenue à l'INPI (environ 190 € pour une classe), seulement après validation de l'étape 4.

## Les messages

| Pour qui | Message principal | Preuve à montrer |
|---|---|---|
| Chanteurs, rappeurs, toplineurs | « Des prods qui collent à ta voix. Sans fouiller 300 DM. » | La carte qui joue une prod, avec « Correspond à ce que tu cherches » |
| Beatmakers et producteurs | « Ta prod mérite une voix. Écoute avant de parler. » | Une topline posée sur une prod, avec le nom des deux créateurs |
| Musiciens et ingés son | « Pose tes parties là où on les cherche. » | Un guitariste ou un pianiste linké sur un projet |

Signature : **« Trouve ton son. Trouve tes gens. »**
Ton : entre pairs, vocabulaire de studio, tutoiement. Jamais de promesse du type « deviens viral » ou « signe en label ».

## Les canaux, par ordre d'importance

1. **Messages privés ciblés (Instagram, TikTok)** : le canal n° 1 au démarrage. On cherche des comptes de chanteurs ou de rappeurs qui postent des covers ou des freestyles et ont entre 500 et 20 000 abonnés.
2. **Lieux physiques de la scène** : écoles et formations musiques actuelles (par exemple SAE Institute Paris, ATLA, MAI Nancy, CIAM Bordeaux, départements musiques actuelles des conservatoires), studios de répétition et home studios, open mics, beat battles.
3. **Communautés en ligne** : serveurs Discord de beatmakers, groupes Facebook de producteurs, sous-forums. On y participe et on aide. On ne spamme pas de lien.
4. **Contenu court** (TikTok, Reels, Shorts) : les histoires de collaborations, voir ci-dessous.
5. **Micro-influence** : chaînes YouTube et TikTok FR de tutos beatmaking ou chant (10 000 à 100 000 abonnés). On propose un partenariat (un challenge co-organisé), pas un placement payant.
6. **Presse spécialisée** : seulement quand on a 5 histoires de collaboration à raconter (semaine 6 ou plus). Médias rap et R&B, newsletters, podcasts de producteurs.

Pas de publicité payante avant d'avoir prouvé la rétention.

## Les formats récurrents

| Format | Fréquence | Description | Pourquoi |
|---|---|---|---|
| **Session de nuit** (live Instagram ou Discord) | Hebdo, le jeudi à 22 h | Tu écoutes en direct des sons envoyés par la communauté et tu proposes des duos (« cette prod et cette voix devraient se parler ») | Ça crée des links, du contenu et de l'attachement |
| **Challenge prod puis topline** | Toutes les 2 semaines | Un producteur partenaire publie une prod, les voix posent une topline et proposent un projet dans l'app. La meilleure version est mise en avant. | Ça remplit le côté rare et ça préfigure la future fonction « Calls » |
| **Histoire de collab** | Dès qu'il y en a une | Vidéo de 30 s : la prod, la voix, « linkés mardi, morceau fini samedi » | C'est la preuve sociale centrale |
| **Écoute à l'aveugle** | 2 fois par semaine | « Devine l'univers de ce producteur en 10 secondes » | Engagement, et montre l'ADN « écoute d'abord » |
| **Conseils de collaboration** | Hebdo | Comment écrire une bonne proposition de collab, partager un morceau, faire une split sheet | Utile, partageable, et positionne BEATLINK comme sérieux |

## Calendrier

### Semaines -4 à 0 : préparer (pas encore d'ouverture)

- [ ] Étape 0 (le nom) réglée.
- [ ] Mettre la landing en ligne (`./scripts/build-landing.sh`, puis Cloudflare Pages, gratuit) avec la démo web sous `/app`.
- [ ] Remplacer le bouton « Rejoindre la bêta » (aujourd'hui un simple email) par un **formulaire gratuit** (Tally ou Google Forms) : rôle, genres, ville, lien vers un son, compte Instagram.
- [ ] Ouvrir les comptes Instagram et TikTok. Publier 6 contenus « écoute à l'aveugle » et 3 vidéos de l'app, à partir des captures du mode démo.
- [ ] **Recruter 100 membres fondateurs à la main**, avec **au moins 50 voix** (chant, rap, topline) : 20 messages par jour, scripts plus bas.
- [ ] Démarcher 3 écoles et 3 studios avec la proposition de partenariat plus bas.
- **Indicateur de sortie** : 100 fondateurs inscrits au formulaire, dont au moins 50 % de voix.

### Semaines 1 et 2 : bêta fermée (TestFlight et test interne Play)

- [ ] Inviter les fondateurs **par vagues** : voix d'abord, puis producteurs, en gardant au maximum 1,5 producteur par voix. La liste d'attente se gère à la main via les invitations, il n'y a pas de fonctionnalité dédiée dans l'app.
- [ ] Appeler 10 fondateurs (15 min chacun) : ce qui bloque, ce qui leur plaît.
- [ ] Première Session de nuit en live.
- [ ] Repérer les 3 premiers links qui échangent des sons et leur proposer de raconter leur histoire.
- **Indicateurs** : 80 % de profils avec un son, au moins 30 % des links qui échangent un message.

### Semaines 3 à 6 : bêta ouverte, concentrée

- [ ] Ouvrir le formulaire à tous, mais toujours avec des vagues équilibrées.
- [ ] Un challenge prod et topline toutes les 2 semaines, avec un producteur et une école partenaires.
- [ ] Un **ambassadeur par ville ou par école** (Paris, Lyon, Bruxelles, Montréal, Abidjan) : accès anticipé et mise en avant dans les contenus, pas de promesse de rémunération.
- [ ] Publier chaque histoire de collab (objectif : 5 avant la semaine 6).
- [ ] Contacter 3 créateurs de contenu beatmaking ou chant pour co-organiser un challenge.
- **Indicateurs** : 500 inscrits, rétention à J7 d'au moins 25 %, au moins 10 % des links qui échangent des sons dans les deux sens.

### Semaines 7 et 8 : bilan et décision

- [ ] Lire les chiffres avec les critères de `01-strategie-produit.md` §4.
- [ ] **Si c'est validé** : développer les « Calls » (appels à collaboration), contacter la presse spécialisée avec les 5 histoires, envisager un petit budget de boost sur la meilleure vidéo.
- [ ] **Si ce n'est pas validé** : interroger 15 utilisateurs partis, puis décider entre corriger le produit (par exemple passer à un format communauté et challenges d'abord) ou arrêter. Coût de l'échec : quelques centaines d'euros.

### Semaines 9 à 12 : élargir si c'est validé

- [ ] Deuxième scène (par exemple pop urbaine et électro) ou deuxième pays francophone.
- [ ] Premier événement physique : une soirée d'écoute dans un studio partenaire.

## Scripts prêts à l'emploi

**Message privé à une voix** (après avoir vraiment écouté un de ses posts) :
> Salut [prénom] ! J'ai écouté ta cover de [titre], ta voix sur le refrain m'a vraiment marqué. Je lance BEATLINK, une app où les chanteurs et les beatmakers se trouvent par le son : tu écoutes des prods qui collent à ton univers et tu proposes un projet en un message. Je cherche 50 voix fondatrices avant l'ouverture. Ça te tente ? Je t'envoie l'accès.

**Message privé à un producteur** :
> Yo [pseudo], ta prod [titre] est très propre, surtout [détail]. Je monte BEATLINK, une app pour que les beatmakers trouvent des voix qui collent à leur son, sans courir après les DM. On fait entrer les producteurs par petites vagues pour que chacun ait des voix en face. Je te mets dans la prochaine ?

**Email à une école ou un studio** :
> Objet : Un challenge prod et topline pour vos élèves
>
> Bonjour, je lance BEATLINK, une app gratuite de mise en relation entre beatmakers, chanteurs et musiciens, centrée sur l'écoute. Je vous propose de co-organiser un challenge : un de vos producteurs publie une prod, vos élèves chanteurs posent une topline, et nous mettons les meilleures versions en avant sur nos réseaux. Pour vous, c'est de la visibilité et un projet concret pour vos élèves ; pour nous, de premiers utilisateurs engagés. On en parle 15 minutes cette semaine ?

## Budget (12 semaines)

| Poste | Montant | Commentaire |
|---|---|---|
| Comptes réseaux, formulaire, landing, montage vidéo (CapCut) | 0 € | Offres gratuites |
| Récompenses des challenges | 0 à 150 € | Idéalement en échange de visibilité : une session offerte par un studio partenaire |
| Boost de la meilleure histoire de collab | 0 à 150 € | **Seulement après la semaine 6**, et seulement si la rétention est validée |
| **Total** | **0 à 300 €** | Le vrai coût, c'est ton temps (ci-dessous) |

## Temps à prévoir chaque semaine (environ 8 à 10 h)

- Messages privés de recrutement : 20 par jour, soit environ 2 h 30 par semaine.
- 3 contenus courts : 2 h.
- 1 Session de nuit en live : 1 h 30, préparation comprise.
- Démarchage d'un partenaire : 1 h.
- Lecture des chiffres et des retours, et modération des signalements : 1 h.

## Mesurer

- Un lien avec paramètres UTM par canal (Instagram, TikTok, écoles, Discord) sur la landing et le formulaire.
- Tableau de bord hebdomadaire : inscriptions par canal, part de voix et de producteurs, part de profils avec un son, links, propositions acceptées, échanges de sons.
- **Prérequis technique** : brancher PostHog (gratuit), avec les événements listés dans `05-lancement.md`. Ce n'est pas encore fait dans l'app.

## Risques et parades

| Risque | Parade |
|---|---|
| Trop de producteurs, pas assez de voix | Invitations par vagues, recrutement des voix d'abord, challenges centrés sur la topline |
| Comportements déplacés en messagerie | Messagerie après consentement déjà en place ; traiter les signalements sous 24 h ; règles affichées dans les contenus |
| Le nom (étape 0) | À régler avant tout contenu public |
| Promesses non tenues | Ne communiquer que sur ce qui existe dans l'app (pas encore de Calls, de mémos vocaux ni de lecture en arrière-plan) |
| Épuisement du fondateur | Tenir le rythme de 8 à 10 h par semaine ; recruter un ambassadeur community manager dès la semaine 4 |
