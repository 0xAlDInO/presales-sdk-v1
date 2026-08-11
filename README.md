# Presales SDK Dashboard

Interface Next.js pour interagir visuellement avec un SDK TypeScript généré pour le programme Solana `presalesSmartContract`.

Le projet permet de:
- connecter un wallet (Phantom ou Solflare),
- choisir le réseau (`devnet` / `mainnet-beta`),
- exécuter les instructions générées du smart contract,
- visualiser les retours de transaction (signature, logs, erreurs custom, trace d’instructions),
- inspecter et décoder les comptes on-chain du programme.

## Stack technique

- Next.js 14 + React 18
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- `@solana/kit` + SDK généré dans `src/generated`

## Prérequis

- Node.js 18+ (recommandé: 20+)
- npm
- Un wallet Solana navigateur (Phantom ou Solflare)
- (Optionnel) PostgreSQL + `psql` pour initialiser la table locale de suivi des presales

## Installation

```bash
npm install
```

## Configuration environnement

Créer votre fichier `.env` à partir de l’exemple:

```bash
cp .env.example .env
```

Variables disponibles:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=presales_sdk
POSTGRES_USER=presales_app
POSTGRES_PASSWORD=change_me_strong_password
```

Note: la base n’est pas obligatoire pour lancer l’UI. Elle est utile si vous voulez préparer la persistance SQL via le script `db:init`.

## Lancer le projet

Développement:

```bash
npm run dev
```

Puis ouvrir:

```text
http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Scripts npm

- `npm run dev`: lance Next.js en mode développement
- `npm run build`: build production
- `npm run start`: démarre le serveur Next.js en mode production
- `npm run lint`: lance le lint Next.js
- `npm run typecheck`: vérifie les types TypeScript sans génération
- `npm run db:init`: exécute `db/postgres/init.sql` via `psql` et les variables `POSTGRES_*`

## Fonctionnalités principales

### 1) Wallet & réseau

- Connexion/déconnexion wallet.
- Sélection réseau `devnet` / `mainnet-beta`.
- Persistance locale du réseau choisi (`localStorage`).

### 2) Exécution des instructions SDK

Le dashboard charge automatiquement les métadonnées depuis `src/generated/instructions` et construit les formulaires dynamiquement.

Instructions prises en charge:

- `createPresale`
- `buyTokensWithSol`
- `buyTokensWithUsdc`
- `claimTokens`
- `cancelPresale`
- `setWhitelist`
- `clearWhitelist`
- `toggleWhitelist`
- `withdrawSol`
- `withdrawUsdc`
- `withdrawTokens`
- `refundSolToBuyer`
- `refundUsdcToBuyer`

### 3) Diagnostic transaction

Après exécution:

- statut (`pending`, `success`, `error`),
- signature + lien Solana Explorer,
- logs RPC,
- décodage d’erreurs custom du programme,
- slot, frais, compute units, trace d’instructions.

### 4) Account Inspector

Décodage on-chain des comptes du programme:

- `BuyerDetails`
- `PresaleDetails`
- `PresaleIndex`
- `PriceUpdateV2`

## Programme Solana ciblé

Adresse du programme utilisée dans le SDK généré:

```text
7EmvXDM9hJz3ULKuP9o5qxyfM2M3MT948aJnZnqzKPBG
```

Source: `src/generated/programs/presalesSmartContract.ts`.

## Base de données (optionnel)

Le script SQL `db/postgres/init.sql` crée une table `presales` (et index) pour stocker des informations de presale.

Initialisation:

```bash
npm run db:init
```

## Structure utile du projet

```text
src/
  app/                      # Entrée Next.js
  components/               # UI (wallet, formulaires, résultats, inspecteur)
  hooks/                    # Logique client (wallet, transaction, inspection)
  lib/                      # Helpers SDK/runtime/diagnostics
  generated/                # Code généré du programme Solana (accounts/instructions/errors)
db/postgres/init.sql        # Schéma SQL optionnel
```

## Bonnes pratiques

- Ne pas modifier manuellement les fichiers de `src/generated`.
- Tester d’abord sur `devnet` avant `mainnet-beta`.
- Vérifier soigneusement les adresses et montants avant signature.

## Licence

MIT (voir [LICENSE](LICENSE)).
