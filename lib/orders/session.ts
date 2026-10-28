export type StoredActiveOrder = {
  id?: string;
  trackingCode: string;
  trackingToken: string;
  phone: string;
  customerName: string;
  restaurantSlug: string;
  restaurantName?: string;
  totalCents?: number;
  status?: string;
  createdAt?: string;
};

export type SavedCustomerInfo = {
  name: string;
  phone: string;
};

const ACTIVE_ORDER_KEY = 'paktak:active-order';
const CUSTOMER_INFO_KEY = 'paktak:customer-info';
const CART_PREFIX = 'paktak:cart:';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getActiveOrder(): StoredActiveOrder | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredActiveOrder;
  } catch {
    return null;
  }
}

export function saveActiveOrder(order: StoredActiveOrder): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

export function clearActiveOrder(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ACTIVE_ORDER_KEY);
  } catch {
    // Ignore
  }
}

export function getSavedCustomerInfo(): SavedCustomerInfo | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_INFO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCustomerInfo;
  } catch {
    return null;
  }
}

export function saveCustomerInfo(name: string, phone: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }));
  } catch {
    // Ignore
  }
}

export function getSavedCart<T>(restaurantSlug: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(`${CART_PREFIX}${restaurantSlug}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart<T>(restaurantSlug: string, cart: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(`${CART_PREFIX}${restaurantSlug}`, JSON.stringify(cart));
  } catch {
    // Ignore
  }
}

export function clearCart(restaurantSlug: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(`${CART_PREFIX}${restaurantSlug}`);
  } catch {
    // Ignore
  }
}
