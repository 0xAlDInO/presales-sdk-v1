# Presales SDK Dashboard

Interface Next.js pour interagir visuellement avec un SDK TypeScript genere pour le programme Solana `presalesSmartContract`.

Le projet permet de:
- connecter un wallet (Phantom ou Solflare),
- choisir le reseau (`devnet` / `mainnet-beta`),
- executer les instructions generees du smart contract,
- visualiser les retours de transaction (signature, logs, erreurs custom, trace d'instructions),
- inspecter et decoder les comptes on-chain du programme.

## Stack technique

- Next.js 14 + React 18
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- `@solana/kit` + SDK genere dans `src/generated`

## Prerequis

- Node.js 18+ (recommande: 20+)
- npm
- Un wallet Solana navigateur (Phantom ou Solflare)
- (Optionnel) PostgreSQL + `psql` pour initialiser la table locale de suivi des presales

## Installation

```bash
npm install
```

## Configuration environnement

Creer votre fichier `.env` a partir de l'exemple:

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
DATABASE_URL=postgres://presales_app:change_me_strong_password@localhost:5432/presales_sdk
```

Note: la base n'est pas obligatoire pour lancer l'UI. Elle est utile si vous voulez preparer la persistance SQL via le script `db:init`.

## Lancer le projet

Developpement:

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

- `npm run dev`: lance Next.js en mode developpement
- `npm run build`: build production
- `npm run start`: demarre le serveur Next.js en mode production
- `npm run lint`: lance le lint Next.js
- `npm run typecheck`: verifie les types TypeScript sans generation
- `npm run db:init`: execute `db/postgres/init.sql` via `psql` et `DATABASE_URL`

## Fonctionnalites principales

### 1) Wallet & reseau

- Connexion/deconnexion wallet.
- Selection reseau `devnet` / `mainnet-beta`.
- Persistance locale du reseau choisi (`localStorage`).

### 2) Execution des instructions SDK

Le dashboard charge automatiquement les metadonnees depuis `src/generated/instructions` et construit les formulaires dynamiquement.

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

Apres execution:

- statut (`pending`, `success`, `error`),
- signature + lien Solana Explorer,
- logs RPC,
- decodage d'erreurs custom du programme,
- slot, frais, compute units, trace d'instructions.

### 4) Account Inspector

Decodage on-chain des comptes du programme:

- `BuyerDetails`
- `PresaleDetails`
- `PresaleIndex`
- `PriceUpdateV2`

## Programme Solana cible

Adresse du programme utilisee dans le SDK genere:

```text
7EmvXDM9hJz3ULKuP9o5qxyfM2M3MT948aJnZnqzKPBG
```

Source: `src/generated/programs/presalesSmartContract.ts`.

## Base de donnees (optionnel)

Le script SQL `db/postgres/init.sql` cree une table `presales` (et index) pour stocker des informations de presale.

Initialisation:

```bash
npm run db:init
```

## Structure utile du projet

```text
src/
  app/                      # Entree Next.js
  components/               # UI (wallet, formulaires, resultats, inspecteur)
  hooks/                    # Logique client (wallet, transaction, inspection)
  lib/                      # Helpers SDK/runtime/diagnostics
  generated/                # Code genere du programme Solana (accounts/instructions/errors)
db/postgres/init.sql        # Schema SQL optionnel
```

## Bonnes pratiques

- Ne pas modifier manuellement les fichiers de `src/generated`.
- Tester d'abord sur `devnet` avant `mainnet-beta`.
- Verifier soigneusement les adresses et montants avant signature.

## Licence

MIT (voir [LICENSE](LICENSE)).
