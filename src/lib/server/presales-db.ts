import { Pool, type PoolConfig } from "pg";

const POOL_MAX_CONNECTIONS = 10;
const POOL_IDLE_TIMEOUT_MS = 30_000;
const POOL_CONNECT_TIMEOUT_MS = 10_000;

declare global {
  // eslint-disable-next-line no-var
  var __presalesPgPool: Pool | undefined;
}

function readRequiredEnvVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }
  return value;
}

function parsePort(rawPort: string): number {
  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("POSTGRES_PORT must be a valid integer between 1 and 65535.");
  }
  return parsed;
}

function getPoolConfigFromEnv(): PoolConfig {
  const host = readRequiredEnvVar("POSTGRES_HOST");
  const database = readRequiredEnvVar("POSTGRES_DB");
  const user = readRequiredEnvVar("POSTGRES_USER");
  const password = readRequiredEnvVar("POSTGRES_PASSWORD");
  const port = parsePort(readRequiredEnvVar("POSTGRES_PORT"));

  return {
    host,
    database,
    user,
    password,
    port,
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
  };
}

export function getPresalesPool(): Pool {
  if (globalThis.__presalesPgPool) {
    return globalThis.__presalesPgPool;
  }

  const pool = new Pool(getPoolConfigFromEnv());
  globalThis.__presalesPgPool = pool;
  return pool;
}

export async function getNextPresaleIdForMint(mintAddress: string): Promise<bigint> {
  const db = getPresalesPool();
  const result = await db.query<{ max_id: string | null }>(
    `
      SELECT MAX(id)::text AS max_id
      FROM presales
      WHERE mint_address = $1
    `,
    [mintAddress],
  );

  const row = result.rows[0];
  const maxId = row?.max_id ? BigInt(row.max_id) : -1n;
  return maxId + 1n;
}

export interface PersistedPresaleRecord {
  id: bigint;
  mintAddress: string;
  usdcMintAddress: string;
  adminAddress: string;
  ownerAddress: string;
  presaleIndexAddress: string;
  presaleDetailsAddress: string;
  presaleAtaAddress: string;
  presaleVaultAddress: string;
  presaleUsdcVaultAtaAddress: string;
  ownerAtaAddress: string;
  systemProgramAddress: string;
  splTokenProgramAddress: string;
  tokenProgramAddress: string;
  associatedTokenProgramAddress: string;
  startingUnixTimestamp: bigint;
  endUnixTimestamp: bigint;
  softCapAmount: bigint;
  hardCapAmount: bigint;
  minimumTokensPerAddress: bigint;
  maximumTokensPerAddress: bigint;
  pricePerToken: bigint;
  txSignature: string;
}

export async function upsertValidatedPresale(record: PersistedPresaleRecord): Promise<void> {
  const db = getPresalesPool();

  await db.query(
    `
      INSERT INTO presales (
        id,
        mint_address,
        usdc_mint_address,
        admin_address,
        owner_address,
        presale_index_address,
        presale_details_address,
        presale_ata_address,
        presale_vault_address,
        presale_usdc_vault_ata_address,
        owner_ata_address,
        system_program_address,
        spl_token_program_address,
        token_program_address,
        associated_token_program_address,
        starting_unix_timestamp,
        end_unix_timestamp,
        soft_cap_amount,
        hard_cap_amount,
        minimum_tokens_per_address,
        maximum_tokens_per_address,
        price_per_token,
        tx_signature,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, NOW()
      )
      ON CONFLICT (mint_address, id)
      DO UPDATE SET
        usdc_mint_address = EXCLUDED.usdc_mint_address,
        admin_address = EXCLUDED.admin_address,
        owner_address = EXCLUDED.owner_address,
        presale_index_address = EXCLUDED.presale_index_address,
        presale_details_address = EXCLUDED.presale_details_address,
        presale_ata_address = EXCLUDED.presale_ata_address,
        presale_vault_address = EXCLUDED.presale_vault_address,
        presale_usdc_vault_ata_address = EXCLUDED.presale_usdc_vault_ata_address,
        owner_ata_address = EXCLUDED.owner_ata_address,
        system_program_address = EXCLUDED.system_program_address,
        spl_token_program_address = EXCLUDED.spl_token_program_address,
        token_program_address = EXCLUDED.token_program_address,
        associated_token_program_address = EXCLUDED.associated_token_program_address,
        starting_unix_timestamp = EXCLUDED.starting_unix_timestamp,
        end_unix_timestamp = EXCLUDED.end_unix_timestamp,
        soft_cap_amount = EXCLUDED.soft_cap_amount,
        hard_cap_amount = EXCLUDED.hard_cap_amount,
        minimum_tokens_per_address = EXCLUDED.minimum_tokens_per_address,
        maximum_tokens_per_address = EXCLUDED.maximum_tokens_per_address,
        price_per_token = EXCLUDED.price_per_token,
        tx_signature = EXCLUDED.tx_signature,
        updated_at = NOW()
    `,
    [
      record.id.toString(),
      record.mintAddress,
      record.usdcMintAddress,
      record.adminAddress,
      record.ownerAddress,
      record.presaleIndexAddress,
      record.presaleDetailsAddress,
      record.presaleAtaAddress,
      record.presaleVaultAddress,
      record.presaleUsdcVaultAtaAddress,
      record.ownerAtaAddress,
      record.systemProgramAddress,
      record.splTokenProgramAddress,
      record.tokenProgramAddress,
      record.associatedTokenProgramAddress,
      record.startingUnixTimestamp.toString(),
      record.endUnixTimestamp.toString(),
      record.softCapAmount.toString(),
      record.hardCapAmount.toString(),
      record.minimumTokensPerAddress.toString(),
      record.maximumTokensPerAddress.toString(),
      record.pricePerToken.toString(),
      record.txSignature,
    ],
  );
}

export async function getAppConfig(key: string, defaultValue: string): Promise<string> {
  const db = getPresalesPool();
  try {
    const result = await db.query<{ value: string }>(
      `SELECT value FROM app_config WHERE key = $1`,
      [key],
    );
    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
  } catch (err: any) {
    if (err.code === "42P01") { // undefined_table
      console.log("[presales-db] app_config table not found. Creating and seeding...");
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await db.query(`
          INSERT INTO app_config (key, value)
          VALUES ('developer_fee_lamports', '150000000')
          ON CONFLICT (key) DO NOTHING
        `);
        const retryResult = await db.query<{ value: string }>(
          `SELECT value FROM app_config WHERE key = $1`,
          [key],
        );
        if (retryResult.rows.length > 0) {
          return retryResult.rows[0].value;
        }
      } catch (initErr) {
        console.error("[presales-db] Failed to self-initialize app_config table:", initErr);
      }
    } else {
      console.error("[presales-db] Error querying app_config:", err);
    }
  }
  return defaultValue;
}

export async function setAppConfig(key: string, value: string): Promise<void> {
  const db = getPresalesPool();
  try {
    await db.query(
      `
        INSERT INTO app_config (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [key, value],
    );
  } catch (err: any) {
    if (err.code === "42P01") {
      await getAppConfig(key, value);
      await db.query(
        `
          INSERT INTO app_config (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [key, value],
      );
    } else {
      throw err;
    }
  }
}
