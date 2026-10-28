/**
 * Curated high-resolution appetizing food imagery mapper for products.
 * If a product does not have a custom image_url, this utility maps it
 * to a clean, vibrant food photo matching the dish description.
 */

export type FoodPreset = {
  id: string;
  name: string;
  category: 'mariscos' | 'carnes' | 'pollos' | 'hamburguesas' | 'pizzas_pastas' | 'entradas' | 'mexicana' | 'postres' | 'bebidas';
  label: string;
  url: string;
};

export const FOOD_PHOTO_PRESETS: FoodPreset[] = [
  // Mariscos & Pescados
  {
    id: 'ceviche',
    name: 'Ceviche Mixto / Camarón',
    category: 'mariscos',
    label: 'Ceviche Fresco',
    url: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'camarones',
    name: 'Camarones al Ajillo / Apanados',
    category: 'mariscos',
    label: 'Camarones',
    url: 'https://images.unsplash.com/photo-1559742811-82286364ceaf?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pescado',
    name: 'Pescado Frito / Salmón',
    category: 'mariscos',
    label: 'Pescado a la Plancha',
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'sopa_encebollado',
    name: 'Encebollado / Sopa Marinera',
    category: 'mariscos',
    label: 'Sopa & Caldos',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  },

  // Carnes & Parrilla
  {
    id: 'lomo_saltado',
    name: 'Lomo Saltado / Carne Salteada',
    category: 'carnes',
    label: 'Lomo Saltado',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'bife_carne',
    name: 'Bife / Asado a la Parrilla',
    category: 'carnes',
    label: 'Parrillada & Cortes',
    url: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'costillas',
    name: 'Costillas BBQ Glaseadas',
    category: 'carnes',
    label: 'Costillas BBQ',
    url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80',
  },

  // Pollos & Alitas
  {
    id: 'alitas_bbq',
    name: 'Alitas BBQ / Picantes',
    category: 'pollos',
    label: 'Alitas Broaster',
    url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pollo_frito',
    name: 'Pollo Crispy / Broaster',
    category: 'pollos',
    label: 'Pollo Frito',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pollo_plancha',
    name: 'Pechuga a la Plancha',
    category: 'pollos',
    label: 'Pollo Asado',
    url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
  },

  // Hamburguesas & Sandwiches
  {
    id: 'burger_clasica',
    name: 'Hamburguesa Doble Queso',
    category: 'hamburguesas',
    label: 'Burger Clásica',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'smash_burger',
    name: 'Smash Burger Gourmet',
    category: 'hamburguesas',
    label: 'Smash Burger',
    url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'sandwich',
    name: 'Sandwich Artesanal',
    category: 'hamburguesas',
    label: 'Sandwich & Panini',
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  },

  // Pizzas & Pastas
  {
    id: 'pizza_pepperoni',
    name: 'Pizza Pepperoni Artesanal',
    category: 'pizzas_pastas',
    label: 'Pizza Pepperoni',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pizza_quesos',
    name: 'Pizza Cuatro Quesos / Margarita',
    category: 'pizzas_pastas',
    label: 'Pizza Margarita',
    url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pasta_spaghetti',
    name: 'Pasta Bolognese / Carbonara',
    category: 'pizzas_pastas',
    label: 'Pasta Italiana',
    url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'lasagna',
    name: 'Lasagna de Carne Gratinada',
    category: 'pizzas_pastas',
    label: 'Lasagna',
    url: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
  },

  // Entradas & Piqueos
  {
    id: 'tequenos',
    name: 'Tequeños con Guacamole / Salsas',
    category: 'entradas',
    label: 'Tequeños Crujientes',
    url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'papas_fritas',
    name: 'Papas Fritas Rústicas / Cheddar',
    category: 'entradas',
    label: 'Papas Fritas',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'nachos',
    name: 'Nachos Supremos con Queso',
    category: 'mexicana',
    label: 'Nachos & Totopos',
    url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'tacos',
    name: 'Tacos al Pastor / Carne Asada',
    category: 'mexicana',
    label: 'Tacos Mexicanos',
    url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'empanadas',
    name: 'Empanadas Doradas',
    category: 'entradas',
    label: 'Empanadas',
    url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'ensalada_cesar',
    name: 'Ensalada César / Bowl',
    category: 'entradas',
    label: 'Ensalada César',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  },

  // Postres & Dulces
  {
    id: 'cheesecake',
    name: 'Cheesecake de Frutos Rojos',
    category: 'postres',
    label: 'Cheesecake',
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'torta_chocolate',
    name: 'Torta de Chocolate Húmeda',
    category: 'postres',
    label: 'Torta de Chocolate',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'helado',
    name: 'Helado Artesanal / Sundae',
    category: 'postres',
    label: 'Helado Artesanal',
    url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'pancakes',
    name: 'Pancakes / Waffles con Miel',
    category: 'postres',
    label: 'Pancakes & Waffles',
    url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80',
  },

  // Bebidas, Cocteles & Cafés
  {
    id: 'coctel_mojito',
    name: 'Mojito / Cóctel Frutal',
    category: 'bebidas',
    label: 'Cóctel Tropical',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cerveza',
    name: 'Cerveza Helada / Artesanal',
    category: 'bebidas',
    label: 'Cerveza',
    url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'jugo_natural',
    name: 'Jugo Natural / Limonada Frappé',
    category: 'bebidas',
    label: 'Jugo & Limonada',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cafe_espresso',
    name: 'Café Cappuccino / Americano',
    category: 'bebidas',
    label: 'Café de Especialidad',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'gaseosa',
    name: 'Gaseosa / Refresco con Hielo',
    category: 'bebidas',
    label: 'Gaseosa / Refresco',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  },
];

