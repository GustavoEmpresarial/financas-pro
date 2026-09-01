-- Baseline do schema.
--
-- Portado de legacy/server/prisma/schema.prisma, com os tipos de coluna
-- corrigidos. O schema.prisma guardava datas de negocio como TEXT, dinheiro
-- como DOUBLE PRECISION e ids como TEXT; aqui eles sao date, numeric e uuid.
-- Ver docs/decisions/0002-tipos-de-coluna.md.
--
-- O contrato HTTP nao muda: `date` continua saindo como "AAAA-MM-DD" no JSON
-- (server/shared/dates.Date), `numeric` como numero e `uuid` como string.
--
-- FKs ficam no fim porque transactions e recurring_subscriptions se
-- referenciam mutuamente.

-- +goose Up

-- ---------------------------------------------------------------- identidade

CREATE TABLE users (
    id            uuid PRIMARY KEY,
    email         text NOT NULL,
    password_hash text NOT NULL,
    display_name  text,
    created_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Unico e case-insensitive: o cadastro ja normaliza o e-mail para minusculas,
-- e o indice garante que "A@x.com" e "a@x.com" nao virem duas contas.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE profiles (
    id               uuid PRIMARY KEY,
    user_id          uuid NOT NULL,
    display_name     text,
    avatar_url       text,
    theme_preference text,
    created_at       timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX profiles_user_id_key ON profiles (user_id);

-- ------------------------------------------------------------ classificacao

CREATE TABLE categories (
    id         uuid PRIMARY KEY,
    user_id    uuid NOT NULL,
    name       text NOT NULL,
    icon       text,
    color      text,
    type       text NOT NULL,
    parent_id  uuid,
    is_default boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    deleted_at timestamp(3),
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense')),
    -- Uma categoria nao pode ser pai de si mesma.
    CONSTRAINT categories_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX categories_user_id_deleted_at_idx ON categories (user_id, deleted_at);
CREATE INDEX categories_user_id_type_idx ON categories (user_id, type);

CREATE TABLE payment_methods (
    id         uuid PRIMARY KEY,
    user_id    uuid NOT NULL,
    name       text NOT NULL,
    type       text NOT NULL,
    brand      text,
    is_default boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    color      text,
    icon       text,
    deleted_at timestamp(3),
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payment_methods_type_check CHECK (
        type IN ('credit_card', 'debit_card', 'cash', 'pix', 'transfer', 'other')
    )
);
CREATE INDEX payment_methods_user_id_deleted_at_idx ON payment_methods (user_id, deleted_at);

-- ------------------------------------------------------------------- contas

CREATE TABLE financial_accounts (
    id         uuid PRIMARY KEY,
    user_id    uuid NOT NULL,
    name       text NOT NULL,
    -- Sem CHECK de nao-negativo: conta corrente no vermelho e saldo legitimo.
    balance    numeric(14,2) NOT NULL DEFAULT 0,
    type       text NOT NULL,
    bank       text,
    color      text,
    icon       text,
    is_active  boolean NOT NULL DEFAULT true,
    notes      text,
    deleted_at timestamp(3),
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT financial_accounts_type_check CHECK (
        type IN ('checking', 'savings', 'investment', 'wallet')
    )
);
CREATE INDEX financial_accounts_user_id_deleted_at_idx ON financial_accounts (user_id, deleted_at);

CREATE TABLE credit_cards (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL,
    name         text NOT NULL,
    brand        text,
    total_limit  numeric(14,2) NOT NULL,
    closing_day  integer NOT NULL,
    due_day      integer NOT NULL,
    color        text,
    card_type    text,
    image_url    text,
    card_network text,
    is_active    boolean NOT NULL DEFAULT true,
    notes        text,
    deleted_at   timestamp(3),
    created_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT credit_cards_total_limit_check CHECK (total_limit > 0),
    CONSTRAINT credit_cards_closing_day_check CHECK (closing_day BETWEEN 1 AND 31),
    CONSTRAINT credit_cards_due_day_check     CHECK (due_day BETWEEN 1 AND 31)
);
CREATE INDEX credit_cards_user_id_deleted_at_idx ON credit_cards (user_id, deleted_at);

CREATE TABLE account_transfers (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL,
    from_account_id uuid NOT NULL,
    to_account_id   uuid NOT NULL,
    amount          numeric(14,2) NOT NULL,
    date            date NOT NULL,
    description     text,
    fee             numeric(14,2) NOT NULL DEFAULT 0,
    deleted_at      timestamp(3),
    created_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT account_transfers_amount_check CHECK (amount > 0),
    CONSTRAINT account_transfers_fee_check    CHECK (fee >= 0),
    -- Transferir para a mesma conta nao move dinheiro nenhum.
    CONSTRAINT account_transfers_distinct     CHECK (from_account_id <> to_account_id)
);
CREATE INDEX account_transfers_user_id_deleted_at_idx ON account_transfers (user_id, deleted_at);

-- ------------------------------------------------------------ recorrencias

CREATE TABLE recurring_subscriptions (
    id                    uuid PRIMARY KEY,
    user_id               uuid NOT NULL,
    name                  text NOT NULL,
    amount                numeric(14,2) NOT NULL,
    frequency             text NOT NULL DEFAULT 'monthly',
    category_id           uuid,
    account_id            uuid,
    payment_method_id     uuid,
    next_billing_date     date,
    last_charged_at       date,
    billing_day           integer,
    status                text NOT NULL DEFAULT 'active',
    is_active             boolean NOT NULL DEFAULT true,
    source_transaction_id uuid,
    notes                 text,
    color                 text,
    icon                  text,
    logo_url              text,
    deleted_at            timestamp(3),
    created_at            timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT recurring_subscriptions_amount_check    CHECK (amount > 0),
    CONSTRAINT recurring_subscriptions_frequency_check CHECK (
        frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')
    ),
    CONSTRAINT recurring_subscriptions_billing_day_check CHECK (
        billing_day IS NULL OR billing_day BETWEEN 1 AND 31
    )
);
CREATE INDEX recurring_subscriptions_user_id_deleted_at_idx ON recurring_subscriptions (user_id, deleted_at);

-- ------------------------------------------------------------- movimentacao

CREATE TABLE transactions (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL,
    type                text NOT NULL,
    title               text,
    amount              numeric(14,2) NOT NULL,
    category_id         uuid,
    subcategory_id      uuid,
    description         text,
    notes               text,
    date                date NOT NULL,
    is_fixed            boolean NOT NULL DEFAULT false,
    payment_method      text NOT NULL DEFAULT 'pix',
    payment_method_id   uuid,
    credit_card_id      uuid,
    account_id          uuid,
    status              text NOT NULL DEFAULT 'paid',
    is_recurring        boolean NOT NULL DEFAULT false,
    recurrence_interval text,
    -- paid_at e instante, nao data de negocio: marca quando o pagamento foi
    -- registrado no sistema.
    paid_at             timestamp(3),
    subscription_id     uuid,
    tags                text[] NOT NULL DEFAULT ARRAY[]::text[],
    attachments         jsonb[] NOT NULL DEFAULT ARRAY[]::jsonb[],
    installment_count   integer,
    installment_number  integer,
    -- uuid gerado no navegador (client/src/shared/lib/uuid.ts) para agrupar as
    -- parcelas de uma mesma compra.
    installment_group   uuid,
    deleted_at          timestamp(3),
    created_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transactions_type_check   CHECK (type IN ('income', 'expense')),
    CONSTRAINT transactions_amount_check CHECK (amount > 0),
    -- paid_at e status andam juntos: "pago sem data" e "com data mas nao pago"
    -- sao estados que o relatorio nao sabe interpretar.
    CONSTRAINT transactions_paid_at_check CHECK (
        (status = 'paid' AND paid_at IS NOT NULL) OR (status <> 'paid' AND paid_at IS NULL)
    )
    -- Nao ha CHECK ligando is_recurring a recurrence_interval: o PUT e parcial
    -- e o update em lote nao le o estado atual de cada linha, entao a regra
    -- viveria quebrando em atualizacoes legitimas. Quem mantem os dois
    -- coerentes na criacao e o service.
);
CREATE INDEX transactions_user_id_deleted_at_date_idx ON transactions (user_id, deleted_at, date);
CREATE INDEX transactions_user_id_type_idx ON transactions (user_id, type);
CREATE INDEX transactions_subscription_id_idx ON transactions (subscription_id);

CREATE TABLE subscription_charges (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL,
    subscription_id uuid NOT NULL,
    transaction_id  uuid,
    amount          numeric(14,2) NOT NULL,
    charge_date     date NOT NULL,
    status          text NOT NULL DEFAULT 'pending',
    notes           text,
    deleted_at      timestamp(3),
    created_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX subscription_charges_subscription_id_idx ON subscription_charges (subscription_id);

CREATE TABLE bills (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL,
    title               text NOT NULL,
    amount              numeric(14,2) NOT NULL,
    due_date            date NOT NULL,
    paid_date           date,
    paid_amount         numeric(14,2) NOT NULL DEFAULT 0,
    is_paid             boolean NOT NULL DEFAULT false,
    status              text NOT NULL DEFAULT 'pending',
    priority            text NOT NULL DEFAULT 'medium',
    -- No schema.prisma esses tres eram string solta, sem @relation: apontavam
    -- para o nada do ponto de vista do banco, enquanto os mesmos campos em
    -- transactions tinham FK. A inconsistencia era do legado; aqui tem FK.
    category_id         uuid,
    account_id          uuid,
    payment_method_id   uuid,
    notes               text,
    is_recurring        boolean NOT NULL DEFAULT false,
    recurrence_interval text,
    installment_count   integer,
    installment_number  integer,
    installment_group   uuid,
    deleted_at          timestamp(3),
    created_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT bills_amount_check      CHECK (amount > 0),
    CONSTRAINT bills_paid_amount_check CHECK (paid_amount >= 0),
    CONSTRAINT bills_priority_check    CHECK (priority IN ('low', 'medium', 'high'))
);
CREATE INDEX bills_user_id_deleted_at_due_date_idx ON bills (user_id, deleted_at, due_date);

CREATE TABLE earnings (
    id          uuid PRIMARY KEY,
    user_id     uuid NOT NULL,
    source_name text NOT NULL,
    amount      numeric(14,2) NOT NULL,
    date        date NOT NULL,
    currency    text NOT NULL DEFAULT 'BRL',
    category    text,
    description text,
    is_fixed    boolean NOT NULL DEFAULT false,
    account_id  uuid,
    notes       text,
    deleted_at  timestamp(3),
    created_at  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT earnings_amount_check CHECK (amount > 0)
);
CREATE INDEX earnings_user_id_deleted_at_date_idx ON earnings (user_id, deleted_at, date);

-- ---------------------------------------------------------- planejamento

CREATE TABLE category_budgets (
    id          uuid PRIMARY KEY,
    user_id     uuid NOT NULL,
    category_id uuid NOT NULL,
    -- Competencia "AAAA-MM", nao uma data: o orcamento e do mes inteiro. Fica
    -- text com CHECK em vez de date porque e o formato que o cliente envia e
    -- exibe, e guardar o dia 1 obrigaria a converter nos dois sentidos.
    month       text NOT NULL,
    amount      numeric(14,2) NOT NULL,
    deleted_at  timestamp(3),
    created_at  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT category_budgets_month_check  CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT category_budgets_amount_check CHECK (amount > 0)
);
CREATE UNIQUE INDEX category_budgets_user_id_category_id_month_key
    ON category_budgets (user_id, category_id, month);

CREATE TABLE financial_goals (
    id             uuid PRIMARY KEY,
    user_id        uuid NOT NULL,
    name           text NOT NULL,
    target_amount  numeric(14,2) NOT NULL,
    current_amount numeric(14,2) NOT NULL DEFAULT 0,
    deadline       date,
    category       text,
    priority       text NOT NULL DEFAULT 'medium',
    status         text NOT NULL DEFAULT 'active',
    monthly_target numeric(14,2),
    color          text,
    notes          text,
    deleted_at     timestamp(3),
    created_at     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT financial_goals_target_check   CHECK (target_amount > 0),
    CONSTRAINT financial_goals_current_check  CHECK (current_amount >= 0),
    CONSTRAINT financial_goals_priority_check CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT financial_goals_status_check   CHECK (
        status IN ('active', 'completed', 'paused', 'cancelled')
    )
);
CREATE INDEX financial_goals_user_id_deleted_at_idx ON financial_goals (user_id, deleted_at);

-- ------------------------------------------------------------ investimentos

CREATE TABLE investments (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL,
    name            text NOT NULL,
    ticker          text,
    type            text,
    amount_invested numeric(14,2) NOT NULL,
    current_value   numeric(14,2) NOT NULL,
    purchase_date   date,
    category        text,
    broker          text,
    notes           text,
    color           text,
    deleted_at      timestamp(3),
    created_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT investments_amount_check  CHECK (amount_invested >= 0),
    CONSTRAINT investments_current_check CHECK (current_value >= 0)
);
CREATE INDEX investments_user_id_deleted_at_idx ON investments (user_id, deleted_at);

CREATE TABLE crypto_holdings (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    name          text NOT NULL,
    symbol        text NOT NULL,
    -- Cripto nao cabe em duas casas decimais: 0,00000001 BTC e uma posicao
    -- valida. Por isso quantidade e precos nao usam numeric(14,2).
    quantity      numeric(28,10) NOT NULL,
    avg_price     numeric(20,8) NOT NULL,
    current_price numeric(20,8) NOT NULL DEFAULT 0,
    purchase_date date,
    category      text,
    network       text,
    notes         text,
    deleted_at    timestamp(3),
    created_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT crypto_holdings_quantity_check CHECK (quantity > 0),
    CONSTRAINT crypto_holdings_avg_price_check CHECK (avg_price >= 0),
    CONSTRAINT crypto_holdings_current_price_check CHECK (current_price >= 0)
);
CREATE INDEX crypto_holdings_user_id_deleted_at_idx ON crypto_holdings (user_id, deleted_at);

CREATE TABLE alt_investments (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL,
    name            text NOT NULL,
    type            text,
    invested_amount numeric(14,2) NOT NULL,
    current_value   numeric(14,2) NOT NULL DEFAULT 0,
    purchase_date   date,
    maturity_date   date,
    -- Percentual ao ano, nao dinheiro.
    expected_return numeric(9,4),
    risk_level      text,
    platform        text,
    notes           text,
    logo_url        text,
    is_active       boolean NOT NULL DEFAULT true,
    deleted_at      timestamp(3),
    created_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT alt_investments_invested_check CHECK (invested_amount >= 0),
    CONSTRAINT alt_investments_current_check  CHECK (current_value >= 0),
    -- Vencimento nao pode ser anterior a compra.
    CONSTRAINT alt_investments_dates_check    CHECK (
        purchase_date IS NULL OR maturity_date IS NULL OR maturity_date >= purchase_date
    )
);
CREATE INDEX alt_investments_user_id_deleted_at_idx ON alt_investments (user_id, deleted_at);

CREATE TABLE alt_investment_earnings (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    investment_id uuid NOT NULL,
    amount        numeric(14,2) NOT NULL,
    type          text NOT NULL,
    date          date NOT NULL,
    notes         text,
    deleted_at    timestamp(3),
    created_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT alt_investment_earnings_amount_check CHECK (amount > 0),
    CONSTRAINT alt_investment_earnings_type_check   CHECK (
        type IN ('dividend', 'interest', 'redemption', 'appreciation')
    )
);
CREATE INDEX alt_investment_earnings_investment_id_idx ON alt_investment_earnings (investment_id);

-- -------------------------------------------------------------- auditoria

CREATE TABLE record_audits (
    id         uuid PRIMARY KEY,
    table_name text NOT NULL,
    -- Aponta para a linha de qualquer tabela; sem FK possivel.
    record_id  uuid NOT NULL,
    action     text NOT NULL,
    old_data   jsonb,
    new_data   jsonb,
    user_id    uuid,
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX record_audits_table_name_record_id_idx ON record_audits (table_name, record_id);
CREATE INDEX record_audits_created_at_idx ON record_audits (created_at);

-- ------------------------------------------------------------------- FKs

ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE transactions ADD CONSTRAINT transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT transactions_credit_card_id_fkey
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES financial_accounts (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT transactions_subscription_id_fkey
    FOREIGN KEY (subscription_id) REFERENCES recurring_subscriptions (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_id_fkey
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE recurring_subscriptions ADD CONSTRAINT recurring_subscriptions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE recurring_subscriptions ADD CONSTRAINT recurring_subscriptions_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES financial_accounts (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE recurring_subscriptions ADD CONSTRAINT recurring_subscriptions_payment_method_id_fkey
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE recurring_subscriptions ADD CONSTRAINT recurring_subscriptions_source_transaction_id_fkey
    FOREIGN KEY (source_transaction_id) REFERENCES transactions (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE subscription_charges ADD CONSTRAINT subscription_charges_subscription_id_fkey
    FOREIGN KEY (subscription_id) REFERENCES recurring_subscriptions (id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE subscription_charges ADD CONSTRAINT subscription_charges_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE category_budgets ADD CONSTRAINT category_budgets_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE financial_goals ADD CONSTRAINT financial_goals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE alt_investment_earnings ADD CONSTRAINT alt_investment_earnings_investment_id_fkey
    FOREIGN KEY (investment_id) REFERENCES alt_investments (id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE account_transfers ADD CONSTRAINT account_transfers_from_account_id_fkey
    FOREIGN KEY (from_account_id) REFERENCES financial_accounts (id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE account_transfers ADD CONSTRAINT account_transfers_to_account_id_fkey
    FOREIGN KEY (to_account_id) REFERENCES financial_accounts (id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- bills: as tres FKs que faltavam no schema.prisma.
ALTER TABLE bills ADD CONSTRAINT bills_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE bills ADD CONSTRAINT bills_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES financial_accounts (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE bills ADD CONSTRAINT bills_payment_method_id_fkey
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- earnings: FK que tambem nao existia.
ALTER TABLE earnings ADD CONSTRAINT earnings_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES financial_accounts (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- +goose Down

-- Um DROP so, com CASCADE: transactions e recurring_subscriptions se
-- referenciam mutuamente, entao nao existe ordem de drop que funcione uma
-- tabela por vez.
DROP TABLE IF EXISTS
    record_audits,
    alt_investment_earnings,
    alt_investments,
    crypto_holdings,
    investments,
    financial_goals,
    category_budgets,
    earnings,
    bills,
    subscription_charges,
    transactions,
    recurring_subscriptions,
    account_transfers,
    credit_cards,
    financial_accounts,
    payment_methods,
    categories,
    profiles,
    users
CASCADE;
