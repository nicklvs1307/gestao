import React from 'react';
import './style.css';

interface HeaderProps {
    restaurantName: string;
}

const Header: React.FC<HeaderProps> = ({ restaurantName }) => {
    return (
        <header className="header">
            <div className="header-container">
                <div className="logo">
                    <i className="fas fa-utensils"></i>
                    {restaurantName}
                </div>
                <div className="user-actions">
                    <a href="#"><i className="fas fa-search"></i></a>
                    <a href="#"><i className="fas fa-user"></i></a>
                </div>
            </div>
        </header>
    );
};

export default Header;
