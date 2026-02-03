import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Category } from '../types';
import { getCategoryIcon } from '../utils/getCategoryIcon';

interface SubmenuProps {
  subCategories: Category[];
  activeSubCategory: string;
  onSubCategoryClick: (categoryId: string) => void;
  isOpen: boolean;
}

const Submenu: React.FC<SubmenuProps> = ({ subCategories, activeSubCategory, onSubCategoryClick, isOpen }) => {
  return (
    <div className={`submenu-panel ${isOpen && subCategories.length > 0 ? 'open' : ''}`}>
      {subCategories.map(subCategory => (
        <div
          key={subCategory.id}
          className={`submenu-item ${activeSubCategory === subCategory.id ? 'active' : ''}`}
          onClick={() => onSubCategoryClick(subCategory.id)}
        >
          <FontAwesomeIcon icon={getCategoryIcon(subCategory.name)} />
          <span>{subCategory.name}</span>
        </div>
      ))}
    </div>
  );
};

export default Submenu;
