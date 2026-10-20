'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { MenuCategory, MenuProduct } from '@/lib/menu/types';

type ProductForm = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  station: 'cocina' | 'barra';
};

const emptyProduct: ProductForm = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  station: 'cocina',
};

export function MenuManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [product, setProduct] = useState<ProductForm>(emptyProduct);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMenu = useCallback(async () => {
    const [{ data: categoryData, error: categoryError }, { data: productData, error: productError }] =
      await Promise.all([
        supabase.from('categories').select('id,name,sort_order,active').eq('restaurant_id', restaurantId).order('sort_order'),
        supabase.from('products').select('id,category_id,name,description,price_cents,active,station').eq('restaurant_id', restaurantId).order('name'),
      ]);
    if (categoryError || productError) {
      setError('No se pudo cargar el menú.');
      return;
    }
    setCategories((categoryData ?? []) as MenuCategory[]);
    setProducts((productData ?? []) as MenuProduct[]);
  }, [restaurantId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMenu(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMenu]);

  async function addCategory() {
    setError('');
    if (!categoryName.trim()) return;
    const { error: insertError } = await supabase.from('categories').insert({
      restaurant_id: restaurantId,
      name: categoryName.trim(),
      sort_order: categories.length,
    });
    if (insertError) {
      setError('No se pudo crear la categoría.');
      return;
    }
    setCategoryName('');
    setMessage('Categoría creada.');
    await loadMenu();
  }

  async function addProduct() {
    setError('');
    const cleanPrice = product.price.trim().replace(',', '.');
    const parsed = parseFloat(cleanPrice);
    if (!product.name.trim() || isNaN(parsed) || parsed < 0) {
      setError('Completa el nombre y un precio válido en dólares (ej. 2.50).');
      return;
    }

    // Convertir dólares a centavos de forma segura
    const priceCents = cleanPrice.includes('.')
      ? Math.round(parsed * 100)
      : parsed < 100
        ? Math.round(parsed * 100)
        : Math.round(parsed);

    const { error: insertError } = await supabase.from('products').insert({
      restaurant_id: restaurantId,
      category_id: product.categoryId || null,
      name: product.name.trim(),
      description: product.description.trim() || null,
      price_cents: priceCents,
      station: product.station,
    });
    if (insertError) {
      setError('No se pudo crear el producto.');
      return;
    }
    setProduct(emptyProduct);
    setMessage('Producto creado con éxito.');
    await loadMenu();
  }

  async function toggleCategory(item: MenuCategory) {
    const { error: updateError } = await supabase.from('categories').update({ active: !item.active }).eq('id', item.id).eq('restaurant_id', restaurantId);
    if (updateError) {
      setError('No se pudo actualizar la categoría.');
      return;
    }
    await loadMenu();
  }

  async function deleteCategory(id: string) {
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', id).eq('restaurant_id', restaurantId);
    if (deleteError) {
      setError('No se pudo eliminar la categoría.');
      return;
    }
    await loadMenu();
  }

  async function toggleProduct(item: MenuProduct) {
    const { error: updateError } = await supabase.from('products').update({ active: !item.active }).eq('id', item.id).eq('restaurant_id', restaurantId);
    if (updateError) {
      setError('No se pudo actualizar el producto.');
      return;
    }
    await loadMenu();
  }

  async function deleteProduct(id: string) {
    const { error: deleteError } = await supabase.from('products').delete().eq('id', id).eq('restaurant_id', restaurantId);
    if (deleteError) {
      setError('No se pudo eliminar el producto.');
      return;
    }
    await loadMenu();
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    if (rows.length < 2) {
      setError('El CSV debe tener encabezado y al menos un producto.');
      return;
    }
    const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
    const nameIndex = headers.indexOf('name');
    const priceIndex = headers.indexOf('price_cents');
    if (nameIndex < 0 || priceIndex < 0) {
      setError('El CSV debe incluir las columnas name y price_cents.');
      return;
    }
    const records = rows.slice(1).map((row) => row.split(',')).map((values) => ({
      restaurant_id: restaurantId,
      name: values[nameIndex]?.trim() ?? '',
      price_cents: Number(values[priceIndex]),
      description: values[headers.indexOf('description')]?.trim() || null,
      station: values[headers.indexOf('station')]?.trim() === 'barra' ? 'barra' : 'cocina',
    })).filter((item) => item.name && Number.isInteger(item.price_cents) && item.price_cents >= 0);
    if (!records.length) {
      setError('No se encontraron filas válidas.');
      return;
    }
    const { error: importError } = await supabase.from('products').insert(records);
    if (importError) {
      setError('No se pudo importar el CSV.');
      return;
    }
    setMessage(`${records.length} productos importados.`);
    await loadMenu();
  }

  return (
    <div className="space-y-8">
      {(message || error) && <p className={error ? 'rounded-md bg-destructive/10 p-3 text-sm text-destructive' : 'rounded-md bg-primary/10 p-3 text-sm text-primary'}>{error || message}</p>}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">Importar menú por CSV</h2>
        <p className="mb-3 text-sm text-muted-foreground">Columnas: name, price_cents, description, station.</p>
        <input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} className="block w-full text-sm" />
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Categorías</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ej. Entradas" className="h-11 flex-1 rounded-md border bg-background px-3" />
          <button onClick={() => void addCategory()} className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Agregar categoría</button>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <span className={item.active ? '' : 'text-muted-foreground line-through'}>{item.name}</span>
              <button onClick={() => void toggleCategory(item)} className="text-xs underline">{item.active ? 'Desactivar' : 'Activar'}</button>
              <button onClick={() => void deleteCategory(item.id)} className="text-xs text-destructive underline">Eliminar</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Nuevo producto</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} placeholder="Nombre" className="h-11 rounded-md border bg-background px-3" />
          <input value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} placeholder="Precio en USD (ej. 2.50)" inputMode="decimal" className="h-11 rounded-md border bg-background px-3" />
          <input value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} placeholder="Descripción (opcional)" className="h-11 rounded-md border bg-background px-3" />
          <select value={product.categoryId} onChange={(event) => setProduct({ ...product, categoryId: event.target.value })} className="h-11 rounded-md border bg-background px-3">
            <option value="">Sin categoría</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={product.station} onChange={(event) => setProduct({ ...product, station: event.target.value as ProductForm['station'] })} className="h-11 rounded-md border bg-background px-3">
            <option value="cocina">Cocina</option>
            <option value="barra">Barra</option>
          </select>
        </div>
        <button onClick={() => void addProduct()} className="mt-4 h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Agregar producto</button>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Productos</h2>
        <div className="space-y-2">
          {products.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{item.name} <span className="text-sm text-muted-foreground">${(item.price_cents / 100).toFixed(2)}</span></p>
                <p className="text-sm text-muted-foreground">{item.description || 'Sin descripción'} · {item.station}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void toggleProduct(item)} className="rounded-md border px-3 py-2 text-sm">{item.active ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => void deleteProduct(item.id)} className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">Eliminar</button>
              </div>
            </div>
          ))}
          {!products.length && <p className="text-sm text-muted-foreground">Todavía no hay productos.</p>}
        </div>
      </section>
    </div>
  );
}