const keywordMap: Record<string, string> = {
  // Mariscos y Ecuatoriana
  ceviche: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=600&q=80',
  camaron: 'https://images.unsplash.com/photo-1559742811-82286364ceaf?auto=format&fit=crop&w=600&q=80',
  pescado: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
  marisco: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=600&q=80',
  encebollado: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  sopa: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  caldo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  pulpo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',

  // Entradas & Piqueos
  tequeñ: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
  guacamole: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
  papa: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  patacon: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
  empanada: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80',
  nacho: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
  taco: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
  burrito: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
  quesadilla: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',

  // Carnes
  lomo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  carne: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  bife: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  asado: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
  costilla: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80',
  parrilla: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',

  // Pollos
  alita: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
  pollo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
  pechuga: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
  broaster: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
  nugget: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',

  // Hamburguesas & Sandwiches
  hamburguesa: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  burger: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  smash: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',

  // Pizzas & Pastas
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  spaghetti: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  lasagna: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80',
  fettuccine: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  ravioli: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',

  // Sushi & Asiático
  sushi: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
  roll: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  chaufa: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
  arroz: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',

  // Ensaladas
  ensalada: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  cesar: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',

  // Postres
  postre: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  torta: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  cheesecake: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
  pancake: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80',
  waffle: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80',
  helado: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80',
  chocolate: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',

  // Bebidas & Cocteles
  bebida: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  coctel: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  mojito: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  cerveza: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
  vino: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
  jugo: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  limonada: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
  gaseosa: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  refresco: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  cafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  capuchino: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  cappuccino: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  agua: 'https://images.unsplash.com/photo-1559839914-ba2ac52496a7?auto=format&fit=crop&w=600&q=80',
};

const fallbackFood = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';

export function getProductImageUrl(name: string, categoryName?: string | null, customUrl?: string | null): string {
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl;
  }

  const query = `${name.toLowerCase()} ${(categoryName || '').toLowerCase()}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remover tildes para búsqueda precisa

  for (const [key, url] of Object.entries(keywordMap)) {
    const cleanKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (query.includes(cleanKey)) {
      return url;
    }
  }

  return fallbackFood;
}
