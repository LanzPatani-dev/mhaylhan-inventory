export type InventoryStatus = 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock';
export type InventoryExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expiring (7d)' | 'Expired';

export interface InventoryItem {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  expirationDate: string;
  stockStatus: InventoryStatus;
  expiryStatus: InventoryExpiryStatus;
  lastUpdated: string;
}

const readDate = (value: string) => {
  if (!value || value === 'N/A') return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const [month, day, year] = value.split('/');
    if (month && day && year) {
      return new Date(`${year}-${month}-${day}`);
    }
    return null;
  }

  return parsed;
};

export const computeExpiryStatus = (expirationDate: string): InventoryExpiryStatus => {
  if (!expirationDate || expirationDate === 'N/A') return 'Valid';

  const expiryDate = readDate(expirationDate);
  if (!expiryDate) return 'Valid';

  const now = new Date();
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Expiring (7d)';
  if (diffDays <= 30) return 'Expiring Soon';
  return 'Valid';
};

export const computeStockStatus = (quantity: number, minimumStock: number): InventoryStatus => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= minimumStock * 0.5) return 'Critical';
  if (quantity <= minimumStock) return 'Low Stock';
  return 'Normal';
};

export const inventoryCatalog: Record<string, InventoryItem> = {
  '4800888115657': { id: 'inv-001', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', category: 'Beverages', unit: 'Bottle', quantity: 60, minimumStock: 24, expirationDate: '12/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  '4800016012351': { id: 'inv-002', barcode: '4800016012351', productName: 'Lucky Me Pancit Canton', category: 'Grocery', unit: 'Pack', quantity: 56, minimumStock: 30, expirationDate: '06/30/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  '4800057011126': { id: 'inv-003', barcode: '4800057011126', productName: 'Datu Puti Vinegar 1L', category: 'Grocery', unit: 'Bottle', quantity: 44, minimumStock: 12, expirationDate: '09/15/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  '4800016001010': { id: 'inv-004', barcode: '4800016001010', productName: 'Skyflakes Crackers 400g', category: 'Grocery', unit: 'Pack', quantity: 33, minimumStock: 20, expirationDate: '08/20/2026', stockStatus: 'Normal', expiryStatus: 'Expiring (7d)', lastUpdated: 'Aug 15, 2026' },
  '4800888100500': { id: 'inv-005', barcode: '4800888100500', productName: 'Sprite 1L', category: 'Beverages', unit: 'Bottle', quantity: 65, minimumStock: 24, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  '4806501105010': { id: 'inv-006', barcode: '4806501105010', productName: 'C2 Green Tea Apple', category: 'Beverages', unit: 'Bottle', quantity: 42, minimumStock: 30, expirationDate: '10/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  '4800016050012': { id: 'inv-007', barcode: '4800016050012', productName: 'Eden Cheese 165g', category: 'Grocery', unit: 'Pack', quantity: 30, minimumStock: 15, expirationDate: '08/18/2026', stockStatus: 'Normal', expiryStatus: 'Expiring (7d)', lastUpdated: 'Aug 16, 2026' },
  '4800057034001': { id: 'inv-008', barcode: '4800057034001', productName: 'Silver Swan Soy Sauce 1L', category: 'Grocery', unit: 'Bottle', quantity: 32, minimumStock: 12, expirationDate: '12/31/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  '4800061007897': { id: 'inv-009', barcode: '4800061007897', productName: 'Milo 300g', category: 'Beverages', unit: 'Pack', quantity: 2, minimumStock: 10, expirationDate: '03/31/2027', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  '7891000246893': { id: 'inv-010', barcode: '7891000246893', productName: 'Bear Brand Milk 300g', category: 'Grocery', unit: 'Can', quantity: 0, minimumStock: 12, expirationDate: '05/31/2027', stockStatus: 'Out of Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 13, 2026' },
  '4800567100001': { id: 'inv-011', barcode: '4800567100001', productName: 'Nescafe 3-in-1 Original', category: 'Grocery', unit: 'Sachet', quantity: 4, minimumStock: 15, expirationDate: '08/31/2027', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  '4800101000021': { id: 'inv-012', barcode: '4800101000021', productName: 'Marca Piña Pork Luncheon', category: 'Canned Goods', unit: 'Can', quantity: 8, minimumStock: 12, expirationDate: '08/10/2026', stockStatus: 'Low Stock', expiryStatus: 'Expired', lastUpdated: 'Aug 10, 2026' },
  '4800100000019': { id: 'inv-013', barcode: '4800100000019', productName: 'CDO Chorizo de Bilbao', category: 'Canned Goods', unit: 'Can', quantity: 12, minimumStock: 8, expirationDate: '09/05/2026', stockStatus: 'Normal', expiryStatus: 'Expiring Soon', lastUpdated: 'Aug 12, 2026' },
  '4806511200332': { id: 'inv-014', barcode: '4806511200332', productName: 'Tanduay Ice 330ml', category: 'Beverages', unit: 'Can', quantity: 6, minimumStock: 24, expirationDate: '12/31/2026', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 11, 2026' },
  '4800016000013': { id: 'inv-015', barcode: '4800016000013', productName: 'Plastik Straw 100pcs', category: 'Plastic Products', unit: 'Pack', quantity: 25, minimumStock: 10, expirationDate: 'N/A', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 08, 2026' },
  '4800057080001': { id: 'inv-016', barcode: '4800057080001', productName: 'UFC Banana Ketchup 320g', category: 'Grocery', unit: 'Bottle', quantity: 18, minimumStock: 12, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 09, 2026' },
  '4806501200015': { id: 'inv-017', barcode: '4806501200015', productName: 'Wilkins Purified Water 1.5L', category: 'Beverages', unit: 'Bottle', quantity: 48, minimumStock: 36, expirationDate: '12/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  '4800088100234': { id: 'inv-018', barcode: '4800088100234', productName: 'Styro Cup 8oz 50pcs', category: 'Styro Materials', unit: 'Pack', quantity: 15, minimumStock: 10, expirationDate: 'N/A', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 07, 2026' },
  '4800016070001': { id: 'inv-019', barcode: '4800016070001', productName: 'Del Monte Pineapple Juice', category: 'Canned Goods', unit: 'Can', quantity: 22, minimumStock: 12, expirationDate: '07/31/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 10, 2026' },
  '4800057020001': { id: 'inv-020', barcode: '4800057020001', productName: 'Mama Sita Sinigang Mix', category: 'Grocery', unit: 'Pack', quantity: 9, minimumStock: 15, expirationDate: '04/30/2027', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 12, 2026' },
  '4800016030002': { id: 'inv-021', barcode: '4800016030002', productName: 'Royal Tru-Orange 1L', category: 'Beverages', unit: 'Bottle', quantity: 38, minimumStock: 24, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  '4800016040003': { id: 'inv-022', barcode: '4800016040003', productName: 'Chippy BBQ 110g', category: 'Grocery', unit: 'Pack', quantity: 3, minimumStock: 20, expirationDate: '09/30/2026', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  '4800016050004': { id: 'inv-023', barcode: '4800016050004', productName: 'Piattos Cheese 85g', category: 'Grocery', unit: 'Pack', quantity: 7, minimumStock: 20, expirationDate: '10/15/2026', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 13, 2026' },
  '4800016060005': { id: 'inv-024', barcode: '4800016060005', productName: 'Rebisco Crackers 330g', category: 'Grocery', unit: 'Pack', quantity: 28, minimumStock: 15, expirationDate: '12/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 10, 2026' },
  '4800016070006': { id: 'inv-025', barcode: '4800016070006', productName: 'Knorr Chicken Cubes 10pcs', category: 'Grocery', unit: 'Box', quantity: 0, minimumStock: 8, expirationDate: '03/31/2027', stockStatus: 'Out of Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 09, 2026' },
};

const INVENTORY_STORAGE_KEY = 'mhaylhan-inventory-v1';
let inventoryLoaded = false;

const persistInventory = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventoryCatalog));
  } catch {
    // Storage may be unavailable in private browsing or when the browser blocks it.
  }
};

const loadInventory = () => {
  if (inventoryLoaded || typeof window === 'undefined') return;
  inventoryLoaded = true;

  try {
    const saved = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!saved) return;

    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    Object.entries(parsed as Record<string, unknown>).forEach(([barcode, value]) => {
      if (!value || typeof value !== 'object') return;

      const savedItem = value as Partial<InventoryItem>;
      const current = inventoryCatalog[barcode];
      if (!current || typeof savedItem.quantity !== 'number' || !Number.isFinite(savedItem.quantity)) return;

      const quantity = Math.max(0, savedItem.quantity);
      inventoryCatalog[barcode] = {
        ...current,
        quantity,
        stockStatus: computeStockStatus(quantity, current.minimumStock),
        expiryStatus: computeExpiryStatus(current.expirationDate),
        lastUpdated: typeof savedItem.lastUpdated === 'string' ? savedItem.lastUpdated : current.lastUpdated,
      };
    });
  } catch {
    // Ignore corrupt or unavailable saved data and use the default catalog.
  }
};

export const getInventoryRows = () => {
  loadInventory();
  return Object.values(inventoryCatalog);
};

export const findProductByBarcode = (barcode: string) => {
  loadInventory();
  return inventoryCatalog[barcode] ?? null;
};

export const updateInventoryQuantity = (barcode: string, nextQuantity: number) => {
  loadInventory();
  const current = inventoryCatalog[barcode];
  if (!current) return null;

  const updated: InventoryItem = {
    ...current,
    quantity: nextQuantity,
    stockStatus: computeStockStatus(nextQuantity, current.minimumStock),
    expiryStatus: computeExpiryStatus(current.expirationDate),
    lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  inventoryCatalog[barcode] = updated;
  persistInventory();
  return updated;
};
