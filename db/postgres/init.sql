CREATE TABLE IF NOT EXISTS presales (
  id BIGINT PRIMARY KEY,
  mint_address TEXT NOT NULL,
  usdc_mint_address TEXT NOT NULL,
  admin_address TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  presale_index_address TEXT,
  presale_details_address TEXT,
  presale_ata_address TEXT,
  presale_vault_address TEXT,
  presale_usdc_vault_ata_address TEXT,
  owner_ata_address TEXT,
  system_program_address TEXT NOT NULL DEFAULT '11111111111111111111111111111111',
  spl_token_program_address TEXT NOT NULL DEFAULT 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token_program_address TEXT NOT NULL DEFAULT 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  associated_token_program_address TEXT NOT NULL DEFAULT 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  starting_unix_timestamp BIGINT NOT NULL,
  end_unix_timestamp BIGINT NOT NULL,
  soft_cap_amount NUMERIC(78, 0) NOT NULL,
  hard_cap_amount NUMERIC(78, 0) NOT NULL,
  minimum_tokens_per_address NUMERIC(78, 0) NOT NULL,
  maximum_tokens_per_address NUMERIC(78, 0) NOT NULL,
  price_per_token NUMERIC(78, 0) NOT NULL,
  tx_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT presales_time_order CHECK (end_unix_timestamp > starting_unix_timestamp),
  CONSTRAINT presales_hard_cap_gte_soft_cap CHECK (hard_cap_amount >= soft_cap_amount),
  CONSTRAINT presales_max_tokens_gte_min_tokens CHECK (maximum_tokens_per_address >= minimum_tokens_per_address)
);

CREATE INDEX IF NOT EXISTS idx_presales_owner_address ON presales(owner_address);
CREATE INDEX IF NOT EXISTS idx_presales_mint_address ON presales(mint_address);
CREATE INDEX IF NOT EXISTS idx_presales_created_at ON presales(created_at DESC);
