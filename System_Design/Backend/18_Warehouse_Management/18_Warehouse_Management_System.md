# Warehouse Management System: Complete Design

## Problem Statement

**Context**: Design a warehouse management system (WMS) for e-commerce/logistics companies to manage inventory, track stock movements, optimize picking/packing, and handle order fulfillment.

**Requirements**:
- Real-time inventory tracking
- Barcode/RFID scanning
- Order picking optimization
- Warehouse layout management
- Stock replenishment
- Multi-warehouse support
- Returns processing
- Analytics and reporting
- Mobile app for warehouse workers
- Integration with ERP/OMS
- Scale to 100K+ SKUs, 1M+ orders/month

**Constraints**:
- Real-time stock updates (< 1 second)
- Picking route optimization (< 2 seconds)
- 99.9% inventory accuracy
- Support concurrent operations (100+ workers)
- Audit trail for all movements

---

## Solution Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WorkerApp[Worker Mobile App<br/>Barcode Scanner]
        ManagerWeb[Manager Dashboard]
        AdminWeb[Admin Portal]
    end
    
    subgraph "API Gateway"
        Gateway[Load Balancer<br/>NGINX]
        Auth[Auth Service<br/>JWT]
    end
    
    subgraph "Core Services"
        Inventory[Inventory Service]
        Order[Order Service]
        Picking[Picking Service]
        Packing[Packing Service]
        Receiving[Receiving Service]
        Location[Location Service]
    end
    
    subgraph "Optimization"
        PickOptimizer[Pick Path Optimizer]
        SlottingEngine[Slotting Engine<br/>ABC Analysis]
        Replenishment[Replenishment Service]
    end
    
    subgraph "Data Layer"
        InventoryDB[(Inventory DB<br/>PostgreSQL)]
        OrderDB[(Order DB<br/>PostgreSQL)]
        LocationDB[(Location DB<br/>PostgreSQL)]
        AuditDB[(Audit Trail<br/>Cassandra)]
        Cache[(Redis Cache)]
    end
    
    subgraph "Integration"
        Queue[Message Queue<br/>RabbitMQ]
        ERP[ERP Integration]
        OMS[OMS Integration]
        WCS[WCS Integration<br/>Conveyor Systems]
    end
    
    subgraph "Analytics"
        Analytics[Analytics Service]
        Reporting[Reporting Service]
        ML[ML Models<br/>Demand Forecasting]
    end
    
    WorkerApp --> Gateway
    ManagerWeb --> Gateway
    AdminWeb --> Gateway
    
    Gateway --> Auth
    Auth --> Inventory
    Auth --> Order
    Auth --> Picking
    Auth --> Packing
    Auth --> Receiving
    
    Inventory --> InventoryDB
    Order --> OrderDB
    Picking --> PickOptimizer
    Location --> LocationDB
    
    Inventory --> Queue
    Queue --> Replenishment
    Queue --> Analytics
    
    Picking --> Cache
    Inventory --> Cache
    
    Order --> OMS
    Receiving --> ERP
    Packing --> WCS
    
    Analytics --> ML
    ML --> SlottingEngine
```

---

## Core Components

### 1. Inventory Service

```javascript
const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');

class InventoryService {
    constructor() {
        this.db = new Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new Redis();
    }
    
