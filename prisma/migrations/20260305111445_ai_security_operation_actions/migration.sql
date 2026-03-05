-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OperationAction" ADD VALUE 'UPDATE_SECURITY_GROUP';
ALTER TYPE "OperationAction" ADD VALUE 'DELETE_SECURITY_GROUP';
ALTER TYPE "OperationAction" ADD VALUE 'CREATE_SECURITY_GROUP_RULE';
ALTER TYPE "OperationAction" ADD VALUE 'UPDATE_SECURITY_GROUP_RULE';
ALTER TYPE "OperationAction" ADD VALUE 'DELETE_SECURITY_GROUP_RULE';
ALTER TYPE "OperationAction" ADD VALUE 'CREATE_TENANT';
