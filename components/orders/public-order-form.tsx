'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
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
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<PublicMenuProduct | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

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
      name: c.name,
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

  // Stepper en la tarjeta: solo actúa sobre la línea sin notas del producto,
  // para no alterar ítems que el cliente personalizó desde el detalle.
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
      const yOffset = -150; // header + sticky bar offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-ink selection:bg-brand selection:text-ink">
      {/* Header: logo a la izquierda, carrito a la derecha */}
      <header className="sticky top-0 z-40 h-16 border-b border-line bg-[#FAF7F2]/90 backdrop-blur-md sm:h-[72px]">
        <div className="page flex h-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {restaurantLogo ? (
              <Image
                src={restaurantLogo}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate text-xl font-extrabold">{restaurantName}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="btn-icon relative"
            aria-label={`Ver pedido, ${totalCartCount} ${totalCartCount === 1 ? 'producto' : 'productos'}`}
          >
            <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />
            {totalCartCount > 0 && (
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[12px] font-extrabold text-white">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="page space-y-12 pb-40 pt-8 sm:pt-12">
        {/* Pedido en curso */}
        {activeOrder && (
          <Link
            href={`/pedido/${activeOrder.trackingToken}`}
            className="card flex items-center justify-between gap-4 p-5 transition-colors duration-150 hover:bg-surface"
          >
            <div>
              <p className="text-lg font-extrabold">Tu pedido #{activeOrder.trackingCode} está en curso</p>
              <p className="text-secondary mt-1">Toca para ver cómo va</p>
            </div>
            <span className="text-base font-bold underline underline-offset-4">Ver estado</span>
          </Link>
        )}

        {/* Título + modo de pedido */}
        <section className="space-y-6">
          <h1 className="h-page">Haz tu pedido</h1>

          <div role="radiogroup" aria-label="Cómo quieres recibir tu pedido" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={orderMode === 'pickup'}
              onClick={() => setOrderMode('pickup')}
              className={`pill ${orderMode === 'pickup' ? 'pill-active' : ''}`}
            >
              Retiro en local
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={orderMode === 'delivery'}
              onClick={() => setOrderMode('delivery')}
              className={`pill ${orderMode === 'delivery' ? 'pill-active' : ''}`}
            >
              Delivery
            </button>
          </div>
        </section>

        {/* Categorías */}
        {categoryTabs.length > 1 && (
          <nav
            aria-label="Categorías del menú"
            className="sticky top-16 z-30 -mx-4 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-line px-4 py-3 sm:top-[72px] sm:-mx-8 sm:px-8"
          >
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {categoryTabs.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  aria-current={selectedCategory === cat.id ? 'true' : undefined}
                  className={`pill ${selectedCategory === cat.id ? 'pill-active' : ''}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Productos */}
        {categorizedProducts.length === 0 ? (
          <p className="py-16 text-center text-lg text-muted-ink">
            El menú todavía no tiene platos disponibles.
          </p>
        ) : (
          categorizedProducts.map((catGroup) => (
            <section key={catGroup.id} id={catGroup.id} className="scroll-mt-40 space-y-6">
              <h2 className="h-section">{catGroup.name}</h2>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    <article key={product.id} className="card flex gap-4 p-4 sm:gap-5">
                      <button
                        type="button"
                        onClick={() => setCustomizingProduct(product)}
                        className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[20px] bg-surface sm:h-32 sm:w-32"
                        aria-label={`Ver detalle de ${product.name}`}
                      >
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </button>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <button
                          type="button"
                          onClick={() => setCustomizingProduct(product)}
                          className="text-left text-[20px] font-extrabold leading-tight sm:text-[22px]"
                        >
                          {product.name}
                        </button>

                        {product.description && (
                          <p className="mt-1 line-clamp-2 text-[15px] text-muted-ink">
                            {product.description}
                          </p>
                        )}

                        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <div className="flex flex-col">
                            {isPromo && (
                              <span className="text-[15px] text-muted-ink line-through">
                                ${formattedOriginal}
                              </span>
                            )}
                            <span className="text-[22px] font-extrabold leading-none">
                              ${formattedPrice}
                            </span>
                          </div>

                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => setPlainQuantity(product, 1)}
                              className="btn-add"
                              aria-label={`Agregar ${product.name}`}
                            >
                              <Plus className="h-6 w-6" strokeWidth={2} />
                            </button>
                          ) : (
                            <div
                              className="flex items-center rounded-full border border-line"
                              role="group"
                              aria-label={`Cantidad de ${product.name}`}
                            >
                              <button
                                type="button"
                                onClick={() => setPlainQuantity(product, qty - 1)}
                                className="btn-icon"
                                aria-label={`Quitar uno de ${product.name}`}
                              >
                                <Minus className="h-5 w-5" strokeWidth={2} />
                              </button>
                              <span className="w-6 text-center text-lg font-extrabold" aria-live="polite">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPlainQuantity(product, qty + 1)}
                                className="btn-icon"
                                aria-label={`Agregar otro ${product.name}`}
                              >
                                <Plus className="h-5 w-5" strokeWidth={2} />
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

        <footer className="flex flex-wrap gap-6 border-t border-line pt-8 text-[15px] text-muted-ink">
          <Link href="/pedido/consultar" className="hover:text-ink">Consultar un pedido</Link>
          <Link href={`/${restaurantSlug}/reservar`} className="hover:text-ink">Reservar mesa</Link>
        </footer>
      </main>

      {/* Acción principal: ver pedido */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#FAF7F2]/90 backdrop-blur-md py-4">
          <div className="page">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="btn-primary w-full justify-between sm:ml-auto sm:flex sm:w-[400px] shadow-lg"
            >
              <span>Ver pedido · {totalCartCount}</span>
              <span className="font-extrabold">${totalCartFormatted}</span>
            </button>
          </div>
        </div>
      )}

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