    // Get real-time inventory for SKU
    async getInventory(sku, warehouseId) {
        const cacheKey = `inventory:${warehouseId}:${sku}`;
        
        // Check cache first
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        
        // Query database
        const result = await this.db.query(`
            SELECT 
                i.sku,
                i.warehouse_id,
                i.quantity_on_hand,
                i.quantity_allocated,
                i.quantity_available,
                i.quantity_in_transit,
                i.reorder_point,
                i.reorder_quantity,
                p.product_name,
                p.category,
                p.unit_cost
            FROM inventory i
            JOIN products p ON i.sku = p.sku
            WHERE i.sku = $1 AND i.warehouse_id = $2
        `, [sku, warehouseId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const inventory = result.rows[0];
        
        // Cache for 30 seconds
        await this.redis.setex(cacheKey, 30, JSON.stringify(inventory));
        
        return inventory;
    }
    
    // Allocate inventory for order
    async allocateInventory(orderId, items, warehouseId) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            const allocations = [];
            
            for (const item of items) {
                const { sku, quantity } = item;
                
                // Check available quantity
                const result = await client.query(`
                    SELECT quantity_available
                    FROM inventory
                    WHERE sku = $1 AND warehouse_id = $2
                    FOR UPDATE
                `, [sku, warehouseId]);
                
                if (result.rows.length === 0) {
                    throw new Error(`SKU ${sku} not found in warehouse ${warehouseId}`);
                }
                
                const available = result.rows[0].quantity_available;
                
                if (available < quantity) {
                    throw new Error(`Insufficient inventory for SKU ${sku}. Available: ${available}, Required: ${quantity}`);
                }
                
                // Allocate inventory
                await client.query(`
                    UPDATE inventory
                    SET quantity_allocated = quantity_allocated + $1,
                        quantity_available = quantity_available - $1,
                        updated_at = NOW()
                    WHERE sku = $2 AND warehouse_id = $3
                `, [quantity, sku, warehouseId]);
                
                // Create allocation record
                const allocationResult = await client.query(`
                    INSERT INTO inventory_allocations
                    (order_id, sku, warehouse_id, quantity, allocated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    RETURNING allocation_id
                `, [orderId, sku, warehouseId, quantity]);
                
                allocations.push({
                    allocationId: allocationResult.rows[0].allocation_id,
                    sku,
                    quantity
                });
                
                // Invalidate cache
                await this.redis.del(`inventory:${warehouseId}:${sku}`);
            }
            
            await client.query('COMMIT');
            
            return { orderId, allocations };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Adjust inventory (after picking)
    async adjustInventory(sku, warehouseId, adjustment, reason, userId) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update inventory
            const result = await client.query(`
                UPDATE inventory
                SET quantity_on_hand = quantity_on_hand + $1,
                    quantity_available = quantity_available + $1,
                    updated_at = NOW()
                WHERE sku = $2 AND warehouse_id = $3
                RETURNING quantity_on_hand, quantity_available
            `, [adjustment, sku, warehouseId]);
            
            // Create audit trail
            await client.query(`
                INSERT INTO inventory_adjustments
                (sku, warehouse_id, adjustment, reason, user_id, 
                 previous_quantity, new_quantity, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [sku, warehouseId, adjustment, reason, userId,
                result.rows[0].quantity_on_hand - adjustment,
                result.rows[0].quantity_on_hand]);
            
            await client.query('COMMIT');
            
            // Invalidate cache
            await this.redis.del(`inventory:${warehouseId}:${sku}`);
            
            // Check if reorder needed
            await this.checkReorderPoint(sku, warehouseId);
            
            return result.rows[0];
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    async checkReorderPoint(sku, warehouseId) {
        const result = await this.db.query(`
            SELECT quantity_on_hand, reorder_point, reorder_quantity
            FROM inventory
            WHERE sku = $1 AND warehouse_id = $2
        `, [sku, warehouseId]);
        
        const inventory = result.rows[0];
        
        if (inventory.quantity_on_hand <= inventory.reorder_point) {
            // Trigger replenishment
            await this.triggerReplenishment(sku, warehouseId, inventory.reorder_quantity);
        }
    }
    
    async triggerReplenishment(sku, warehouseId, quantity) {
        await this.db.query(`
            INSERT INTO replenishment_requests
            (sku, warehouse_id, quantity, status, created_at)
            VALUES ($1, $2, $3, 'PENDING', NOW())
        `, [sku, warehouseId, quantity]);
        
        // Publish event
        await this.publishEvent('replenishment.requested', {
            sku,
            warehouseId,
            quantity
        });
    }
}
```

### 2. Picking Optimization Service

```javascript
class PickingOptimizationService {
    constructor(db) {
        this.db = db;
    }
    
    // Generate optimized pick list
    async generatePickList(orderId) {
        // Get order items
        const items = await this.getOrderItems(orderId);
        
        // Get item locations
        const itemLocations = await this.getItemLocations(items);
        
        // Optimize pick path
        const optimizedPath = await this.optimizePickPath(itemLocations);
        
        // Create pick list
        const pickListId = await this.createPickList(orderId, optimizedPath);
        
        return { pickListId, items: optimizedPath };
    }
    
    async getItemLocations(items) {
        const skus = items.map(item => item.sku);
        
        const result = await this.db.query(`
            SELECT 
                il.sku,
                il.location_id,
                l.aisle,
                l.bay,
                l.level,
                l.position,
                il.quantity,
                l.zone,
                l.picking_sequence
            FROM inventory_locations il
            JOIN locations l ON il.location_id = l.location_id
            WHERE il.sku = ANY($1)
            AND il.quantity > 0
            ORDER BY l.picking_sequence ASC
        `, [skus]);
        
        return result.rows;
    }
    
    async optimizePickPath(locations) {
        // Group by zone
        const zones = this.groupByZone(locations);
        
        // Optimize within each zone
        const optimized = [];
        
        for (const [zone, items] of Object.entries(zones)) {
            // Sort by aisle, bay, level (serpentine pattern)
            const sorted = items.sort((a, b) => {
                if (a.aisle !== b.aisle) return a.aisle - b.aisle;
                
                // Serpentine: alternate direction for each aisle
                const direction = a.aisle % 2 === 0 ? 1 : -1;
                
                if (a.bay !== b.bay) return direction * (a.bay - b.bay);
                return a.level - b.level;
            });
            
            optimized.push(...sorted);
        }
        
        return optimized.map((item, index) => ({
            sequence: index + 1,
            sku: item.sku,
            locationId: item.location_id,
            location: `${item.aisle}-${item.bay}-${item.level}`,
            quantity: item.quantity,
            zone: item.zone
        }));
    }
    
    groupByZone(locations) {
        return locations.reduce((acc, loc) => {
            if (!acc[loc.zone]) {
                acc[loc.zone] = [];
            }
            acc[loc.zone].push(loc);
            return acc;
        }, {});
    }
    
    async createPickList(orderId, items) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Create pick list
            const result = await client.query(`
                INSERT INTO pick_lists
                (order_id, status, total_items, created_at)
                VALUES ($1, 'PENDING', $2, NOW())
                RETURNING pick_list_id
            `, [orderId, items.length]);
            
            const pickListId = result.rows[0].pick_list_id;
            
            // Insert pick list items
            for (const item of items) {
                await client.query(`
                    INSERT INTO pick_list_items
                    (pick_list_id, sequence, sku, location_id, quantity, status)
                    VALUES ($1, $2, $3, $4, $5, 'PENDING')
                `, [pickListId, item.sequence, item.sku, item.locationId, item.quantity]);
            }
            
            await client.query('COMMIT');
            
            return pickListId;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
```

### 3. Receiving Service

```javascript
class ReceivingService {
    constructor(db) {
        this.db = db;
    }
    
    // Create receiving order (ASN - Advanced Shipping Notice)
    async createASN(asnData) {
        const {
            purchaseOrderId,
            supplierId,
            expectedDate,
            items
        } = asnData;
        
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Create ASN
            const result = await client.query(`
                INSERT INTO asns
                (purchase_order_id, supplier_id, expected_date, 
                 status, total_items, created_at)
                VALUES ($1, $2, $3, 'EXPECTED', $4, NOW())
                RETURNING asn_id
            `, [purchaseOrderId, supplierId, expectedDate, items.length]);
            
            const asnId = result.rows[0].asn_id;
            
            // Insert ASN items
            for (const item of items) {
                await client.query(`
                    INSERT INTO asn_items
                    (asn_id, sku, expected_quantity, uom)
                    VALUES ($1, $2, $3, $4)
                `, [asnId, item.sku, item.quantity, item.uom]);
            }
            
            await client.query('COMMIT');
            
            return { asnId };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Receive items (scan and put-away)
    async receiveItems(asnId, receivedItems, userId) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const item of receivedItems) {
                const { sku, quantity, locationId, condition } = item;
                
                // Update ASN item
                await client.query(`
                    UPDATE asn_items
                    SET received_quantity = received_quantity + $1,
                        status = CASE 
                            WHEN received_quantity + $1 >= expected_quantity 
                            THEN 'RECEIVED' 
                            ELSE 'PARTIAL' 
                        END
                    WHERE asn_id = $2 AND sku = $3
                `, [quantity, asnId, sku]);
                
                // Add to inventory
                await client.query(`
                    INSERT INTO inventory_locations
                    (sku, location_id, quantity, condition)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (sku, location_id)
                    DO UPDATE SET quantity = inventory_locations.quantity + $3
                `, [sku, locationId, quantity, condition]);
                
                // Update main inventory
                await client.query(`
                    UPDATE inventory
                    SET quantity_on_hand = quantity_on_hand + $1,
                        quantity_available = quantity_available + $1,
                        updated_at = NOW()
                    WHERE sku = $2
                `, [quantity, sku]);
                
                // Create receiving record
                await client.query(`
                    INSERT INTO receiving_records
                    (asn_id, sku, quantity, location_id, condition, 
                     received_by, received_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                `, [asnId, sku, quantity, locationId, condition, userId]);
            }
            
            // Check if ASN is complete
            const asnStatus = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'RECEIVED') as received,
                    COUNT(*) as total
                FROM asn_items
                WHERE asn_id = $1
            `, [asnId]);
            
            if (asnStatus.rows[0].received === asnStatus.rows[0].total) {
                await client.query(`
                    UPDATE asns
                    SET status = 'COMPLETED',
                        completed_at = NOW()
                    WHERE asn_id = $1
                `, [asnId]);
            }
            
            await client.query('COMMIT');
            
            return { success: true };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
```

### 4. Slotting Engine (ABC Analysis)

```javascript
class SlottingEngine {
    constructor(db) {
        this.db = db;
    }
    
    // Perform ABC analysis and optimize slotting
    async optimizeSlotting(warehouseId) {
        // Get SKU velocity (picks per day)
        const skuVelocity = await this.calculateSKUVelocity(warehouseId);
        
        // Classify SKUs (A, B, C)
        const classified = this.classifySKUs(skuVelocity);
        
        // Assign optimal locations
        const slottingPlan = await this.generateSlottingPlan(classified, warehouseId);
        
        return slottingPlan;
    }
    
    async calculateSKUVelocity(warehouseId) {
        const result = await this.db.query(`
            SELECT 
                pli.sku,
                COUNT(*) as pick_count,
                SUM(pli.quantity) as total_quantity,
                AVG(pli.quantity) as avg_quantity_per_pick
            FROM pick_list_items pli
            JOIN pick_lists pl ON pli.pick_list_id = pl.pick_list_id
            WHERE pl.warehouse_id = $1
            AND pl.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY pli.sku
            ORDER BY pick_count DESC
        `, [warehouseId]);
        
        return result.rows;
    }
    
    classifySKUs(skuVelocity) {
        const total = skuVelocity.reduce((sum, sku) => sum + sku.pick_count, 0);
        
        let cumulative = 0;
        const classified = [];
        
        for (const sku of skuVelocity) {
            cumulative += sku.pick_count;
            const percentage = (cumulative / total) * 100;
            
            let classification;
            if (percentage <= 80) {
                classification = 'A'; // Top 20% SKUs = 80% picks
            } else if (percentage <= 95) {
                classification = 'B'; // Next 30% SKUs = 15% picks
            } else {
                classification = 'C'; // Bottom 50% SKUs = 5% picks
            }
            
            classified.push({
                ...sku,
                classification,
                cumulativePercentage: percentage
            });
        }
        
        return classified;
    }
    
    async generateSlottingPlan(classified, warehouseId) {
        // Get available locations sorted by accessibility
        const locations = await this.db.query(`
            SELECT 
                location_id,
                aisle,
                bay,
                level,
                zone,
                CASE 
                    WHEN level = 2 THEN 1  -- Eye level (most accessible)
                    WHEN level = 1 THEN 2  -- Waist level
                    WHEN level = 3 THEN 3  -- Shoulder level
                    ELSE 4                  -- High/low levels
                END as accessibility_score
            FROM locations
            WHERE warehouse_id = $1
            AND is_active = true
            ORDER BY accessibility_score ASC, aisle ASC, bay ASC
        `, [warehouseId]);
        
        const slottingPlan = [];
        
        // Assign A items to most accessible locations
        const aItems = classified.filter(s => s.classification === 'A');
        const bItems = classified.filter(s => s.classification === 'B');
        const cItems = classified.filter(s => s.classification === 'C');
        
        let locationIndex = 0;
        
        // A items get prime locations
        for (const item of aItems) {
            slottingPlan.push({
                sku: item.sku,
                classification: 'A',
                recommendedLocation: locations.rows[locationIndex],
                pickCount: item.pick_count
            });
            locationIndex++;
        }
        
        // B items get mid-tier locations
        for (const item of bItems) {
            slottingPlan.push({
                sku: item.sku,
                classification: 'B',
                recommendedLocation: locations.rows[locationIndex],
                pickCount: item.pick_count
            });
            locationIndex++;
        }
        
        // C items get remaining locations
        for (const item of cItems) {
            slottingPlan.push({
                sku: item.sku,
                classification: 'C',
                recommendedLocation: locations.rows[locationIndex],
                pickCount: item.pick_count
            });
            locationIndex++;
        }
        
        return slottingPlan;
    }
}
```

### 5. Packing Service

```javascript
class PackingService {
    constructor(db) {
        this.db = db;
    }
    
    // Start packing process
    async startPacking(pickListId, packerId) {
        // Verify pick list is complete
        const pickList = await this.db.query(`
            SELECT status
            FROM pick_lists
            WHERE pick_list_id = $1
        `, [pickListId]);
        
        if (pickList.rows[0].status !== 'PICKED') {
            throw new Error('Pick list not ready for packing');
        }
        
        // Create packing record
        const result = await this.db.query(`
            INSERT INTO packing_records
            (pick_list_id, packer_id, status, started_at)
            VALUES ($1, $2, 'IN_PROGRESS', NOW())
            RETURNING packing_id
        `, [pickListId, packerId]);
        
        return { packingId: result.rows[0].packing_id };
    }
    
    // Scan and verify items
    async verifyItem(packingId, sku, scannedBarcode) {
        // Verify barcode matches SKU
        const product = await this.db.query(`
            SELECT sku, barcode
            FROM products
            WHERE sku = $1
        `, [sku]);
        
        if (product.rows[0].barcode !== scannedBarcode) {
            throw new Error('Barcode mismatch');
        }
        
        // Mark item as verified
        await this.db.query(`
            UPDATE packing_items
            SET verified = true,
                verified_at = NOW()
            WHERE packing_id = $1 AND sku = $2
        `, [packingId, sku]);
        
        return { verified: true };
    }
    
    // Complete packing and generate shipping label
    async completePacking(packingId, packingDetails) {
        const {
            boxDimensions,
            weight,
            carrier,
            serviceLevel
        } = packingDetails;
        
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update packing record
            await client.query(`
                UPDATE packing_records
                SET status = 'COMPLETED',
                    box_dimensions = $1,
                    weight = $2,
                    carrier = $3,
                    service_level = $4,
                    completed_at = NOW()
                WHERE packing_id = $5
            `, [JSON.stringify(boxDimensions), weight, carrier, 
                serviceLevel, packingId]);
            
            // Generate tracking number
            const trackingNumber = this.generateTrackingNumber(carrier);
            
            // Create shipment
            await client.query(`
                INSERT INTO shipments
                (packing_id, tracking_number, carrier, 
                 service_level, status, created_at)
                VALUES ($1, $2, $3, $4, 'READY_TO_SHIP', NOW())
            `, [packingId, trackingNumber, carrier, serviceLevel]);
            
            // Update order status
            await client.query(`
                UPDATE orders
                SET status = 'SHIPPED',
                    tracking_number = $1,
                    shipped_at = NOW()
                WHERE order_id = (
                    SELECT order_id FROM pick_lists 
                    WHERE pick_list_id = (
                        SELECT pick_list_id FROM packing_records 
                        WHERE packing_id = $2
                    )
                )
            `, [trackingNumber, packingId]);
            
            await client.query('COMMIT');
            
            return { trackingNumber };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    generateTrackingNumber(carrier) {
        const prefix = {
            'FEDEX': '1Z',
            'UPS': '1Z',
            'USPS': '9400'
        }[carrier] || '1Z';
        
        const random = Math.random().toString(36).substring(2, 15).toUpperCase();
        return `${prefix}${random}`;
    }
}
```

---

## Database Schema

```sql
-- Inventory table
CREATE TABLE inventory (
    sku VARCHAR(50) PRIMARY KEY,
    warehouse_id UUID NOT NULL,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_allocated INTEGER DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    quantity_in_transit INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_available ON inventory(quantity_available);

-- Locations table
CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    aisle INTEGER NOT NULL,
    bay INTEGER NOT NULL,
    level INTEGER NOT NULL,
    position INTEGER,
    zone VARCHAR(20),
    location_type VARCHAR(20), -- PICK, RESERVE, STAGING
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    picking_sequence INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_picking ON locations(picking_sequence);

-- Inventory locations (bin-level tracking)
CREATE TABLE inventory_locations (
    sku VARCHAR(50),
    location_id UUID REFERENCES locations(location_id),
    quantity INTEGER DEFAULT 0,
    condition VARCHAR(20) DEFAULT 'GOOD', -- GOOD, DAMAGED, EXPIRED
    PRIMARY KEY (sku, location_id)
);

CREATE INDEX idx_inv_loc_sku ON inventory_locations(sku);

-- Pick lists
CREATE TABLE pick_lists (
    pick_list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    picker_id UUID,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ASSIGNED, PICKING, PICKED, CANCELLED
    total_items INTEGER,
    picked_items INTEGER DEFAULT 0,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pick_lists_order ON pick_lists(order_id);
CREATE INDEX idx_pick_lists_status ON pick_lists(status);

-- Pick list items
CREATE TABLE pick_list_items (
    pick_list_id UUID REFERENCES pick_lists(pick_list_id),
    sequence INTEGER NOT NULL,
    sku VARCHAR(50),
    location_id UUID REFERENCES locations(location_id),
    quantity INTEGER,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PICKED, SHORT
    picked_quantity INTEGER DEFAULT 0,
    picked_at TIMESTAMP,
    PRIMARY KEY (pick_list_id, sequence)
);

-- ASNs (Advanced Shipping Notices)
CREATE TABLE asns (
    asn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id VARCHAR(50),
    supplier_id UUID,
    warehouse_id UUID,
    expected_date DATE,
    status VARCHAR(20) DEFAULT 'EXPECTED', -- EXPECTED, RECEIVING, COMPLETED
    total_items INTEGER,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cassandra schema for audit trail
CREATE TABLE inventory_audit (
    sku TEXT,
    warehouse_id UUID,
    timestamp TIMESTAMP,
    transaction_type TEXT, -- RECEIVE, PICK, ADJUST, TRANSFER
    quantity INT,
    user_id UUID,
    reference_id UUID,
    previous_quantity INT,
    new_quantity INT,
    PRIMARY KEY (sku, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```

---

## Performance Metrics

| Metric | Target | Monitoring |
|--------|--------|------------|
| Inventory Accuracy | > 99.9% | Cycle counts vs system |
| Pick Rate | > 100 lines/hour | Picks per picker per hour |
| Order Fulfillment Time | < 24 hours | Order to ship time |
| Receiving Rate | > 500 units/hour | Units received per hour |
| Space Utilization | > 85% | Used vs available space |

---

## Interview Talking Points

1. **Real-time Inventory**: Optimistic locking, cache invalidation strategies
2. **Pick Path Optimization**: Serpentine routing, zone-based picking
3. **ABC Analysis**: Slotting optimization for high-velocity items
4. **Concurrency**: Handling 100+ workers with row-level locking
5. **Audit Trail**: Cassandra for high-write throughput tracking

---

## Next Steps

- Learn [E-commerce Platform](../10_Ecommerce_Platform/10_Ecommerce_Platform_System.md)
- Study [Real-time Inventory](../20_Realtime_Inventory_Tracking/20_Realtime_Inventory_System.md)
- Master [Order Management](../15_Order_Management/15_Order_Management_System.md)
