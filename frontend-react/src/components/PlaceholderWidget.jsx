import React from 'react';

const PlaceholderWidget = ({ title, className, icon: Icon, children }) => {
    return (
        <div className={`system-widget placeholder-widget ${className}`}>
            <h3 className="placeholder-title">{title}</h3>
            <div className="placeholder-content">
                {children ? children : (
                    Icon ? (
                        <Icon size={56} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    ) : (
                        <span className="placeholder-text">Content Pending...</span>
                    )
                )}
            </div>
        </div>
    );
};

export default PlaceholderWidget;
