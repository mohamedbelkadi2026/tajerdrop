# Captures d'écran de la landing page

Trois fichiers sont attendus ici, référencés par `client/src/pages/landing.tsx` :

- `admin-dashboard.png`      — Dashboard Admin
- `agent-confirmation.png`   — Agent de Confirmation
- `agent-media-buyer.png`    — Media Buyer

Format conseillé : PNG ou JPG, ratio large (la carte les affiche sur 220 px de
haut, en `object-cover object-top`). Environ 1200 px de large suffit.

Tant qu'un fichier est absent, la carte correspondante s'affiche sans image
(fond bleu) au lieu de casser. Il n'y a rien à modifier dans le code pour les
activer : déposer le fichier au bon nom suffit.

Ne pas remettre ces images dans `attached_assets/` — ce dossier est gitignoré,
donc les fichiers n'arriveraient jamais jusqu'à Railway.
