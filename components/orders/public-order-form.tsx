'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Plus,
  Minus,
  Store,
  Bike,
  Sparkles,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Search,
  X,
  ChefHat,
  UtensilsCrossed,
  Flame,
} from 'lucide-react';
import type { CartItem, PublicMenuCategory, PublicMenuProduct } from '@/lib/orders/types';
import {
  getActiveOrder,
  getSavedCart,
  getSavedCustomerInfo,
  saveActiveOrder,
  saveCart,
  clearCart,
  saveCustomerInfo,
  type StoredActiveOrder,
} from '@/lib/orders/session';
import { getProductImageUrl } from '@/lib/orders/product-images';
import { CartDrawer } from './cart-drawer';
import { CheckoutModal } from './checkout-modal';
import { ProductCustomizerModal } from './product-customizer-modal';

export function PublicOrderForm({
  restaurantSlug,
  restaurantName,
  restaurantLogo,
  categories,
  products,
}: {
  restaurantSlug: string;
  restaurantName: string;
  restaurantLogo?: string | null;
  categories: PublicMenuCategory[];
  products: PublicMenuProduct[];
}) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeOrder, setActiveOrder] = useState<StoredActiveOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [orderMode, setOrderMode] = useState<'delivery' | 'pickup'>('pickup');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<PublicMenuProduct | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Group products by category and filter by search
  const categorizedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filterProducts = (list: PublicMenuProduct[]) => {
      if (!q) return list;
      return list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q))
      );
    };

    // If categories exist in database
    if (categories.length > 0) {
      return categories
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          products: filterProducts(products.filter((p) => p.category_id === cat.id)),
        }))
        .filter((group) => group.products.length > 0);
    }

    // Fallback: derive categories from products
    const map = new Map<string, PublicMenuProduct[]>();
    for (const p of products) {
      const catName = p.category_name || 'Especialidades';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    }

    return Array.from(map.entries())
      .map(([name, prods], idx) => ({
        id: `cat-${idx}`,
        name,
        products: filterProducts(prods),
      }))
      .filter((group) => group.products.length > 0);
  }, [categories, products, searchQuery]);

  // All category names for sticky tabs
  const categoryTabs = useMemo(() => {
    return categorizedProducts.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.products.length,
    }));
  }, [categorizedProducts]);

  // Set default active category tab
  useEffect(() => {
    if (categoryTabs.length > 0 && selectedCategory === 'all') {
      const timer = window.setTimeout(() => {
        setSelectedCategory(categoryTabs[0].id);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [categoryTabs, selectedCategory]);

  // Hydrate from localStorage
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedCart = getSavedCart<CartItem>(restaurantSlug);
      if (savedCart.length > 0) {
        setCart(savedCart);
      }
      const customer = getSavedCustomerInfo();
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
      }
      const active = getActiveOrder();
      if (active) {
        setActiveOrder(active);
      }
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [restaurantSlug]);

  // Persist cart
  useEffect(() => {
    if (!isHydrated) return;
    saveCart(restaurantSlug, cart);
  }, [cart, isHydrated, restaurantSlug]);

  // Cart totals
  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const totalCartCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart],
  );

  const totalCartFormatted = (totalCartCents / 100).toFixed(2);

  // Cart modifications
  const handleAddToCart = (product: PublicMenuProduct, quantity: number, notes: string) => {
    setCart((current) => {
      const existingIndex = current.findIndex(
        (it) => it.id === product.id && (it.notes || '') === notes,
      );

      if (existingIndex > -1) {
        return current.map((it, idx) =>
          idx === existingIndex
            ? { ...it, quantity: Math.min(it.quantity + quantity, 99) }
            : it,
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity,
          notes,
        },
      ];
    });
  };

  const handleChangeQuantity = (productId: string, newQty: number) => {
    setCart((current) =>
      newQty < 1
        ? current.filter((it) => it.id !== productId)
        : current.map((it) => (it.id === productId ? { ...it, quantity: newQty } : it)),
    );
  };

  const getPlainQuantity = (productId: string) =>
    cart.find((it) => it.id === productId && !it.notes)?.quantity ?? 0;

  const setPlainQuantity = (product: PublicMenuProduct, newQty: number) => {
    setCart((current) => {
      const idx = current.findIndex((it) => it.id === product.id && !it.notes);
      if (idx === -1) {
        return newQty > 0 ? [...current, { ...product, quantity: newQty, notes: '' }] : current;
      }
      if (newQty < 1) return current.filter((_, i) => i !== idx);
      return current.map((it, i) => (i === idx ? { ...it, quantity: Math.min(newQty, 99) } : it));
    });
  };

  const handleEditItem = (item: CartItem) => {
    setEditingCartItem(item);
    setCustomizingProduct(item);
    setIsCartDrawerOpen(false);
  };

  // Submit order to API
  const handleSubmitOrder = async (extraNotes?: string) => {
    setSubmitError('');
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setSubmitError('Por favor ingresa un número de teléfono válido.');
      return;
    }
    if (!cart.length) {
      setSubmitError('Tu carrito está vacío.');
      return;
    }

    setIsSubmitting(true);

    try {
      const combinedNotes = [
        orderMode === 'pickup' ? '[Modo: Retiro en Local]' : '[Modo: Delivery]',
        extraNotes || '',
      ].filter(Boolean).join(' ');

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          customerName: cleanName,
          customerPhone: cleanPhone,
          notes: combinedNotes,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
          })),
        }),
      });

      const body = (await response.json()) as {
        message?: string;
        error?: string;
        tracking?: { id: string; tracking_code: string; tracking_token: string };
      };

      setIsSubmitting(false);

      if (!response.ok) {
        setSubmitError(body.error ?? 'No se pudo enviar el pedido. Intenta nuevamente.');
        return;
      }

      saveCustomerInfo(cleanName, cleanPhone);

      if (body.tracking) {
        saveActiveOrder({
          id: body.tracking.id,
          trackingCode: body.tracking.tracking_code,
          trackingToken: body.tracking.tracking_token,
          restaurantSlug,
          restaurantName,
          phone: cleanPhone,
          customerName: cleanName,
          createdAt: new Date().toISOString(),
        });

        clearCart(restaurantSlug);
        setCart([]);
        setIsCheckoutOpen(false);

        router.push(`/pedido/${body.tracking.tracking_token}`);
      }
    } catch {
      setIsSubmitting(false);
      setSubmitError('Error de conexión al procesar el pedido. Revisa tu internet.');
    }
  };

  // Scroll to category
  const scrollToCategory = (catId: string) => {
    setSelectedCategory(catId);
    const element = document.getElementById(catId);
    if (element) {
      const yOffset = -140; // sticky header offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const totalVisibleDishes = useMemo(() => {
    return categorizedProducts.reduce((sum, g) => sum + g.products.length, 0);
  }, [categorizedProducts]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20]">
      {/* 1. TOP HERO COVER BANNER */}
      <section className="relative overflow-hidden bg-[#161A1E] text-white">
        {/* Cover Background Image with gradient overlays */}
        <div className="absolute inset-0">
          <Image
            src="/images/restaurant_ambience.jpg"
            alt={restaurantName}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-35 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161A1E] via-[#161A1E]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#161A1E]/90 via-[#161A1E]/60 to-transparent" />
          <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-[#EAA228]/15 blur-3xl pointer-events-none" />
        </div>

        {/* Top Floating Glass Header */}
        <div className="relative z-20 border-b border-white/10 backdrop-blur-md">
          <div className="page flex h-16 sm:h-20 items-center justify-between">
            {/* Left: Branding & Back link */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#EAA228] text-[#181C20] font-black text-xl shadow-lg ring-2 ring-[#EAA228]/40">
                {restaurantLogo ? (
                  <Image
                    src={restaurantLogo}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span>{restaurantName.charAt(0)}</span>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                    {restaurantName}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Verificado
                  </span>
                </div>
                <span className="text-[12px] text-zinc-400 hidden sm:inline-block">
                  Menú digital interactivo en tiempo real
                </span>
              </div>
            </div>

            {/* Right: Quick actions & Cart */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={`/${restaurantSlug}/reservar`}
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all backdrop-blur-sm"
              >
                <Calendar className="h-3.5 w-3.5 text-[#EAA228]" />
                Reservar mesa
              </Link>
              <Link
                href="/pedido/consultar"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all backdrop-blur-sm"
              >
                <Search className="h-3.5 w-3.5 text-[#EAA228]" />
                Consultar pedido
              </Link>

              {/* Header Cart Button */}
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative flex h-11 items-center gap-2 rounded-full bg-[#EAA228] px-4 font-bold text-[#181C20] hover:bg-[#D99318] active:scale-95 transition-all shadow-[0_4px_20px_rgba(234,162,40,0.3)]"
                aria-label={`Ver pedido, ${totalCartCount} productos`}
              >
                <ShoppingBag className="h-4.5 w-4.5" strokeWidth={2.2} />
                <span className="text-sm font-black hidden xs:inline">
                  {totalCartCount > 0 ? `$${totalCartFormatted}` : 'Mi Pedido'}
                </span>
                {totalCartCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#181C20] px-1.5 text-[11px] font-black text-white">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Hero Content Information */}
        <div className="relative z-10 page pt-8 pb-12 sm:pt-12 sm:pb-16">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs font-bold text-[#EAA228]">
              <Sparkles className="h-3.5 w-3.5" />
              Experiencia Culinaria Artesanal
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Sabores preparados al momento con ingredientes frescos.
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
              Selecciona tus platillos favoritos, personalízalos con instrucciones para la cocina o barra y recibe tu orden directamente en mesa o domicilio.
            </p>

            {/* Badges line */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm font-semibold text-zinc-300">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Cocina abierta ahora
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-[#EAA228]" />
                Tiempo prom: 20 - 30 min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <Star className="h-3.5 w-3.5 fill-[#EAA228] text-[#EAA228]" />
                4.9 (120+ reseñas)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ORDER CONTROLS & ACTIVE ORDER NOTIFICATION */}
      <div className="page -mt-7 relative z-30 space-y-6">
        {/* Active Order Banner if currently ongoing */}
        {activeOrder && (
          <Link
            href={`/pedido/${activeOrder.trackingToken}`}
            className="flex items-center justify-between gap-4 rounded-3xl border-2 border-[#EAA228] bg-white p-4 sm:p-5 shadow-[0_12px_36px_rgba(234,162,40,0.18)] hover:bg-[#FAF7F2] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAA228]/15 text-[#EAA228]">
                <Flame className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase text-[#EAA228]">
                    Pedido Activo
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-base sm:text-lg font-black text-[#181C20]">
                  Tu orden #{activeOrder.trackingCode} se está preparando
                </p>
                <p className="text-xs sm:text-sm text-[#666E7A]">
                  Toca para monitorear el estado en vivo con el KDS de cocina
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-black text-[#181C20] group-hover:translate-x-1 transition-transform">
              <span className="hidden sm:inline">Rastrear orden</span>
              <ArrowRight className="h-5 w-5 text-[#EAA228]" />
            </div>
          </Link>
        )}

        {/* Mode Selector & Search Bar Card */}
        <div className="rounded-3xl border border-[#EAE5DE] bg-white p-4 sm:p-5 shadow-[0_10px_30px_rgba(24,28,32,0.06)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Segmented Mode Selector */}
          <div className="flex items-center gap-2 p-1 bg-[#FAF7F2] border border-[#EAE5DE] rounded-2xl">
            <button
              type="button"
              onClick={() => setOrderMode('pickup')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                orderMode === 'pickup'
                  ? 'bg-[#181C20] text-white shadow-md'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <Store className={`h-4 w-4 ${orderMode === 'pickup' ? 'text-[#EAA228]' : ''}`} />
              Retiro en Local
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('delivery')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                orderMode === 'delivery'
                  ? 'bg-[#181C20] text-white shadow-md'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <Bike className={`h-4 w-4 ${orderMode === 'delivery' ? 'text-[#EAA228]' : ''}`} />
              Delivery
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666E7A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por plato, ingrediente o bebida..."
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE] text-sm font-medium text-[#181C20] placeholder:text-[#666E7A]/70 focus:outline-none focus:border-[#EAA228] focus:ring-2 focus:ring-[#EAA228]/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#666E7A] hover:text-[#181C20]"
                aria-label="Borrar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. STICKY CATEGORIES BAR */}
      {categoryTabs.length > 0 && !searchQuery && (
        <nav
          aria-label="Categorías del menú"
          className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE5DE] py-3.5 transition-all mt-6 shadow-xs"
        >
          <div className="page">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth">
              {categoryTabs.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => scrollToCategory(cat.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#181C20] text-white shadow-sm ring-2 ring-[#EAA228]/60'
                        : 'bg-white border border-[#EAE5DE] text-[#181C20] hover:bg-[#FAF7F2] hover:border-[#181C20]/30'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#EAA228] text-[#181C20]'
                          : 'bg-[#FAF7F2] text-[#666E7A]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* 4. DISHES MENU SECTION */}
      <main className="page space-y-14 py-8 pb-44">
        {searchQuery && (
          <div className="flex items-center justify-between border-b border-[#EAE5DE] pb-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-[#181C20]">
                Resultados para &ldquo;{searchQuery}&rdquo;
              </h2>
              <p className="text-xs text-[#666E7A]">
                {totalVisibleDishes} {totalVisibleDishes === 1 ? 'platillo encontrado' : 'platillos encontrados'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#EAA228] hover:underline"
            >
              Ver menú completo
            </button>
          </div>
        )}

        {categorizedProducts.length === 0 ? (
          <div className="rounded-3xl border border-[#EAE5DE] bg-white p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF7F2] text-[#666E7A]">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-[#181C20]">
              {searchQuery ? 'No encontramos coincidencias' : 'El menú está en actualización'}
            </h3>
            <p className="text-sm text-[#666E7A] max-w-md mx-auto">
              {searchQuery
                ? `No hay platillos que coincidan con "${searchQuery}". Intenta con otro término o explora las categorías.`
                : 'Muy pronto añadiremos las especialidades de la casa.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-primary mt-2"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          categorizedProducts.map((catGroup) => (
            <section
              key={catGroup.id}
              id={catGroup.id}
              className="scroll-mt-28 space-y-6"
            >
              {/* Category Header with aesthetic divider */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAA228]/15 text-[#EAA228]">
                  {catGroup.name.toLowerCase().includes('bebida') || catGroup.name.toLowerCase().includes('coctel') ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <ChefHat className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
                    {catGroup.name}
                  </h2>
                </div>
                <div className="flex-1 border-t border-[#EAE5DE] ml-3" />
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {catGroup.products.map((product) => {
                  const imageUrl = getProductImageUrl(
                    product.name,
                    product.category_name,
                    product.image_url,
                  );
                  const formattedPrice = (product.price_cents / 100).toFixed(2);
                  const isPromo =
                    product.original_price_cents && product.original_price_cents > product.price_cents;
                  const formattedOriginal = isPromo
                    ? ((product.original_price_cents || 0) / 100).toFixed(2)
                    : null;
                  const qty = getPlainQuantity(product.id);

                  return (
                    <article
                      key={product.id}
                      className="group relative flex flex-col sm:flex-row gap-4.5 rounded-[28px] border border-[#EAE5DE] bg-white p-4.5 sm:p-5 shadow-[0_4px_20px_rgba(24,28,32,0.03)] hover:shadow-[0_16px_36px_rgba(234,162,40,0.12)] hover:border-[#EAA228]/60 transition-all duration-300"
                    >
                      {/* Dish Thumbnail */}
                      <button
                        type="button"
                        onClick={() => setCustomizingProduct(product)}
                        className="relative h-44 sm:h-36 sm:w-36 w-full shrink-0 overflow-hidden rounded-[22px] bg-[#FAF7F2] focus:outline-none"
                        aria-label={`Personalizar ${product.name}`}
                      >
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 160px"
                          className="object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent sm:hidden" />

                        {/* Station badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                              product.station === 'barra'
                                ? 'bg-indigo-900/80 text-indigo-100 border border-indigo-400/30'
                                : 'bg-[#181C20]/80 text-[#FAF7F2] border border-white/20'
                            }`}
                          >
                            {product.station === 'barra' ? 'Barra' : 'Cocina'}
                          </span>
                        </div>
                      </button>

                      {/* Dish Details */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setCustomizingProduct(product)}
                            className="text-left text-lg sm:text-[20px] font-black text-[#181C20] leading-snug group-hover:text-[#D99318] transition-colors focus:outline-none"
                          >
                            {product.name}
                          </button>

                          {product.description && (
                            <p className="line-clamp-2 text-xs sm:text-[13.5px] text-[#666E7A] leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Price & Actions Row */}
                        <div className="mt-4 flex items-end justify-between gap-3 pt-2 border-t border-[#FAF7F2]">
                          <div className="flex flex-col">
                            {isPromo && (
                              <span className="text-xs text-[#666E7A] line-through font-semibold">
                                ${formattedOriginal}
                              </span>
                            )}
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl sm:text-2xl font-black text-[#181C20] tracking-tight">
                                ${formattedPrice}
                              </span>
                            </div>
                          </div>

                          {/* Add / Stepper CTA */}
                          {qty === 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPlainQuantity(product, 1)}
                                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#EAA228] px-4 text-xs font-black text-[#181C20] hover:bg-[#D99318] active:scale-95 shadow-[0_4px_12px_rgba(234,162,40,0.25)] transition-all"
                                aria-label={`Agregar ${product.name}`}
                              >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                <span>Agregar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomizingProduct(product)}
                                className="hidden sm:inline-flex h-11 px-3 items-center justify-center rounded-full border border-[#EAE5DE] text-[11px] font-bold text-[#666E7A] hover:bg-[#FAF7F2] hover:text-[#181C20] transition-colors"
                                title="Personalizar con notas especiales"
                              >
                                Notas
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1.5 rounded-full border border-[#EAE5DE] bg-[#FAF7F2] p-1 shadow-xs"
                              role="group"
                              aria-label={`Cantidad de ${product.name}`}
                            >
                              <button
                                type="button"
                                onClick={() => setPlainQuantity(product, qty - 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#181C20] shadow-xs hover:bg-zinc-100 active:scale-90 transition-all"
                                aria-label={`Quitar uno de ${product.name}`}
                              >
                                <Minus className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                              <span
                                className="w-7 text-center text-sm font-black text-[#181C20]"
                                aria-live="polite"
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPlainQuantity(product, qty + 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAA228] text-[#181C20] shadow-xs hover:bg-[#D99318] active:scale-90 transition-all"
                                aria-label={`Agregar otro ${product.name}`}
                              >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* 5. GOURMET FOOTER */}
        <footer className="mt-16 rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#666E7A]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAA228] font-black text-[#181C20]">
              P
            </div>
            <div>
              <p className="font-bold text-[#181C20]">
                {restaurantName} · Menú Digital
              </p>
              <p>Tecnología gastronómica operada con ritmo por Paktak Tech</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-bold text-[#181C20]">
            <Link href="/pedido/consultar" className="hover:text-[#EAA228] transition-colors">
              Consultar estado de pedido
            </Link>
            <span className="text-[#EAE5DE]">•</span>
            <Link href={`/${restaurantSlug}/reservar`} className="hover:text-[#EAA228] transition-colors">
              Reservar una mesa
            </Link>
          </div>
        </footer>
      </main>

      {/* 6. FLOATING BOTTOM CART BAR */}
      {cart.length > 0 && (
        <aside
          aria-label="Resumen de orden flotante"
          className="fixed inset-x-0 bottom-6 z-40 px-4 pointer-events-none"
        >
          <div className="mx-auto max-w-xl pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-full flex items-center justify-between gap-4 rounded-full bg-[#181C20]/95 backdrop-blur-xl border border-white/15 p-3.5 px-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] hover:bg-[#181C20] hover:scale-[1.01] active:scale-[0.99] transition-all group"
            >
              {/* Left side: Icon + Counter + Text */}
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#EAA228] text-[#181C20] shadow-md group-hover:rotate-6 transition-transform">
                  <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-[#181C20] px-1 text-[11px] font-black shadow-xs">
                    {totalCartCount}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black leading-tight text-white">
                    Ver mi pedido ({totalCartCount} {totalCartCount === 1 ? 'ítem' : 'ítems'})
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {orderMode === 'pickup' ? 'Retiro en local' : 'Entrega a domicilio'}
                  </p>
                </div>
              </div>

              {/* Right side: Total Price + CTA Arrow */}
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-[#EAA228]">
                  ${totalCartFormatted}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 group-hover:bg-[#EAA228] group-hover:text-[#181C20] transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* 7. MODALS & DRAWERS */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onCheckout={() => setIsCheckoutOpen(true)}
        cart={cart}
        restaurantName={restaurantName}
        onChangeQuantity={handleChangeQuantity}
        onEditItem={handleEditItem}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        restaurantName={restaurantName}
        customerName={customerName}
        customerPhone={customerPhone}
        onUpdateCustomer={(n, p) => {
          setCustomerName(n);
          setCustomerPhone(p);
        }}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmitting}
        error={submitError}
      />

      <ProductCustomizerModal
        isOpen={!!customizingProduct}
        product={customizingProduct}
        initialNotes={editingCartItem?.notes || ''}
        initialQuantity={editingCartItem?.quantity || 1}
        onClose={() => {
          setCustomizingProduct(null);
          setEditingCartItem(null);
        }}
        onAddToCart={(prod, qty, notes) => {
          handleAddToCart(prod, qty, notes);
          setCustomizingProduct(null);
          setEditingCartItem(null);
        }}
      />
    </div>
  );
}

