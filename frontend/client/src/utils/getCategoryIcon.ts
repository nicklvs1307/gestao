import { faFire, faHamburger, faUtensils, faDrumstickBite, faIceCream, faCocktail, faGlassMartini, faPizzaSlice, faFish, faSeedling, faMugSaucer } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export const getCategoryIcon = (categoryName: string): IconDefinition => {
  switch (categoryName.toLowerCase()) {
    case 'destaques':
      return faFire;
    case 'lanches':
    case 'hambúrgueres':
      return faHamburger;
    case 'pratos':
    case 'pratos principais':
      return faUtensils;
    case 'porções':
      return faDrumstickBite;
    case 'sobremesas':
      return faIceCream;
    case 'bebidas':
      return faCocktail;
    case 'sucos':
      return faGlassMartini;
    case 'pizzas':
        return faPizzaSlice;
    case 'peixes':
        return faFish;
    case 'saladas':
        return faSeedling;
    case 'cafés':
        return faMugSaucer;
    default:
      return faUtensils;
  }
};
