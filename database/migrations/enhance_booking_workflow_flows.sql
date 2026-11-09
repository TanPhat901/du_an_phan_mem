-- Migration: add PENDING booking status so customer bookings wait for owner confirmation
ALTER TYPE public.booking_status_enum ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'CONFIRMED';

