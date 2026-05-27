import React from 'react';

const MapWidget = () => {
    return (
        <div className="map-widget">
            <iframe 
                title="World Map"
                className="map-iframe"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-124.7,24.9,-66.9,49.3&layer=mapnik"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
            ></iframe>
        </div>
    );
};

export default MapWidget;
