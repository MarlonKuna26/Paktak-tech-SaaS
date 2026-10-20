'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

  // UI state matching mockups
  const [orderMode, setOrderMode] = useState<'delivery' | 'pickup'>('pickup');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<PublicMenuProduct | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Group products by category
  const categorizedProducts = useMemo(() => {
    // If we have categories from DB
    if (categories.length > 0) {
      return categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        products: products.filter((p) => p.category_id === cat.id),
      })).filter((group) => group.products.length > 0);
    }

    // Fallback: derive categories from products
    const map = new Map<string, PublicMenuProduct[]>();
    for (const p of products) {
      const catName = p.category_name || 'Menú Principal';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    }

    return Array.from(map.entries()).map(([name, prods], idx) => ({
      id: `cat-${idx}`,
      name,
      products: prods,
    }));
  }, [categories, products]);

  // All category names for sticky tabs
  const categoryTabs = useMemo(() => {
    return categorizedProducts.map((c) => ({
      id: c.id,
      name: c.name.toUpperCase(),
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
      const yOffset = -120; // header + sticky bar offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 ${isDarkMode ? 'dark' : ''}`}>
      {/* 1. Header matching Image 1 */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/70 dark:border-zinc-800 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop Brand Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/pedido/consultar"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
              >
                Mis Pedidos
              </Link>
            </div>
          </div>

          {/* Center: Restaurant Circular Logo Badge */}
          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center w-14 h-14 -my-2 rounded-full bg-white dark:bg-zinc-800 border-2 border-[#f3a806] shadow-sm overflow-hidden p-1">
              {restaurantLogo ? (
                <Image
                  src={restaurantLogo}
                  alt={restaurantName}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center leading-none text-center">
                  <span className="text-[9px] font-black tracking-tighter text-amber-500 uppercase">
                    {restaurantName.slice(0, 10)}
                  </span>
                  <span className="text-[7px] font-bold text-zinc-600 dark:text-zinc-400">
                    SaaS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  alert(`Restaurante: ${restaurantName}\nSistema de Pedidos Oficial por Paktak Tech`);
                }}
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
              >
                Cuenta
              </button>

              <button
                type="button"
                onClick={() => {
                  if (categorizedProducts.length > 0) {
                    scrollToCategory(categorizedProducts[0].id);
                  }
                }}
                className="h-9 px-4 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs tracking-wide shadow-xs transition-all active:scale-95"
              >
                Ordena aquí
              </button>
            </div>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Cambiar tema"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Cart Icon with Counter Badge */}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 rounded-full text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Ver carrito"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#f3a806] text-[10px] font-black text-zinc-950 shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 space-y-2">
            <Link
              href="/pedido/consultar"
              className="block py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Mis Pedidos
            </Link>
            <Link
              href={`/${restaurantSlug}/reservar`}
              className="block py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Reservar Mesa
            </Link>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>{restaurantName}</span>
              <span className="text-[10px] uppercase font-bold text-amber-500">Paktak Tech</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Active Order Notice if customer has an ongoing order */}
        {activeOrder && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🛵</span>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  Tienes un pedido activo #{activeOrder.trackingCode}
                </p>
                <p className="text-[11px] text-zinc-500">Haz clic para ver el estado de preparación en tiempo real.</p>
              </div>
            </div>
            <Link
              href={`/pedido/${activeOrder.trackingToken}`}
              className="rounded-full bg-[#f3a806] hover:bg-[#e09804] px-3.5 py-1.5 font-bold text-zinc-950 shadow-xs text-[11px]"
            >
              Rastrear
            </Link>
          </div>
        )}

        {/* 2. Restaurant Status Banner matching Image 1 */}
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              {restaurantName}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="rounded-full bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 tracking-wider">
                Cerrado
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Puedes Programar tu pedido
              </span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                Disponible Hoy 11:05
              </span>
            </div>
          </div>

          {/* Segmented Toggle & Branch Selector matching Image 1 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* [ Delivery | Pickup ] */}
            <div className="inline-flex rounded-full bg-zinc-200/80 dark:bg-zinc-800 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setOrderMode('delivery')}
                className={`rounded-full px-4 py-1 text-xs font-bold transition-all ${
                  orderMode === 'delivery'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('pickup')}
                className={`rounded-full px-4 py-1 text-xs font-bold transition-all ${
                  orderMode === 'pickup'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Pickup
              </button>
            </div>

            {/* Branch dropdown matching Image 1 */}
            <div className="relative">
              <select
                aria-label="Seleccionar sucursal"
                className="h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 pr-8 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs appearance-none focus:outline-hidden"
              >
                <option>Cambiar de sucursal</option>
                <option>Sucursal Principal - Tungurahua</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] text-zinc-400">
                ▼
              </span>
            </div>
          </div>
        </section>

        {/* 3. Sticky Category Tab Bar matching Image 4 */}
        <section className="sticky top-16 z-30 -mx-4 px-4 bg-[#f8f9fa]/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2.5 scroll-smooth">
            {categoryTabs.map((cat) => {
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`whitespace-nowrap pb-2 text-xs font-extrabold uppercase tracking-wide transition-all ${
                    isActive
                      ? 'border-b-2 border-[#f3a806] text-[#d97706] dark:text-[#f59e0b]'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </nav>
        </section>

        {/* 4. Categorized Product Grid matching Image 1 & 4 */}
        <div className="space-y-10 pb-28">
          {categorizedProducts.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-sm font-semibold">El menú se está actualizando.</p>
              <p className="text-xs mt-1">Pronto estarán disponibles los platos de hoy.</p>
            </div>
          ) : (
            categorizedProducts.map((catGroup) => (
              <section key={catGroup.id} id={catGroup.id} className="space-y-4 scroll-mt-32">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {catGroup.name}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catGroup.products.map((product) => {
                    const imageUrl = getProductImageUrl(
                      product.name,
                      product.category_name,
                      product.image_url,
                    );
                    const formattedPrice = (product.price_cents / 100).toFixed(2);
                    const isPromo = product.original_price_cents && product.original_price_cents > product.price_cents;
                    const formattedOriginal = isPromo ? ((product.original_price_cents || 0) / 100).toFixed(2) : null;

                    return (
                      <div
                        key={product.id}
                        className="group relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5 hover:border-amber-500/40"
                      >
                        {/* Thumbnail */}
                        <div
                          onClick={() => setCustomizingProduct(product)}
                          className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                        >
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            sizes="96px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => setCustomizingProduct(product)}
                            className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug cursor-pointer group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate"
                          >
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-tight">
                              {product.description}
                            </p>
                          )}

                          {/* Price & Add button row */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1.5">
                              {isPromo && (
                                <span className="text-xs text-zinc-400 line-through font-semibold">
                                  ${formattedOriginal}
                                </span>
                              )}
                              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                ${formattedPrice}
                              </span>
                            </div>

                            {/* Golden round plus button matching Image 1 & 4 */}
                            <button
                              type="button"
                              onClick={() => setCustomizingProduct(product)}
                              className="w-8 h-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold flex items-center justify-center transition-transform active:scale-90 shadow-xs"
                              aria-label={`Agregar ${product.name}`}
                            >
                              <span className="text-base leading-none">+</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {/* 5. Floating Bottom Cart Bar matching Image 1 & 4 */}
      {cart.length > 0 && (
        <aside aria-label="Resumen de pedido" className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] py-3 px-4 sm:px-8 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {totalCartCount} {totalCartCount === 1 ? 'producto' : 'productos'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                ${totalCartFormatted}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="h-12 px-8 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center gap-2"
            >
              <span>Ver mi pedido</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onCheckout={() => setIsCheckoutOpen(true)}
        cart={cart}
        restaurantName={restaurantName}
        onChangeQuantity={handleChangeQuantity}
        onEditItem={handleEditItem}
      />

      {/* Checkout Modal */}
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

      {/* Product Customizer Modal */}
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
