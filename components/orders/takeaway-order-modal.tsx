'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Check,
  Banknote,
  Smartphone,
  CreditCard,
  MessageCircle,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getProductImageUrl } from '@/lib/orders/product-images';

type ProductItem = {
  id: string;
  name: string;
  price_cents: number;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
};

type CategoryItem = {
  id: string;
  name: string;
};

type TakeawayCartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  notes: string;
};

export function TakeawayOrderModal({
  restaurantId,
  onClose,
  onSuccess,
}: {
  restaurantId: string;
  onClose: () => void;
  onSuccess: (order: {
    order_id: string;
    tracking_code: string;
    customer_name: string;
    total_cents: number;
  }) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [cart, setCart] = useState<TakeawayCartItem[]>([]);

  // Opciones de cobro anticipado
  const [payNow, setPayNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [cashGivenDollars, setCashGivenDollars] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Cargar categorías y productos activos
  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('id, name, price_cents, category_id, description, image_url')
          .eq('restaurant_id', restaurantId)
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      setCategories((cats ?? []) as CategoryItem[]);
      setProducts((prods ?? []) as ProductItem[]);
    } catch {
      setError('Error al cargar la carta del restaurante.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, supabase]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  // Manejo de Carrito
  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, 99) } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          priceCents: product.price_cents,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: Math.min(nextQty, 99) } : null;
          }
          return item;
        })
        .filter(Boolean) as TakeawayCartItem[],
    );
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, notes } : item)),
    );
  };

  const cartTotalCents = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.priceCents * it.quantity, 0);
  }, [cart]);

  // Vuelto en efectivo
  const cashGivenCents = useMemo(() => {
    const parsed = parseFloat(cashGivenDollars.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
  }, [cashGivenDollars]);

  const changeCents = Math.max(0, cashGivenCents - cartTotalCents);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory =
        selectedCategory === 'todas' || prod.category_id === selectedCategory;
      const matchesSearch =
        search.trim() === '' ||
        prod.name.toLowerCase().includes(search.toLowerCase()) ||
        (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  // Enviar Pedido Para Llevar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cart.length) {
      setError('Por favor agrega al menos un plato o bebida al pedido.');
      return;
    }

    if (payNow && paymentMethod === 'efectivo' && cashGivenCents > 0 && cashGivenCents < cartTotalCents) {
      setError('El efectivo recibido es menor al total a pagar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders/takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || 'Cliente Para Llevar',
          customerPhone: customerPhone.trim() || 'Mostrador',
          notes: orderNotes.trim() || null,
          items: cart.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            notes: it.notes.trim() || null,
          })),
          payNow,
          paymentMethod: payNow ? paymentMethod : null,
          paidCents: payNow && paymentMethod === 'efectivo' && cashGivenCents > 0 ? cashGivenCents : cartTotalCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el pedido para llevar.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.order);
      onClose();
    } catch {
      setError('Error de red al crear el pedido para llevar.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[#EAE5DE] bg-white shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#EAE5DE] px-6 py-4.5 bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAA228] text-[#181C20] shadow-xs">
              <ShoppingBag className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#8F5E00]">
                  Mostrador / Takeaway
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Sin Mesa · Para Llevar
                </span>
              </div>
              <h2 className="text-xl font-black text-[#181C20]">Nuevo Pedido Para Llevar</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20] hover:bg-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Lado Izquierdo: Catálogo de Platos & Búsqueda */}
          <div className="flex flex-1 flex-col border-b md:border-b-0 md:border-r border-[#EAE5DE] p-5 overflow-hidden">
            {/* Buscador & Categorías */}
            <div className="space-y-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C95A3]" />
                <input
                  type="text"
                  placeholder="Buscar plato o bebida..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 pl-9 pr-3.5 text-xs font-semibold text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              {/* Categorías en horizontal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('todas')}
                  className={`px-3 py-1.5 rounded-xl font-black shrink-0 transition-all cursor-pointer ${
                    selectedCategory === 'todas'
                      ? 'bg-[#181C20] text-white shadow-2xs'
                      : 'border border-[#EAE5DE] bg-[#FAF7F2] text-[#666E7A] hover:text-[#181C20]'
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-black shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#EAA228] text-[#181C20] shadow-2xs'
                        : 'border border-[#EAE5DE] bg-[#FAF7F2] text-[#666E7A] hover:text-[#181C20]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Productos */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-xs font-bold text-[#8C95A3]">
                  Cargando carta...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-xs text-[#8C95A3]">
                  <span>No se encontraron platos disponibles.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredProducts.map((prod) => {
                    const inCartItem = cart.find((c) => c.productId === prod.id);
                    const imgUrl = getProductImageUrl(prod.name, undefined, prod.image_url || undefined);
                    return (
                      <div
                        key={prod.id}
                        className={`rounded-2xl border p-2.5 flex items-center justify-between gap-2.5 transition-all cursor-pointer hover:border-[#EAA228] ${
                          inCartItem ? 'border-[#EAA228] bg-[#FEF9EE]/60' : 'border-[#EAE5DE] bg-white'
                        }`}
                        onClick={() => addToCart(prod)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={imgUrl}
                            alt={prod.name}
                            className="h-12 w-12 rounded-xl object-cover shrink-0 border border-[#EAE5DE]"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-[#181C20] truncate">{prod.name}</h4>
                            <p className="font-mono text-xs font-black text-[#EAA228]">
                              ${(prod.price_cents / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(prod);
                          }}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-black transition-all ${
                            inCartItem
                              ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                              : 'border border-[#EAE5DE] bg-[#FAF7F2] text-[#181C20] hover:bg-[#EAA228]'
                          }`}
                        >
                          {inCartItem ? inCartItem.quantity : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lado Derecho: Datos del Cliente, Resumen de Carrito y Cobro */}
          <div className="flex w-full md:w-80 lg:w-96 flex-col justify-between p-5 bg-[#FAF7F2]/60 overflow-y-auto space-y-4">
            {/* Datos del Cliente */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#666E7A]">
                1. Datos de Retiro
              </span>

              <div>
                <input
                  type="text"
                  placeholder="Nombre o Ticket (ej. Carlos M. / #01)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-bold text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div>
                <input
                  type="tel"
                  placeholder="WhatsApp cliente (opcional para avisarle)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-bold text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nota general (ej. 'Poner cubiertos y servilletas')"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#D9D3C7] bg-white px-3 text-xs text-[#181C20] placeholder:text-[#8C95A3] outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>
            </div>

            {/* Carrito de Productos */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#666E7A]">
                  2. Platos Seleccionados ({cart.length})
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-[#EAE5DE] rounded-2xl border border-[#EAE5DE] bg-white p-2 text-xs">
                {cart.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#8C95A3] italic">
                    Toca los platos a la izquierda para agregarlos.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="py-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#181C20] truncate pr-2">{item.name}</span>
                        <span className="font-mono font-black text-[#181C20] shrink-0">
                          ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Nota (ej. sin picante)..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                          className="h-7 flex-1 rounded-lg border border-[#EAE5DE] bg-[#FAF7F2] px-2 text-[11px] text-[#181C20] outline-none"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="h-6 w-6 rounded-md border border-[#EAE5DE] bg-white flex items-center justify-center font-black hover:bg-[#FAF7F2]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="h-6 w-6 rounded-md border border-[#EAE5DE] bg-white flex items-center justify-center font-black hover:bg-[#FAF7F2]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cobro en Mostrador */}
            <div className="space-y-2 pt-1 border-t border-[#EAE5DE]">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs font-black text-[#181C20]">
                  Cobrar de una vez en mostrador
                </span>
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#EAA228] cursor-pointer"
                />
              </label>

              {payNow && (
                <div className="space-y-2.5 rounded-2xl border border-[#EAA228]/40 bg-[#FEF9EE] p-3 animate-in fade-in">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                        { id: 'transferencia', label: 'Transf.', icon: Smartphone },
                        { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`h-9 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#EAA228] bg-white text-[#181C20] ring-2 ring-[#EAA228]'
                              : 'border-[#EAE5DE] bg-white/70 text-[#666E7A] hover:bg-white'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${isSel ? 'text-[#EAA228]' : 'text-[#666E7A]'}`} />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'efectivo' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder={`Efectivo recibido (ej. ${Math.ceil(cartTotalCents / 100) || 10})`}
                        value={cashGivenDollars}
                        onChange={(e) => setCashGivenDollars(e.target.value)}
                        className="h-9 w-full rounded-xl border border-[#D9D3C7] bg-white px-3 font-mono text-xs font-bold text-[#181C20] outline-none"
                      />
                      {cashGivenCents > cartTotalCents && (
                        <div className="flex justify-between items-center text-xs font-black text-[#8F5E00] px-1">
                          <span>Vuelto:</span>
                          <span className="font-mono">${(changeCents / 100).toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Total y Botón de Envío */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-[#666E7A]">Total a pagar:</span>
                <span className="font-mono text-2xl font-black text-[#181C20]">
                  ${(cartTotalCents / 100).toFixed(2)} <span className="text-xs">USD</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black uppercase tracking-wider text-[#181C20] transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>
                  {isSubmitting
                    ? 'Enviando orden...'
                    : payNow
                      ? `Cobrar $${(cartTotalCents / 100).toFixed(2)} y Mandar a Cocina`
                      : 'Mandar a Cocina (Cobrar al entregar)'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

