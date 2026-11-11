export type User = {
  id: string
  name: string
  email: string
  role: 'customer' | 'admin'
}

export type Product = {
  id: string
  slug: string
  sku: string
  name: string
  category: string
  description: string
  material: string
  care: string
  price: number
  oldPrice: number | null
  image: string
  colors: string[]
  sizes: string[]
  badge: string | null
  active: boolean
  stock: number
  sold: number
  rating: number
  reviewCount: number
  createdAt: string
}

export type ProductVariant = {
  id: string
  color: string
  size: string
  sku: string
  stock: number
}

export type CartItem = {
  variantId: string
  slug: string
  name: string
  image: string
  color: string
  size: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  code: string
  customerName?: string
  email?: string
  phone?: string
  status: string
  paymentMethod: 'cod' | 'bank_transfer'
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  total: number
  createdAt: string
}

export const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'
