-- Add ODWOLANIE value to FdkBaseType enum
-- PostgreSQL allows adding values to existing enums without recreation.
ALTER TYPE "FdkBaseType" ADD VALUE 'ODWOLANIE';
