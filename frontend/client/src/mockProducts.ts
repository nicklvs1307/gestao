import type { Product } from './types';

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Picanha Grelhada',
    description: 'Corte nobre de picanha grelhada na brasa, servida com farofa, vinagrete e batata frita.',
    price: 69.90,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
    category: 'pratos',
    isFeatured: true,
    isAvailable: true,
    stock: 20,
    tags: ['Carne', 'Grelhado'],
    sizes: [
      { id: 'size-p', name: 'Pequena (300g)', price: 55.00 },
      { id: 'size-m', name: 'Média (500g)', price: 69.90 },
      { id: 'size-g', name: 'Grande (700g)', price: 89.90 },
    ],
    addons: [
      {
        id: 'addon-cat-1',
        name: 'Molhos',
        type: 'single',
        options: [
          { id: 'molho-chimichurri', name: 'Chimichurri', price: 5.00 },
          { id: 'molho-barbecue', name: 'Barbecue', price: 4.00 },
        ]
      },
      {
        id: 'addon-cat-2',
        name: 'Acompanhamentos Extras',
        type: 'multiple',
        options: [
          { id: 'extra-farofa', name: 'Farofa', price: 7.00 },
          { id: 'extra-vinagrete', name: 'Vinagrete', price: 6.00 },
          { id: 'extra-queijo', name: 'Queijo Coalho', price: 12.00 },
        ]
      },
    ]
  },
  {
    id: 'prod-2',
    name: 'Hambúrguer Artesanal',
    description: 'Pão brioche, blend de costela 180g, queijo cheddar, bacon e molho especial da casa.',
    price: 32.90,
    imageUrl: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
    category: 'lanches',
    isFeatured: true,
    isAvailable: true,
    stock: 50,
    tags: ['Artesanal', 'Bacon'],
    sizes: [],
    addons: [
      {
        id: 'addon-cat-3',
        name: 'Adicionais de Hambúrguer',
        type: 'multiple',
        options: [
          { id: 'add-bacon', name: 'Bacon Extra', price: 6.00 },
          { id: 'add-cheddar', name: 'Cheddar Extra', price: 5.00 },
          { id: 'add-ovo', name: 'Ovo', price: 4.00 },
        ]
      },
    ]
  },
  {
    id: 'prod-3',
    name: 'Porção de Batata',
    description: 'Batata frita crocante com cheddar e bacon, servida com molho especial da casa.',
    price: 24.90,
    imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
    category: 'porcoes',
    isFeatured: true,
    isAvailable: false,
    stock: 0,
    tags: ['Fritura', 'Bacon'],
    sizes: [
      { id: 'size-p', name: 'Pequena', price: 18.00 },
      { id: 'size-m', name: 'Média', price: 24.90 },
      { id: 'size-g', name: 'Grande', price: 32.00 },
    ],
    addons: [
      {
        id: 'addon-cat-4',
        name: 'Molhos',
        type: 'single',
        options: [
          { id: 'molho-verde', name: 'Molho Verde', price: 3.00 },
          { id: 'molho-rose', name: 'Molho Rosé', price: 3.00 },
        ]
      },
    ]
  },
  {
    id: 'prod-4',
    name: 'Brownie com Sorvete',
    description: 'Brownie de chocolate quente com sorvete de creme e calda de chocolate belga.',
    price: 19.90,
    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
    category: 'sobremesas',
    isFeatured: true,
    isAvailable: true,
    stock: 15,
    tags: ['Doce', 'Sobremesa'],
    sizes: [],
    addons: [
      {
        id: 'addon-cat-5',
        name: 'Adicionais de Sobremesa',
        type: 'multiple',
        options: [
          { id: 'add-chantilly', name: 'Chantilly', price: 4.00 },
          { id: 'add-granulado', name: 'Granulado', price: 2.00 },
        ]
      },
    ]
  },
];