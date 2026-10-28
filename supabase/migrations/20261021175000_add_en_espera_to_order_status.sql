-- Migration: Add 'en_espera' to order_status enum if not exists
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'en_espera';
