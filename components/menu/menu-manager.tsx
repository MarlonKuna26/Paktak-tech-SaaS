'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  FileSpreadsheet,
  ChefHat,
  Wine,
  Tag,
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { MenuCategory, MenuProduct } from '@/lib/menu/types';
import { getProductImageUrl, FOOD_PHOTO_PRESETS } from '@/lib/orders/product-images';

type ProductFormData = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  station: 'cocina' | 'barra';
  imageUrl: string;
};

const emptyProductForm: ProductFormData = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  station: 'cocina',
  imageUrl: '',
};

function DishPhotoPicker({
  value,
  onChange,
  dishName,
  categoryName,
}: {
  value: string;
  onChange: (url: string) => void;
  dishName: string;
  categoryName?: string;
}) {
  const [showGallery, setShowGallery] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('todas');
  const effectiveUrl = getProductImageUrl(dishName || 'Plato', categoryName, value);

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 p-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-[#f3a806]" />
          <span>Foto del Plato</span>
        </label>
        <button
          type="button"
          onClick={() => setShowGallery(!showGallery)}
          className="text-[11px] font-bold text-[#f3a806] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showGallery ? 'Ocultar Galería' : 'Elegir Foto Chévere'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 shadow-2xs">
          <img src={effectiveUrl} alt="Preview" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 space-y-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pega un enlace de foto o elige de la galería..."
            className="h-9 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>{value ? '✓ Foto personalizada asignada' : 'Foto sugerida automáticamente según el nombre'}</span>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Restablecer auto
              </button>
            )}
          </div>
        </div>
      </div>

      {showGallery && (
        <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-700 space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'hamburguesas', label: 'Burgers' },
              { id: 'carnes', label: 'Carnes' },
              { id: 'mariscos', label: 'Mariscos' },
              { id: 'pollos', label: 'Pollos' },
              { id: 'pizzas_pastas', label: 'Pizzas & Pastas' },
              { id: 'entradas', label: 'Entradas' },
              { id: 'mexicana', label: 'Mexicana' },
              { id: 'postres', label: 'Postres' },
              { id: 'bebidas', label: 'Bebidas' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFilter(cat.id)}
                className={`h-6 px-2.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFilter === cat.id
                    ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-1 rounded-xl bg-black/5 dark:bg-black/30">
            {FOOD_PHOTO_PRESETS.filter(
              (p) => selectedFilter === 'todas' || p.category === selectedFilter,
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onChange(preset.url);
                  setShowGallery(false);
                }}
                className={`group relative aspect-4/3 overflow-hidden rounded-lg border transition-all cursor-pointer ${
                  value === preset.url
                    ? 'border-2 border-[#f3a806] ring-2 ring-[#f3a806]/40'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-[#f3a806]'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-xs px-1 py-0.5 text-[9px] font-semibold text-white truncate text-center">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState<'todas' | 'cocina' | 'barra'>('todas');

  // Modales
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Form states
  const [newDish, setNewDish] = useState<ProductFormData>(emptyProductForm);
  const [editDish, setEditDish] = useState<ProductFormData>(emptyProductForm);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Modal de confirmación suave (sin alert de navegador)
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'orange' | 'danger';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: categoryData, error: categoryError }, { data: productData, error: productError }] =
        await Promise.all([
          supabase
            .from('categories')
            .select('id, name, sort_order, active')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('products')
            .select('id, category_id, name, description, price_cents, active, station, image_url')
            .eq('restaurant_id', restaurantId)
            .order('name', { ascending: true }),
        ]);

      if (categoryError || productError) {
        setFeedback({ ok: false, text: 'No se pudo cargar el menú del restaurante.' });
        return;
      }

      setCategories((categoryData ?? []) as MenuCategory[]);
      setProducts((productData ?? []) as MenuProduct[]);
    } catch {
      setFeedback({ ok: false, text: 'Error de red al consultar el menú.' });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, supabase]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  // Parsear precio ingresado (en dólares) a centavos
  function parsePriceToCents(priceStr: string): number | null {
    const clean = priceStr.trim().replace(',', '.');
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || parsed < 0) return null;
    return clean.includes('.')
      ? Math.round(parsed * 100)
      : parsed < 100
        ? Math.round(parsed * 100)
        : Math.round(parsed);
  }

  // 1. Agregar Categoría
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const { error: insErr } = await supabase.from('categories').insert({
        restaurant_id: restaurantId,
        name: newCategoryName.trim(),
        sort_order: categories.length + 1,
        active: true,
      });

      setIsSubmitting(false);
      if (insErr) {
        setFeedback({ ok: false, text: 'No se pudo crear la categoría.' });
        return;
      }

      setFeedback({ ok: true, text: `Categoría "${newCategoryName.trim()}" agregada.` });
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      await loadMenu();
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error de conexión al agregar categoría.' });
    }
  }

  // Toggle y Eliminar Categoría
  async function handleToggleCategory(category: MenuCategory) {
    try {
      const nextActive = !category.active;
      const { error: updErr } = await supabase
        .from('categories')
        .update({ active: nextActive })
        .eq('id', category.id)
        .eq('restaurant_id', restaurantId);

      if (updErr) {
        setFeedback({ ok: false, text: 'No se pudo actualizar la categoría.' });
        return;
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, active: nextActive } : c)),
      );
    } catch {
      setFeedback({ ok: false, text: 'Error al cambiar estado de categoría.' });
    }
  }

  function handleDeleteCategory(id: string, name: string) {
    setConfirmModalData({
      isOpen: true,
      title: `Eliminar Categoría "${name}"`,
      description: `¿Estás seguro de que deseas eliminar la categoría "${name}"? Los platos asociados pasarán a "Sin categoría" sin perder su información.`,
      confirmText: 'Eliminar Categoría',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error: delErr } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

          if (delErr) {
            setFeedback({ ok: false, text: 'No se pudo eliminar la categoría.' });
            return;
          }
          setFeedback({ ok: true, text: `Categoría "${name}" eliminada.` });
          await loadMenu();
        } catch {
          setFeedback({ ok: false, text: 'Error al eliminar categoría.' });
        } finally {
          setConfirmModalData(null);
        }
      },
    });
  }

  // 2. Agregar Plato
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parsePriceToCents(newDish.price);
    if (!newDish.name.trim() || priceCents === null) {
      setFeedback({ ok: false, text: 'Indica un nombre y un precio válido (ej. 4.50).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const { error: insErr } = await supabase.from('products').insert({
        restaurant_id: restaurantId,
        category_id: newDish.categoryId || null,
        name: newDish.name.trim(),
        description: newDish.description.trim() || null,
        price_cents: priceCents,
        station: newDish.station,
        image_url: newDish.imageUrl.trim() || null,
        active: true,
      });

      setIsSubmitting(false);
      if (insErr) {
        setFeedback({ ok: false, text: 'No se pudo crear el plato.' });
        return;
      }

      setFeedback({ ok: true, text: `Plato "${newDish.name.trim()}" agregado al menú con éxito.` });
      setNewDish(emptyProductForm);
      setShowAddDishModal(false);
      await loadMenu();
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error de red al guardar el plato.' });
    }
  }

  // 3. Iniciar Edición de Plato
  function openEditProduct(prod: MenuProduct) {
    setEditingProduct(prod);
    setEditDish({
      name: prod.name,
      description: prod.description || '',
      price: (prod.price_cents / 100).toFixed(2),
      categoryId: prod.category_id || '',
      station: prod.station,
      imageUrl: prod.image_url || '',
    });
  }

  // Guardar Edición de Plato
  async function handleSaveEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    const priceCents = parsePriceToCents(editDish.price);
    if (!editDish.name.trim() || priceCents === null) {
      setFeedback({ ok: false, text: 'Verifica el nombre y un precio válido.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const { error: updErr } = await supabase
        .from('products')
        .update({
          name: editDish.name.trim(),
          description: editDish.description.trim() || null,
          price_cents: priceCents,
          category_id: editDish.categoryId || null,
          station: editDish.station,
          image_url: editDish.imageUrl.trim() || null,
        })
        .eq('id', editingProduct.id)
        .eq('restaurant_id', restaurantId);

      setIsSubmitting(false);
      if (updErr) {
        setFeedback({ ok: false, text: 'No se pudo actualizar el plato.' });
        return;
      }

      setFeedback({ ok: true, text: `Plato "${editDish.name.trim()}" actualizado correctamente.` });
      setEditingProduct(null);
      await loadMenu();
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error de red al actualizar plato.' });
    }
  }

  // 4. Activar / Pausar Plato
  async function handleToggleProduct(item: MenuProduct) {
    try {
      const nextActive = !item.active;
      const { error: updErr } = await supabase
        .from('products')
        .update({ active: nextActive })
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId);

      if (updErr) {
        setFeedback({ ok: false, text: 'No se pudo cambiar el estado del plato.' });
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, active: nextActive } : p)),
      );
      setFeedback({
        ok: true,
        text: `Plato "${item.name}" ${nextActive ? 'disponible' : 'pausado / agotado'}.`,
      });
    } catch {
      setFeedback({ ok: false, text: 'Error al cambiar estado del plato.' });
    }
  }

  // 5. Eliminar Plato
  function handleDeleteProduct(id: string, name: string) {
    setConfirmModalData({
      isOpen: true,
      title: `Eliminar Plato "${name}"`,
      description: `¿Estás seguro de que deseas eliminar permanentemente el plato "${name}" del menú? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Plato',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error: delErr } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

          if (delErr) {
            setFeedback({ ok: false, text: 'No se pudo eliminar el plato.' });
            return;
          }
          setFeedback({ ok: true, text: `Plato "${name}" eliminado del menú.` });
          await loadMenu();
        } catch {
          setFeedback({ ok: false, text: 'Error al eliminar plato.' });
        } finally {
          setConfirmModalData(null);
        }
      },
    });
  }

  // 6. Importar CSV
  async function handleImportCsv(file: File) {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
      if (rows.length < 2) {
        setFeedback({ ok: false, text: 'El CSV debe tener encabezados y al menos una fila.' });
        setIsSubmitting(false);
        return;
      }
      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
      const nameIndex = headers.indexOf('name');
      const priceIndex = headers.indexOf('price_cents');
      if (nameIndex < 0 || priceIndex < 0) {
        setFeedback({ ok: false, text: 'El CSV requiere columnas "name" y "price_cents".' });
        setIsSubmitting(false);
        return;
      }

      const records = rows
        .slice(1)
        .map((row) => row.split(','))
        .map((values) => ({
          restaurant_id: restaurantId,
          name: values[nameIndex]?.trim() ?? '',
          price_cents: Number(values[priceIndex]),
          description: values[headers.indexOf('description')]?.trim() || null,
          station: (values[headers.indexOf('station')]?.trim() === 'barra' ? 'barra' : 'cocina') as
            | 'cocina'
            | 'barra',
          active: true,
        }))
        .filter((item) => item.name && Number.isInteger(item.price_cents) && item.price_cents >= 0);

      if (!records.length) {
        setFeedback({ ok: false, text: 'No se encontraron filas con datos válidos.' });
        setIsSubmitting(false);
        return;
      }

      const { error: impErr } = await supabase.from('products').insert(records);
      setIsSubmitting(false);
      if (impErr) {
        setFeedback({ ok: false, text: 'Error al insertar productos del CSV.' });
        return;
      }

      setFeedback({ ok: true, text: `${records.length} platos importados con éxito.` });
      setShowCsvModal(false);
      await loadMenu();
    } catch {
      setIsSubmitting(false);
      setFeedback({ ok: false, text: 'Error al procesar el archivo CSV.' });
    }
  }

  // Filtrado de platos
  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'todas' ||
      (selectedCategory === 'sin_categoria' && !prod.category_id) ||
      prod.category_id === selectedCategory;

    const matchesStation = stationFilter === 'todas' || prod.station === stationFilter;

    const matchesSearch =
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesStation && matchesSearch;
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const activeCount = products.filter((p) => p.active).length;
  const pausedCount = products.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold shadow-xs transition-all ${
            feedback.ok
              ? 'border border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border border-rose-500/20 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {feedback.ok ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Platos</p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{products.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">En carta digital & salón</p>
        </div>
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Disponibles</p>
          <p className="mt-1 text-2xl font-black text-[#f3a806]">{activeCount}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Listos para ordenar</p>
        </div>
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agotados / Pausa</p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{pausedCount}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ocultos temporalmente</p>
        </div>
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categorías</p>
          <p className="mt-1 text-2xl font-black text-[#f3a806]">{categories.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Secciones del menú</p>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Categorías del Menú</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Categoría</span>
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV</span>
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('todas')}
            className={`h-8 rounded-full px-3.5 text-xs font-bold transition-all shrink-0 ${
              selectedCategory === 'todas'
                ? 'bg-[#f3a806] text-zinc-950 shadow-xs'
                : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            Todas ({products.length})
          </button>

          {categories.map((cat) => {
            const countInCat = products.filter((p) => p.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <div key={cat.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-8 rounded-full px-3.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#f3a806] text-zinc-950 font-bold shadow-xs'
                      : cat.active
                        ? 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                        : 'border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-400 line-through'
                  }`}
                >
                  {cat.name} ({countInCat})
                </button>
                <button
                  onClick={() => void handleDeleteCategory(cat.id, cat.name)}
                  title="Eliminar categoría"
                  className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setSelectedCategory('sin_categoria')}
            className={`h-8 rounded-full px-3.5 text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'sin_categoria'
                ? 'bg-[#f3a806] text-zinc-950 font-bold shadow-xs'
                : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            Sin Categoría ({products.filter((p) => !p.category_id).length})
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Station filter & Add Dish Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar plato por nombre o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
            />
          </div>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value as 'todas' | 'cocina' | 'barra')}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none shadow-2xs"
          >
            <option value="todas">Todas las estaciones</option>
            <option value="cocina">🍳 Cocina Caliente</option>
            <option value="barra">🍹 Barra / Bebidas</option>
          </select>

          <button
            onClick={() => void loadMenu()}
            disabled={loading}
            className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            title="Recargar menú"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={() => setShowAddDishModal(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Plato a la Carta</span>
        </button>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !products.length ? (
          <div className="col-span-full rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            Cargando la carta del restaurante...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No se encontraron platos con los filtros actuales.</p>
            <p className="mt-1 text-xs">Agrega platos con el botón "Agregar Plato a la Carta".</p>
          </div>
        ) : (
          filteredProducts.map((dish) => {
            const catName = dish.category_id ? categoryMap.get(dish.category_id) : 'Sin categoría';
            const imgUrl = getProductImageUrl(dish.name, catName, dish.image_url);

            return (
              <div
                key={dish.id}
                className={`group flex flex-col justify-between rounded-3xl border overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md bg-white dark:bg-zinc-900 ${
                  dish.active
                    ? 'border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400/60 dark:hover:border-amber-500/50'
                    : 'border-zinc-200 dark:border-zinc-800 opacity-60 bg-zinc-50/50 dark:bg-zinc-900/40'
                }`}
              >
                {/* Imagen del Plato con badges sobrepuestos */}
                <div className="relative h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={imgUrl}
                    alt={dish.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

                  {/* Badges superiores */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs truncate max-w-[150px]">
                      {catName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black backdrop-blur-md shadow-xs ${
                        dish.station === 'barra'
                          ? 'bg-zinc-950/80 text-[#f3a806] border border-[#f3a806]/40'
                          : 'bg-amber-950/80 text-amber-200 border border-amber-500/40'
                      }`}
                    >
                      {dish.station === 'barra' ? <Wine className="w-3 h-3" /> : <ChefHat className="w-3 h-3" />}
                      <span className="capitalize">{dish.station}</span>
                    </span>
                  </div>

                  {/* Precio flotante sobre la foto */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
                    <span className="rounded-2xl bg-[#f3a806] px-3 py-1 font-black text-sm text-zinc-950 shadow-md">
                      ${(dish.price_cents / 100).toFixed(2)}
                    </span>
                    {dish.image_url ? (
                      <span className="rounded-full bg-white/90 text-zinc-950 text-[10px] font-black px-2 py-0.5 shadow-xs border border-zinc-200/80">
                        Foto lista
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/50 backdrop-blur-xs text-zinc-300 text-[10px] font-medium px-2 py-0.5">
                        Foto sugerida
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                      {dish.name}
                    </h4>
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.2rem]">
                      {dish.description || 'Sin descripción detallada.'}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleProduct(dish)}
                      className={`h-8 rounded-full px-3 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        dish.active
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {dish.active ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Disponible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Agotado</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditProduct(dish)}
                        className="h-8 rounded-full px-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-[#f3a806]" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(dish.id, dish.name)}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar plato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Nuevo Plato */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Nuevo Plato en la Carta</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Define el nombre, precio, categoría y estación de preparación para cocina.
            </p>

            <form onSubmit={(e) => void handleAddProduct(e)} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre del Plato *
                </label>
                <input
                  type="text"
                  required
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="Ej. Ceviche Mixto Especial"
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Precio (USD) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={newDish.price}
                    onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
                    placeholder="Ej. 8.50"
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Estación de Cocina *
                  </label>
                  <select
                    value={newDish.station}
                    onChange={(e) =>
                      setNewDish({ ...newDish, station: e.target.value as 'cocina' | 'barra' })
                    }
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3 text-xs focus:outline-none"
                  >
                    <option value="cocina">🍳 Cocina Caliente</option>
                    <option value="barra">🍹 Barra / Bebidas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoría
                </label>
                <select
                  value={newDish.categoryId}
                  onChange={(e) => setNewDish({ ...newDish, categoryId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3 text-xs focus:outline-none"
                >
                  <option value="">Sin categoría asignada</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descripción / Ingredientes (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newDish.description}
                  onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  placeholder="Ej. Pescado fresco, camarón, pulpo, cebolla morada y choclo."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Selector de Foto Chévere */}
              <DishPhotoPicker
                value={newDish.imageUrl}
                onChange={(url) => setNewDish({ ...newDish, imageUrl: url })}
                dishName={newDish.name}
                categoryName={categories.find((c) => c.id === newDish.categoryId)?.name}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Plato */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Editar Plato</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Modifica los detalles, precio o categoría de <strong>{editingProduct.name}</strong>.
            </p>

            <form onSubmit={(e) => void handleSaveEditProduct(e)} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre del Plato *
                </label>
                <input
                  type="text"
                  required
                  value={editDish.name}
                  onChange={(e) => setEditDish({ ...editDish, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Precio (USD) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={editDish.price}
                    onChange={(e) => setEditDish({ ...editDish, price: e.target.value })}
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Estación de Cocina *
                  </label>
                  <select
                    value={editDish.station}
                    onChange={(e) =>
                      setEditDish({ ...editDish, station: e.target.value as 'cocina' | 'barra' })
                    }
                    className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3 text-xs focus:outline-none"
                  >
                    <option value="cocina">🍳 Cocina Caliente</option>
                    <option value="barra">🍹 Barra / Bebidas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoría
                </label>
                <select
                  value={editDish.categoryId}
                  onChange={(e) => setEditDish({ ...editDish, categoryId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3 text-xs focus:outline-none"
                >
                  <option value="">Sin categoría asignada</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descripción / Ingredientes
                </label>
                <textarea
                  rows={2}
                  value={editDish.description}
                  onChange={(e) => setEditDish({ ...editDish, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Selector de Foto Chévere */}
              <DishPhotoPicker
                value={editDish.imageUrl}
                onChange={(url) => setEditDish({ ...editDish, imageUrl: url })}
                dishName={editDish.name}
                categoryName={categories.find((c) => c.id === editDish.categoryId)?.name}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Categoría */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Nueva Categoría</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrupa tus platos (ej. Entradas, Platos Fuertes, Postres, Cócteles).
            </p>

            <form onSubmit={(e) => void handleAddCategory(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Entradas Frías"
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-background px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Importar CSV */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Importar Menú vía CSV</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Carga tu menú completo de forma masiva desde una hoja de cálculo.
            </p>

            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">Formato de Columnas requerido:</p>
              <code>name, price_cents, description, station</code>
              <p className="text-[10px] text-zinc-400">
                Ejemplo: <code>Hamburguesa Clásica, 650, Con queso cheddar y papas, cocina</code>
              </p>
            </div>

            <div className="mt-4">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportCsv(f);
                }}
                disabled={isSubmitting}
                className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#f3a806] file:text-zinc-950 hover:file:bg-[#e09804] cursor-pointer"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Genérico Suave */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={confirmModalData.isOpen}
          title={confirmModalData.title}
          description={confirmModalData.description}
          confirmText={confirmModalData.confirmText}
          variant={confirmModalData.variant}
          onConfirm={confirmModalData.onConfirm}
          onClose={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
}
