/*
  Warnings:

  - You are about to drop the column `content` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `tierAtCreation` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Draft` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `Draft` table. All the data in the column will be lost.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tier` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Grant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Draft` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Invite` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - The required column `id` was added to the `Session` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled');

-- DropForeignKey
ALTER TABLE "Draft" DROP CONSTRAINT "Draft_userEmail_fkey";

-- DropForeignKey
ALTER TABLE "Grant" DROP CONSTRAINT "Grant_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_email_fkey";

-- AlterTable
ALTER TABLE "Draft" DROP COLUMN "content",
DROP COLUMN "tierAtCreation",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
DROP COLUMN "userEmail",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invite" DROP COLUMN "status",
ADD COLUMN     "status" "InviteStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
DROP COLUMN "email",
DROP COLUMN "expiresAt",
DROP COLUMN "token",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLogin",
DROP COLUMN "tier",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Grant";

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT,
    "mission" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "ein" TEXT,
    "sector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
