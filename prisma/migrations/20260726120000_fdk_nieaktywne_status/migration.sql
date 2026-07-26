-- Add NIEAKTYWNE value to FdkStatus enum
-- Used for OŚW after zgłoszenie zakończenia pracy (instead of "wchłonięte")
ALTER TYPE "FdkStatus" ADD VALUE 'NIEAKTYWNE';
