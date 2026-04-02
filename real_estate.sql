CREATE DATABASE real_estate_portal;




CREATE TABLE agents (
    agent_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    email           VARCHAR(180) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    license_number  VARCHAR(50)  NOT NULL,
    agency_name     VARCHAR(150) NULL,

    CONSTRAINT pk_agents PRIMARY KEY (agent_id),
    CONSTRAINT uq_agent_email UNIQUE (email),
    CONSTRAINT uq_agent_license UNIQUE (license_number)
);

CREATE TABLE amenities (
    amenity_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    amenity_name       VARCHAR(100) NOT NULL,
    amenity_category   VARCHAR(60)  NULL,

    CONSTRAINT pk_amenities PRIMARY KEY (amenity_id),
    CONSTRAINT uq_amenity_name UNIQUE (amenity_name)
);

CREATE TABLE properties (
    property_id     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    agent_id        INT UNSIGNED    NOT NULL,
    title           VARCHAR(150)    NOT NULL,
    property_type   ENUM(
                        'House',
                        'Condo',
                        'Lot',
                        'Apartment',
                        'Townhouse',
                        'Commercial'
                    )               NOT NULL DEFAULT 'House',
    price           DECIMAL(15,2)   NOT NULL,
    bedrooms        TINYINT UNSIGNED NULL DEFAULT 0,
    bathrooms       TINYINT UNSIGNED NULL DEFAULT 0,
    address_line    VARCHAR(255)    NOT NULL,
    city            VARCHAR(100)    NOT NULL,
    province        VARCHAR(100)    NOT NULL,
    status          ENUM(
                        'Available',
                        'Sold',
                        'Rented',
                        'Inactive'
                    )               NOT NULL DEFAULT 'Available',

    CONSTRAINT pk_properties PRIMARY KEY (property_id),
    CONSTRAINT fk_property_agent FOREIGN KEY (agent_id)
        REFERENCES agents(agent_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_price_positive CHECK (price > 0)
);

CREATE TABLE property_amenities (
    property_id INT UNSIGNED NOT NULL,
    amenity_id  INT UNSIGNED NOT NULL,

    CONSTRAINT pk_property_amenities PRIMARY KEY (property_id, amenity_id),
    CONSTRAINT fk_pa_property FOREIGN KEY (property_id)
        REFERENCES properties(property_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_pa_amenity FOREIGN KEY (amenity_id)
        REFERENCES amenities(amenity_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE inquiries (
    inquiry_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id   INT UNSIGNED NOT NULL,
    buyer_name    VARCHAR(120) NOT NULL,
    buyer_email   VARCHAR(180) NOT NULL,
    buyer_phone   VARCHAR(20)  NULL,
    message       TEXT         NOT NULL,
    status        ENUM(
                    'New',
                    'Read',
                    'Responded',
                    'Closed'
                  )            NOT NULL DEFAULT 'New',

    CONSTRAINT pk_inquiries PRIMARY KEY (inquiry_id),
    CONSTRAINT fk_inquiry_property FOREIGN KEY (property_id)
        REFERENCES properties(property_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_properties_agent_id ON properties (agent_id);
CREATE INDEX idx_properties_city ON properties (city);
CREATE INDEX idx_properties_status ON properties (status);
CREATE INDEX idx_properties_price ON properties (price);
CREATE INDEX idx_inquiries_property_id ON inquiries (property_id);
CREATE INDEX idx_inquiries_status ON inquiries (status);
CREATE INDEX idx_amenities_category ON amenities (amenity_category);
CREATE INDEX idx_pa_amenity_id ON property_amenities (amenity_id);

SELECT 'agents' AS table_name, COUNT(*) AS row_count FROM agents
UNION ALL
SELECT 'amenities', COUNT(*) FROM amenities
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'property_amenities', COUNT(*) FROM property_amenities
UNION ALL
SELECT 'inquiries', COUNT(*) FROM inquiries;

SELECT
    p.property_id,
    p.title,
    p.property_type,
    p.price,
    p.city,
    CONCAT(a.first_name, ' ', a.last_name) AS agent_name,
    COUNT(pa.amenity_id) AS total_amenities,
    p.status
FROM properties p
INNER JOIN agents a ON p.agent_id = a.agent_id
LEFT JOIN property_amenities pa ON p.property_id = pa.property_id
WHERE p.status = 'Available'
GROUP BY p.property_id, p.title, p.property_type, p.price, p.city, agent_name, p.status
ORDER BY p.price ASC;

SELECT
    p.title AS property_title,
    am.amenity_name,
    am.amenity_category
FROM properties p
INNER JOIN property_amenities pa ON p.property_id = pa.property_id
INNER JOIN amenities am ON pa.amenity_id = am.amenity_id
WHERE p.property_id = 2
ORDER BY am.amenity_category, am.amenity_name;
