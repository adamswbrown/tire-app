-- CreateTable
CREATE TABLE "user_customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_customers_userId_idx" ON "user_customers"("userId");

-- CreateIndex
CREATE INDEX "user_customers_customerId_idx" ON "user_customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_customers_userId_customerId_key" ON "user_customers"("userId", "customerId");

-- AddForeignKey
ALTER TABLE "user_customers" ADD CONSTRAINT "user_customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_customers" ADD CONSTRAINT "user_customers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
