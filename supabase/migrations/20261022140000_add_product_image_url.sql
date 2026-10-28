-- Migration: Add image_url to products table
-- Allows dishes to store custom, high-resolution food photos or presets

alter table public.products 
add column if not exists image_url text;

comment on column public.products.image_url is 'URL of the dish photo (preset or custom uploaded image)';
