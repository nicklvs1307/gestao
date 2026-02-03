import React from 'react';
import type { Category } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { getCategoryIcon } from '../utils/getCategoryIcon';

interface SidebarProps {
  logoUrl?: string | null;
  menuItems: Category[];
  activeParentCategory: string;
  onCategoryClick: (category: Category) => void;
}

import { Link, useParams } from 'react-router-dom';

const Sidebar: React.FC<SidebarProps> = ({ logoUrl, menuItems, activeParentCategory, onCategoryClick }) => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  const menuItemsWithFeatured = [
    { id: 'destaques', name: 'Destaques', subCategories: [] } as Category,
    ...menuItems,
  ];

  const handleParentClick = (item: Category) => {
    onCategoryClick(item);
  };

  return (
    <div className="sidebar">
      <div className="logo">
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="sidebar-logo" />
        )}
      </div>
      <div className="menu-items">

        {menuItemsWithFeatured.map(item => (
          <React.Fragment key={item.id}>
            <div
              className={`menu-item ${activeParentCategory === item.id ? 'active' : ''}`}
              onClick={() => handleParentClick(item)}
            >
              <FontAwesomeIcon icon={getCategoryIcon(item.name)} />
              <span>{item.name}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;

