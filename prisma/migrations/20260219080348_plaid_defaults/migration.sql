-- AlterTable
ALTER TABLE "BankConnection" ALTER COLUMN "partner" SET DEFAULT 'PLAID';

-- AlterTable
ALTER TABLE "PaymentMatch" ALTER COLUMN "partner" SET DEFAULT 'PLAID';
