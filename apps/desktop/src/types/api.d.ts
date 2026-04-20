export {}

export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

declare global {
  interface Window {
    api: {
      store: {
        get: () => Promise<IpcResponse<Store>>
        update: (data: Partial<Store>) => Promise<IpcResponse<void>>
      }
      users: {
        login: (data: { name: string; password: string }) => Promise<IpcResponse<User>>
        list: () => Promise<IpcResponse<User[]>>
        create: (data: { name: string; pin: string; role: string }) => Promise<IpcResponse<User>>
      }
      categories: {
        list: () => Promise<IpcResponse<Category[]>>
        create: (data: { name: string; color?: string }) => Promise<IpcResponse<Category>>
        update: (data: Partial<Category>) => Promise<IpcResponse<Category>>
        delete: (id: string) => Promise<IpcResponse<void>>
      }
      suppliers: {
        list: () => Promise<IpcResponse<Supplier[]>>
        create: (data: Partial<Supplier>) => Promise<IpcResponse<Supplier>>
        update: (data: Partial<Supplier>) => Promise<IpcResponse<Supplier>>
        delete: (id: string) => Promise<IpcResponse<void>>
      }
      products: {
        list: (filters?: ProductFilters) => Promise<IpcResponse<Product[]>>
        getByBarcode: (barcode: string) => Promise<IpcResponse<Product | null>>
        create: (data: Partial<Product> & { user_id?: string }) => Promise<IpcResponse<Product>>
        update: (data: Partial<Product> & { user_id?: string }) => Promise<IpcResponse<Product>>
        delete: (id: string) => Promise<IpcResponse<void>>
      }
      sales: {
        create: (data: SalePayload) => Promise<IpcResponse<Sale>>
        list: (filters?: SaleFilters) => Promise<IpcResponse<Sale[]>>
        getItems: (saleId: string) => Promise<IpcResponse<SaleItem[]>>
      }
      cashRegister: {
        open: (data: { user_id: string; opening_amount: number }) => Promise<IpcResponse<CashRegister>>
        getCurrent: () => Promise<IpcResponse<CashRegister | null>>
        close: (data: { id: string; closing_amount: number; notes?: string; user_id: string }) => Promise<IpcResponse<CashRegister>>
        addMovement: (data: Partial<CashMovement>) => Promise<IpcResponse<CashMovement>>
        getMovements: (registerId: string) => Promise<IpcResponse<CashMovement[]>>
      }
      purchases: {
        create: (data: PurchasePayload) => Promise<IpcResponse<Purchase>>
        list: () => Promise<IpcResponse<Purchase[]>>
      }
      reports: {
        salesSummary: (filters?: DateFilters) => Promise<IpcResponse<SalesSummary>>
        salesByDay: (filters?: DateFilters) => Promise<IpcResponse<SalesByDay[]>>
      }
      sync: {
        status: () => Promise<IpcResponse<SyncStatus>>
        manual: () => Promise<IpcResponse<SyncResult>>
      }
    }
  }
}

// ── Entidades ──

export interface Store {
  id: string
  name: string
  address?: string
  phone?: string
  ticket_header?: string
  ticket_footer?: string
  currency: string
  price_round_mode: 'NONE' | '10' | '50' | '100'
  supabase_store_id?: string
}

export interface User {
  id: string
  name: string
  role: 'CASHIER' | 'MANAGER' | 'OWNER'
  active: number
}

export interface Category {
  id: string
  name: string
  color: string
  active: number
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  notes?: string
  active: number
}

export interface Product {
  id: string
  barcode?: string
  name: string
  description?: string
  category_id?: string
  category_name?: string
  supplier_id?: string
  supplier_name?: string
  cost: number
  markup: number
  price_auto: number
  price_manual?: number
  use_manual: number
  round_mode: string
  stock: number
  stock_min: number
  unit: string
  active: number
}

export interface ProductFilters {
  search?: string
  category_id?: string
  supplier_id?: string
  low_stock?: boolean
}

export interface CartItem {
  product_id: string
  product_name: string
  barcode?: string
  quantity: number
  unit_price: number
  unit_cost: number
}

export interface SalePayload {
  user_id: string
  cash_register_id: string
  items: CartItem[]
  subtotal: number
  total: number
  payment_method: 'CASH' | 'TRANSFER'
  amount_paid?: number
  change_given?: number
}

export interface Sale {
  id: string
  ticket_number: number
  user_id: string
  cash_register_id: string
  subtotal: number
  total: number
  payment_method: string
  amount_paid?: number
  change_given?: number
  status: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  unit_cost: number
  subtotal: number
}

export interface SaleFilters {
  date_from?: string
  date_to?: string
  cash_register_id?: string
  limit?: number
}

export interface CashRegister {
  id: string
  user_id: string
  status: 'OPEN' | 'CLOSED'
  opening_amount: number
  closing_amount?: number
  theoretical_amount?: number
  difference?: number
  notes?: string
  opened_at: string
  closed_at?: string
}

export interface CashMovement {
  id: string
  cash_register_id: string
  type: string
  amount: number
  description?: string
  reference_id?: string
  user_id: string
  created_at: string
}

export interface PurchasePayload {
  supplier_id?: string
  user_id: string
  notes?: string
  items: Array<{
    product_id: string
    quantity: number
    unit_cost: number
  }>
}

export interface Purchase {
  id: string
  supplier_id?: string
  supplier_name?: string
  user_id: string
  total_cost: number
  notes?: string
  status: string
  created_at: string
}

export interface DateFilters {
  date_from?: string
  date_to?: string
}

export interface SalesSummary {
  totals: {
    total_sales: number
    total_amount: number
    cash_amount: number
    transfer_amount: number
  }
  topProducts: Array<{
    product_name: string
    total_qty: number
    total_amount: number
    total_margin: number
  }>
  bySupplier: Array<{
    supplier_name: string
    total_amount: number
    total_qty: number
  }>
  lowStock: Array<{
    name: string
    stock: number
    stock_min: number
    unit: string
  }>
}

export interface SalesByDay {
  date: string
  total_sales: number
  total_amount: number
}

export interface SyncStatus {
  online: boolean
  pending: number
  failed: number
  processing: boolean
  lastSync: string | null
  lastError: string | null
}

export interface SyncResult {
  synced: number
  failed: number
}
