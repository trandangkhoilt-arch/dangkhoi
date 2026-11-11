import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Heart, Menu, Minus, Plus, Star,
  Search, ShoppingBag, SlidersHorizontal, Sparkles, Truck, UserRound, X,
} from 'lucide-react'
import { api, jsonBody } from './api'
import { money, type CartItem, type Order, type Product, type ProductVariant, type User } from './types'
import './App.css'

const cartStorageKey = 'maymac-cart-v1'
const favoritesStorageKey = 'maymac-favorites-v1'
const currentYear = new Date().getFullYear()
const categories = ['Tất cả', 'Áo', 'Đầm', 'Quần', 'Váy', 'Áo khoác', 'Phụ kiện']
const statusNames: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
}
const statusTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

type StoreValue = {
  user: User | null
  setUser: (user: User | null) => void
  cart: CartItem[]
  addToCart: (item: CartItem, maxStock: number) => void
  updateQuantity: (variantId: string, quantity: number) => void
  removeFromCart: (variantId: string) => void
  clearCart: () => void
  favorites: string[]
  toggleFavorite: (slug: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => readStorage(cartStorageKey, []))
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(favoritesStorageKey, []))

  useEffect(() => {
    void api<{ user: User | null }>('/api/me').then((result) => setUser(result.user)).catch(() => setUser(null))
  }, [])
  useEffect(() => localStorage.setItem(cartStorageKey, JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites)), [favorites])

  function addToCart(item: CartItem, maxStock: number) {
    setCart((current) => {
      const existing = current.find((line) => line.variantId === item.variantId)
      const nextQuantity = Math.min(maxStock, (existing?.quantity || 0) + item.quantity)
      if (existing) return current.map((line) => line.variantId === item.variantId ? { ...line, quantity: nextQuantity } : line)
      return [...current, { ...item, quantity: Math.min(maxStock, item.quantity) }]
    })
  }

  function updateQuantity(variantId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.variantId !== variantId))
      return
    }
    setCart((current) => current.map((item) => item.variantId === variantId
      ? { ...item, quantity: Math.min(10, quantity) }
      : item))
  }

  function toggleFavorite(slug: string) {
    setFavorites((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug])
  }

  const value = useMemo(() => ({
    user, setUser, cart, addToCart, updateQuantity,
    removeFromCart: (variantId: string) => setCart((current) => current.filter((item) => item.variantId !== variantId)),
    clearCart: () => setCart([]),
    favorites, toggleFavorite,
  }), [user, cart, favorites])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within StoreProvider')
  return store
}

function useProducts(params = '') {
  const [result, setResult] = useState<{ params: string; products: Product[]; error: string } | null>(null)

  useEffect(() => {
    let active = true
    void api<{ products: Product[] }>(`/api/products${params ? `?${params}` : ''}`)
      .then((response) => { if (active) setResult({ params, products: response.products, error: '' }) })
      .catch((requestError: unknown) => {
        if (active) setResult({ params, products: [], error: requestError instanceof Error ? requestError.message : 'Không tải được sản phẩm.' })
      })
    return () => { active = false }
  }, [params])

  const isCurrent = result?.params === params
  return {
    products: isCurrent ? result.products : [],
    loading: !isCurrent,
    error: isCurrent ? result.error : '',
  }
}

function Announcement() {
  return <div className="announcement">FREESHIP ĐƠN TỪ 1.000.000Đ <span>·</span> ĐỔI SIZE TRONG 07 NGÀY</div>
}

function Header() {
  const { cart, favorites, user } = useStore()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const count = cart.reduce((total, item) => total + item.quantity, 0)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate(`/shop?q=${encodeURIComponent(search.trim())}`)
    setMenuOpen(false)
  }

  return <>
    <Announcement />
    <header className="site-header">
      <button className="mobile-menu icon-button" aria-label="Mở menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <Link to="/" className="brand" aria-label="Mây Mặc - trang chủ">
        <span className="brand-symbol">M</span><span className="brand-word">MÂY MẶC<small>EVERYDAY STUDIO</small></span>
      </Link>
      <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính">
        <Link to="/shop" onClick={() => setMenuOpen(false)}>Tất cả</Link>
        <Link to="/shop?category=Áo" onClick={() => setMenuOpen(false)}>Áo</Link>
        <Link to="/shop?category=Đầm" onClick={() => setMenuOpen(false)}>Đầm</Link>
        <Link to="/shop?category=Quần" onClick={() => setMenuOpen(false)}>Quần</Link>
        <Link className="nav-highlight" to="/shop?sort=popular" onClick={() => setMenuOpen(false)}>Bán chạy</Link>
      </nav>
      <div className="header-actions">
        <form className="search-box" onSubmit={submitSearch}>
          <Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm món đồ..." aria-label="Tìm sản phẩm" />
        </form>
        <Link className="icon-button account-link" to="/account" aria-label={user ? `Tài khoản ${user.name}` : 'Đăng nhập'}>
          <UserRound size={19} /><span className="header-action-label">{user ? user.name.split(' ')[0] : 'Tài khoản'}</span>
        </Link>
        <Link className="icon-button favorite-link" to="/favorites" aria-label={`Sản phẩm yêu thích, ${favorites.length} món`}>
          <Heart size={19} /><span className="header-action-label">Yêu thích</span>{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
        </Link>
        <Link className="icon-button bag-link" to="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
          <ShoppingBag size={19} /><span className="header-action-label">Giỏ hàng</span><span className="count-badge">{count}</span>
        </Link>
      </div>
    </header>
  </>
}

function Footer() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await api('/api/newsletter', jsonBody({ email }))
      setMessage('Cảm ơn bạn đã đăng ký nhận thư từ Mây Mặc.')
      setEmail('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể đăng ký lúc này.')
    }
  }

  return <footer className="site-footer">
    <section className="footer-newsletter">
      <div><p className="eyebrow">MỘT CHÚT TIN VUI TRONG HỘP THƯ</p><h2>Thư từ Mây, <em>thỉnh thoảng.</em></h2><p>Chuyện đồ mới, cách phối hay và những điều nhỏ xinh.</p></div>
      <form className="newsletter-form" onSubmit={subscribe}>
        <label className="sr-only" htmlFor="newsletter-email">Email của bạn</label>
        <input id="newsletter-email" type="email" placeholder="Email của bạn" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <button className="button button-dark" type="submit">Đăng ký <ArrowRight size={16} /></button>
        {message && <p className="inline-success">{message}</p>}{error && <p className="inline-error">{error}</p>}
      </form>
    </section>
    <div className="footer-main">
      <Link to="/" className="brand footer-brand"><span className="brand-symbol">M</span><span className="brand-word">MÂY MẶC<small>EVERYDAY STUDIO</small></span></Link>
      <p>Những món đồ dễ mặc,<br />đồng hành cùng nhịp sống riêng.</p>
      <div><h3>Khám phá</h3><Link to="/shop">Cửa hàng</Link><Link to="/shop?category=Đầm">Đầm & váy</Link><Link to="/shop?category=Áo">Áo</Link></div>
      <div><h3>Hỗ trợ</h3><Link to="/track">Tra cứu đơn hàng</Link><Link to="/account">Tài khoản</Link><a href="mailto:hello@maymac.studio">hello@maymac.studio</a></div>
      <address>TP. Hồ Chí Minh<br />Thứ 2 — Thứ 7 · 09:00 — 18:00</address>
    </div>
    <div className="footer-bottom"><span>© {currentYear} Mây Mặc Studio</span><span>Được làm để mặc lâu.</span><Link to="/admin/setup">Quản trị cửa hàng</Link></div>
  </footer>
}

function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite } = useStore()
  const isFavorite = favorites.includes(product.slug)
  return <article className="product-card">
    <div className="product-photo">
      <Link to={`/product/${product.slug}`} aria-label={`Xem ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <span className="product-quick-view">Xem sản phẩm <ArrowRight size={15} /></span>
      </Link>
      <button className={`favorite-toggle ${isFavorite ? 'is-favorite' : ''}`} aria-label={isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'} aria-pressed={isFavorite} onClick={() => toggleFavorite(product.slug)}>
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
    <div className="product-card-info">
      <div className="product-category-row"><span>{product.category}</span>{product.rating > 0 && <span>★ {product.rating.toFixed(1)} <small>({product.reviewCount})</small></span>}</div>
      <Link className="product-name" to={`/product/${product.slug}`}>{product.name}</Link>
      <div className="product-price">{money(product.price)}{product.oldPrice && product.oldPrice > product.price && <del>{money(product.oldPrice)}</del>}</div>
    </div>
  </article>
}

function ProductGrid({ products, loading, emptyText = 'Chưa tìm thấy sản phẩm phù hợp.' }: { products: Product[]; loading?: boolean; emptyText?: string }) {
  if (loading) return <div className="product-grid">{Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index}><div /><span /><span /></div>)}</div>
  if (!products.length) return <div className="empty-state"><Search size={28} /><h3>{emptyText}</h3><p>Thử đổi từ khóa hoặc bộ lọc để xem thêm sản phẩm.</p><Link className="text-link" to="/shop">Xem tất cả <ArrowRight size={15} /></Link></div>
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
}

function HomePage() {
  const { products, loading } = useProducts('sort=popular&limit=4')
  const [newProducts, setNewProducts] = useState<Product[]>([])

  useEffect(() => {
    void api<{ products: Product[] }>('/api/products?sort=newest&limit=4').then((result) => setNewProducts(result.products)).catch(() => setNewProducts([]))
  }, [])

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> BỘ SƯU TẬP MÙA NẮNG</p>
        <h1>Mặc nhẹ,<br />sống theo <em>nhịp riêng.</em></h1>
        <p className="hero-description">Những món đồ thoải mái và có chủ đích — dành cho ngày thường, theo cách rất riêng của bạn.</p>
        <div className="hero-actions"><Link to="/shop" className="button button-dark">Khám phá bộ sưu tập <ArrowRight size={16} /></Link><Link to="/shop?sort=newest" className="text-link">Đồ mới lên kệ <ArrowDown size={15} /></Link></div>
        <div className="hero-note"><span>01</span><span>CHẤT LIỆU TỰ NHIÊN · PHOM DỄ MẶC</span></div>
      </div>
      <div className="hero-visual">
        <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1400&q=88" alt="Bộ sưu tập thời trang Mây Mặc" />
        <div className="hero-caption"><span>01 — 08</span><span>NHẸ NHÀNG NHƯ MÂY</span></div>
        <div className="hero-sticker"><Sparkles size={16} /><span>New<br />season</span></div>
      </div>
    </section>
    <section className="trust-strip" aria-label="Ưu điểm dịch vụ">
      <span><Truck size={18} /> Freeship từ 1 triệu</span><i /><span><Check size={18} /> Đổi size trong 7 ngày</span><i /><span><Heart size={18} /> Chất liệu được chọn kỹ</span>
    </section>
    <section className="section collection-section">
      <div className="section-heading"><div><p className="eyebrow">CHỌN THEO TÂM TRẠNG</p><h2>Hôm nay, bạn muốn mặc gì?</h2></div><Link to="/shop" className="text-link">Xem tất cả <ArrowRight size={16} /></Link></div>
      <div className="category-cards">
        <Link to="/shop?category=Áo" className="category-card"><img src="https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=850&q=82" alt="Trang phục áo" /><span>Áo <ArrowRight size={18} /></span></Link>
        <Link to="/shop?category=Đầm" className="category-card"><img src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=850&q=82" alt="Trang phục đầm" /><span>Đầm & váy <ArrowRight size={18} /></span></Link>
        <Link to="/shop?category=Quần" className="category-card"><img src="https://images.unsplash.com/photo-1506629905607-d9c36b4c0f55?auto=format&fit=crop&w=850&q=82" alt="Trang phục quần" /><span>Quần <ArrowRight size={18} /></span></Link>
      </div>
    </section>
    <section className="section products-section">
      <div className="section-heading"><div><p className="eyebrow">ĐƯỢC YÊU THÍCH NHẤT</p><h2>Những món mọi người chọn</h2></div><Link to="/shop?sort=popular" className="text-link">Xem đồ bán chạy <ArrowRight size={16} /></Link></div>
      <ProductGrid products={products} loading={loading} />
    </section>
    <section className="story-banner">
      <div className="story-image"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85" alt="Phong cách tự nhiên của Mây Mặc" /></div>
      <div className="story-copy"><p className="eyebrow">MÂY MẶC — EVERYDAY STUDIO</p><h2>Ít hơn một chút.<br /><em>Đúng mình hơn.</em></h2><p>Chúng tôi tin quần áo không cần nói quá nhiều. Chỉ cần vừa vặn, thoải mái và khiến bạn thấy là chính mình.</p><Link to="/shop" className="button button-outline">Tìm món đồ của bạn <ArrowRight size={16} /></Link></div>
    </section>
    <section className="section products-section">
      <div className="section-heading"><div><p className="eyebrow">VỪA LÊN KỆ</p><h2>Gặp những món đồ mới</h2></div><Link to="/shop?sort=newest" className="text-link">Xem đồ mới <ArrowRight size={16} /></Link></div>
      <ProductGrid products={newProducts} />
    </section>
    <section className="quote-section"><span className="quote-mark">“</span><blockquote>Mặc đẹp không phải để trở thành ai khác — mà để thoải mái là chính mình.</blockquote><span>MÂY MẶC STUDIO</span></section>
  </main>
}

function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'Tất cả'
  const sort = searchParams.get('sort') || 'newest'
  const [search, setSearch] = useState(query)
  const [mobileFilters, setMobileFilters] = useState(false)
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (category !== 'Tất cả') params.set('category', category)
  params.set('sort', sort)
  params.set('limit', '48')
  const { products, loading, error } = useProducts(params.toString())

  function changeFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'Tất cả') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    changeFilter('q', search.trim())
  }

  return <main className="page-main shop-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Cửa hàng</span></div>
    <div className="shop-title"><div><p className="eyebrow">MẶC THEO CÁCH CỦA BẠN</p><h1>{category === 'Tất cả' ? 'Cửa hàng' : category}</h1><p>Những món đồ được chọn để mặc mỗi ngày.</p></div><form className="shop-search" onSubmit={submitSearch}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." aria-label="Tìm sản phẩm trong cửa hàng" /></form></div>
    <div className="shop-toolbar">
      <button className="filter-mobile button button-outline" onClick={() => setMobileFilters(!mobileFilters)}><SlidersHorizontal size={16} /> Bộ lọc</button>
      <div className={`category-filters ${mobileFilters ? 'is-open' : ''}`}>{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => changeFilter('category', item)}>{item}</button>)}</div>
      <label className="sort-control"><span>Sắp xếp</span><select value={sort} onChange={(event) => changeFilter('sort', event.target.value)}><option value="newest">Mới nhất</option><option value="popular">Bán chạy</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select><ChevronDown size={14} /></label>
    </div>
    {error && <p className="inline-error">{error}</p>}
    <p className="result-count">{loading ? 'Đang tải sản phẩm…' : `${products.length} sản phẩm`}</p>
    <ProductGrid products={products} loading={loading} />
  </main>
}

function ProductPage() {
  const { slug = '' } = useParams()
  const { addToCart, favorites, toggleFavorite, user } = useStore()
  const [result, setResult] = useState<{
    slug: string
    product: Product | null
    variants: ProductVariant[]
    reviews: { id: string; author: string; rating: number; comment: string; createdAt: string }[]
    error: string
  } | null>(null)
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    void api<{
      product: Product
      variants: ProductVariant[]
      reviews: { id: string; author: string; rating: number; comment: string; createdAt: string }[]
    }>(`/api/products/${slug}`)
      .then((response) => {
        if (!active) return
        setResult({ slug, product: response.product, variants: response.variants, reviews: response.reviews, error: '' })
        setColor(response.product.colors[0] || '')
        setSize(response.product.sizes[0] || '')
        setQuantity(1)
      })
      .catch((requestError: unknown) => {
        if (active) setResult({
          slug,
          product: null,
          variants: [],
          reviews: [],
          error: requestError instanceof Error ? requestError.message : 'Không tìm thấy sản phẩm.',
        })
      })
    return () => { active = false }
  }, [slug])

  const isCurrent = result?.slug === slug
  const loading = !isCurrent
  const product = isCurrent ? result.product : null
  const variants = isCurrent ? result.variants : []
  const reviews = isCurrent ? result.reviews : []
  const error = isCurrent ? result.error : ''
  if (loading) return <main className="page-main"><div className="product-detail-skeleton" /></main>
  if (error || !product) return <main className="page-main empty-state"><h1>Không tìm thấy sản phẩm</h1><p>{error}</p><Link className="button button-dark" to="/shop">Quay lại cửa hàng</Link></main>

  const selected = variants.find((variant) => variant.color === color && variant.size === size)
  const isFavorite = favorites.includes(product.slug)

  function addProduct(redirect = false) {
    if (!product || !selected || selected.stock < 1) return
    addToCart({
      variantId: selected.id, slug: product.slug, name: product.name, image: product.image,
      color, size, price: product.price, quantity,
    }, selected.stock)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
    if (redirect) navigate('/cart')
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReviewError('')
    setReviewMessage('')
    setReviewLoading(true)
    try {
      await api(`/api/products/${slug}/reviews`, jsonBody({ rating: reviewRating, comment: reviewComment }))
      const refreshed = await api<{
        product: Product
        variants: ProductVariant[]
        reviews: { id: string; author: string; rating: number; comment: string; createdAt: string }[]
      }>(`/api/products/${slug}`)
      setResult({ slug, product: refreshed.product, variants: refreshed.variants, reviews: refreshed.reviews, error: '' })
      setReviewComment('')
      setReviewMessage('Cảm ơn bạn đã chia sẻ trải nghiệm.')
    } catch (requestError) {
      setReviewError(requestError instanceof Error ? requestError.message : 'Không thể gửi đánh giá.')
    } finally {
      setReviewLoading(false)
    }
  }

  return <main className="page-main product-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/shop">Cửa hàng</Link><span>/</span><span>{product.name}</span></div>
    <div className="product-detail">
      <div className="product-detail-image"><img src={product.image} alt={product.name} /><span className="image-count">01 / 01</span></div>
      <div className="product-detail-info">
        <p className="eyebrow">{product.category} <span>·</span> {product.sku}</p>
        <h1>{product.name}</h1>
        {product.reviewCount > 0 && <p className="detail-rating">★ {product.rating.toFixed(1)} <span>({product.reviewCount} đánh giá)</span></p>}
        <div className="detail-price">{money(product.price)}{product.oldPrice && product.oldPrice > product.price && <><del>{money(product.oldPrice)}</del><span className="discount-label">-{Math.round((1 - product.price / product.oldPrice) * 100)}%</span></>}</div>
        <p className="detail-description">{product.description}</p>
        <div className="variant-group"><div className="variant-heading"><span>Màu sắc</span><strong>{color}</strong></div><div className="color-options">{product.colors.map((item, index) => <button key={item} className={color === item ? 'selected' : ''} onClick={() => { setColor(item); setQuantity(1) }}><span className={`color-swatch swatch-${index % 6}`} />{item}</button>)}</div></div>
        <div className="variant-group"><div className="variant-heading"><span>Kích cỡ</span><Link to="/policies/size-guide">Hướng dẫn chọn size</Link></div><div className="size-options">{product.sizes.map((item) => {
          const option = variants.find((variant) => variant.color === color && variant.size === item)
          return <button key={item} className={size === item ? 'selected' : ''} disabled={!option || option.stock === 0} onClick={() => { setSize(item); setQuantity(1) }}>{item}</button>
        })}</div></div>
        <p className={`stock-note ${selected?.stock ? '' : 'out-of-stock'}`}>{selected?.stock ? `Còn ${selected.stock} sản phẩm · giao hàng toàn quốc` : 'Tạm hết size này'}</p>
        <div className="purchase-row"><div className="quantity-control"><button aria-label="Giảm số lượng" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><span>{quantity}</span><button aria-label="Tăng số lượng" onClick={() => setQuantity(Math.min(selected?.stock || 1, 10, quantity + 1))}><Plus size={15} /></button></div><button className="button button-dark add-cart-button" disabled={!selected?.stock} onClick={() => addProduct()}>{added ? <><Check size={17} /> Đã thêm vào giỏ</> : <><ShoppingBag size={17} /> Thêm vào giỏ</>}</button><button className={`icon-button detail-favorite ${isFavorite ? 'is-favorite' : ''}`} aria-label="Yêu thích" aria-pressed={isFavorite} onClick={() => toggleFavorite(product.slug)}><Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
        <button className="button button-clay buy-now-button" disabled={!selected?.stock} onClick={() => addProduct(true)}>Mua ngay <ArrowRight size={16} /></button>
        <div className="product-accordions"><details open><summary>Chất liệu & phom dáng <Plus size={15} /></summary><p>{product.material}. {product.description}</p></details><details><summary>Hướng dẫn bảo quản <Plus size={15} /></summary><p>{product.care}</p></details><details><summary>Giao hàng & đổi trả <Plus size={15} /></summary><p>Đơn từ 1.000.000đ được miễn phí giao hàng. Mây Mặc hỗ trợ đổi size trong 7 ngày khi sản phẩm còn nguyên nhãn và chưa qua sử dụng.</p></details></div>
      </div>
    </div>
    <section className="reviews-section">
      <div className="section-heading"><div><p className="eyebrow">CHIA SẺ TRẢI NGHIỆM</p><h2>Đánh giá sản phẩm <span>({product.reviewCount})</span></h2></div>{product.rating > 0 && <strong className="review-summary">★ {product.rating.toFixed(1)} / 5</strong>}</div>
      {reviews.length ? <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-card-top"><strong>{review.author}</strong><span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span></div><div className="review-stars" aria-label={`${review.rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < review.rating ? 'currentColor' : 'none'} />)}</div><p>{review.comment}</p></article>)}</div> : <p className="no-reviews">Chưa có đánh giá mới. Đơn đã nhận hàng có thể gửi đánh giá từ đây.</p>}
      {user && <form className="review-form" onSubmit={submitReview}><h3>Viết đánh giá</h3><label>Điểm đánh giá<select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} sao</option>)}</select></label><label>Chia sẻ cảm nhận<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} minLength={5} maxLength={1000} rows={3} required /></label>{reviewError && <p className="inline-error" role="alert">{reviewError}</p>}{reviewMessage && <p className="inline-success" role="status">{reviewMessage}</p>}<button className="button button-outline" disabled={reviewLoading}>{reviewLoading ? 'Đang gửi…' : 'Gửi đánh giá'} <ArrowRight size={15} /></button><small>Chỉ khách hàng đã nhận sản phẩm mới có thể gửi đánh giá.</small></form>}
    </section>
  </main>
}

function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore()
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= 1_000_000 || subtotal === 0 ? 0 : 30_000
  const progress = Math.min(100, Math.round(subtotal / 1_000_000 * 100))

  if (!cart.length) return <main className="page-main empty-cart"><div className="empty-cart-icon"><ShoppingBag size={26} /></div><p className="eyebrow">GIỎ HÀNG ĐANG TRỐNG</p><h1>Món đồ tiếp theo đang đợi bạn.</h1><p>Khám phá những món đồ dễ mặc cho nhịp sống mỗi ngày.</p><Link to="/shop" className="button button-dark">Tiếp tục mua sắm <ArrowRight size={16} /></Link></main>

  return <main className="page-main cart-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Giỏ hàng</span></div>
    <div className="page-title"><div><p className="eyebrow">TỦ ĐỒ CỦA BẠN</p><h1>Giỏ hàng <span>({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></h1></div><Link to="/shop" className="text-link"><ArrowLeft size={15} /> Tiếp tục mua sắm</Link></div>
    <div className="cart-layout"><section className="cart-items">{cart.map((item) => <article className="cart-item" key={item.variantId}>
      <Link to={`/product/${item.slug}`} className="cart-item-image"><img src={item.image} alt={item.name} /></Link>
      <div className="cart-item-details"><p className="eyebrow">MÂY MẶC STUDIO</p><Link to={`/product/${item.slug}`} className="cart-item-title">{item.name}</Link><p>Màu: {item.color} <span>·</span> Size: {item.size}</p><button className="remove-item" onClick={() => removeFromCart(item.variantId)}>Xóa</button></div>
      <div className="cart-item-end"><strong>{money(item.price * item.quantity)}</strong><div className="quantity-control small"><button aria-label="Giảm" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Tăng" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}><Plus size={13} /></button></div></div>
    </article>)}</section>
    <aside className="order-summary"><h2>Tóm tắt đơn hàng</h2><div className="shipping-meter"><span>{subtotal >= 1_000_000 ? 'Bạn được miễn phí giao hàng!' : `Mua thêm ${money(1_000_000 - subtotal)} để được miễn phí giao hàng`}</span><div><i style={{ width: `${progress}%` }} /></div></div><div className="summary-line"><span>Tạm tính</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Giao hàng</span><span>{shipping === 0 ? 'Miễn phí' : money(shipping)}</span></div><div className="summary-total"><span>Tổng cộng</span><strong>{money(subtotal + shipping)}</strong></div><p className="tax-note">Đã bao gồm thuế. Phí giao hàng được tính ở bước tiếp theo.</p><Link className="button button-dark checkout-button" to="/checkout">Tiến hành thanh toán <ArrowRight size={16} /></Link><div className="secure-note"><Check size={15} /> Thanh toán an toàn · Hỗ trợ đổi size</div></aside></div>
  </main>
}

function CheckoutPage() {
  const { cart, clearCart, user } = useStore()
  const navigate = useNavigate()
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [settings, setSettings] = useState<{ bankTransfer: { bankName: string; account: string; holder: string } | null; shippingFee: number; freeShippingFrom: number } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
  const [couponError, setCouponError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void api<{ bankTransfer: { bankName: string; account: string; holder: string } | null; shippingFee: number; freeShippingFrom: number }>('/api/checkout/settings')
      .then(setSettings).catch(() => setSettings({ bankTransfer: null, shippingFee: 30_000, freeShippingFrom: 1_000_000 }))
  }, [])

  if (!cart.length) return <Navigate to="/cart" replace />
  const shippingFee = settings && subtotal - (coupon?.discount || 0) >= settings.freeShippingFrom ? 0 : settings?.shippingFee ?? 30_000
  const total = subtotal - (coupon?.discount || 0) + shippingFee

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCouponError('')
    try {
      const result = await api<{ code: string; discount: number }>('/api/coupons/validate', jsonBody({ code: couponInput, subtotal }))
      setCoupon(result)
    } catch (requestError) {
      setCoupon(null)
      setCouponError(requestError instanceof Error ? requestError.message : 'Không thể áp dụng mã.')
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = {
      customerName: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      address: String(form.get('address') || ''),
      city: String(form.get('city') || ''),
      note: String(form.get('note') || ''),
      paymentMethod,
      couponCode: coupon?.code,
      items: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
    }
    try {
      const result = await api<{ order: { id: string; code: string; total: number; status: string; paymentMethod: string } }>('/api/orders', jsonBody(payload))
      clearCart()
      navigate(`/order-success/${result.order.code}`, { state: { order: result.order, phone: payload.phone } })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể tạo đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="page-main checkout-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/cart">Giỏ hàng</Link><span>/</span><span>Thanh toán</span></div>
    <div className="page-title"><div><p className="eyebrow">GẦN XONG RỒI</p><h1>Thông tin nhận hàng</h1></div></div>
    <form className="checkout-layout" onSubmit={placeOrder}>
      <section className="checkout-form">
        {user && <div className="signed-in-note"><Check size={16} /> Đang đặt hàng với tài khoản {user.email}</div>}
        <div className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Thông tin liên hệ</h2><p>Để Mây gửi thông tin đơn hàng cho bạn.</p></div></div><div className="form-grid"><label>Họ và tên<input name="name" defaultValue={user?.name || ''} autoComplete="name" required /></label><label>Số điện thoại<input name="phone" type="tel" autoComplete="tel" required minLength={9} /></label><label className="full-field">Email<input name="email" type="email" defaultValue={user?.email || ''} autoComplete="email" required /></label></div></div>
        <div className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Địa chỉ giao hàng</h2><p>Kiểm tra kỹ để đơn hàng đến đúng nơi.</p></div></div><div className="form-grid"><label className="full-field">Địa chỉ cụ thể<input name="address" placeholder="Số nhà, tên đường, phường/xã..." autoComplete="street-address" required /></label><label className="full-field">Tỉnh / thành phố<input name="city" autoComplete="address-level1" required /></label><label className="full-field">Ghi chú cho đơn hàng <span className="optional">(không bắt buộc)</span><textarea name="note" rows={3} maxLength={500} placeholder="Ví dụ: gọi trước khi giao..." /></label></div></div>
        <div className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Phương thức thanh toán</h2><p>Thông tin thanh toán không được lưu ở trình duyệt.</p></div></div><div className="payment-options"><label className={paymentMethod === 'cod' ? 'payment-option selected' : 'payment-option'}><input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} /><span><strong>Thanh toán khi nhận hàng</strong><small>Thanh toán tiền mặt cho nhân viên giao hàng.</small></span><span className="radio-mark" /></label><label className={`${paymentMethod === 'bank_transfer' ? 'payment-option selected' : 'payment-option'} ${!settings?.bankTransfer ? 'disabled' : ''}`}><input type="radio" name="payment" checked={paymentMethod === 'bank_transfer'} disabled={!settings?.bankTransfer} onChange={() => setPaymentMethod('bank_transfer')} /><span><strong>Chuyển khoản ngân hàng</strong><small>{settings?.bankTransfer ? 'Thông tin chuyển khoản sẽ hiển thị sau khi đặt đơn.' : 'Cửa hàng chưa cấu hình tài khoản nhận chuyển khoản.'}</small></span><span className="radio-mark" /></label></div></div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="button button-dark place-order-button" type="submit" disabled={loading}>{loading ? 'Đang tạo đơn hàng…' : <>Đặt hàng · {money(total)} <ArrowRight size={16} /></>}</button>
        <p className="demo-disclaimer">Đơn hàng được lưu trên hệ thống cửa hàng Mây Mặc. Tích hợp VNPay/MoMo cần cấu hình tài khoản merchant.</p>
      </section>
      <aside className="order-summary checkout-summary"><h2>Đơn hàng của bạn</h2>{cart.map((item) => <div className="checkout-product" key={item.variantId}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>{item.color} · {item.size} · SL {item.quantity}</span></div><b>{money(item.price * item.quantity)}</b></div>)}<form className="coupon-form" onSubmit={applyCoupon}><label htmlFor="coupon">Mã ưu đãi</label><div><input id="coupon" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Nhập mã giảm giá" /><button className="button button-outline" type="submit">Áp dụng</button></div>{coupon && <p className="inline-success"><Check size={14} /> Đã áp dụng {coupon.code}</p>}{couponError && <p className="inline-error">{couponError}</p>}</form><div className="summary-line"><span>Tạm tính</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Ưu đãi</span><span>{coupon ? `−${money(coupon.discount)}` : '—'}</span></div><div className="summary-line"><span>Giao hàng</span><span>{shippingFee ? money(shippingFee) : 'Miễn phí'}</span></div><div className="summary-total"><span>Tổng cộng</span><strong>{money(total)}</strong></div></aside>
    </form>
  </main>
}

function OrderSuccessPage() {
  const location = useLocation()
  const { code = '' } = useParams()
  const state = location.state as { order?: { code: string; total: number; paymentMethod: string }; phone?: string } | null
  const [order, setOrder] = useState(state?.order || null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (state?.order || !state?.phone || !code) return
    void api<{ order: { code: string; total: number; paymentMethod: string } }>('/api/orders/track', jsonBody({ code, phone: state.phone }))
      .then((result) => setOrder(result.order)).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Không tìm thấy đơn hàng.'))
  }, [code, state])

  return <main className="page-main success-page"><div className="success-icon"><Check size={28} /></div><p className="eyebrow">CẢM ƠN BẠN ĐÃ CHỌN MÂY MẶC</p><h1>{order ? 'Đơn hàng đã được ghi nhận.' : 'Đang xác nhận đơn hàng…'}</h1>{order && <><p>Mã đơn hàng của bạn là <strong>{order.code}</strong></p><p>Tổng thanh toán: <strong>{money(order.total)}</strong> · {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}</p></>} {error && <p className="inline-error">{error}</p>}<Link className="button button-dark" to="/shop">Tiếp tục mua sắm <ArrowRight size={16} /></Link></main>
}

function AccountPage() {
  const { user, setUser } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verificationLink, setVerificationLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (user) void api<{ orders: Order[] }>('/api/orders/mine').then((result) => setOrders(result.orders)).catch(() => setOrders([]))
  }, [user])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = {
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
      ...(mode === 'register' ? { name: String(form.get('name') || '') } : {}),
    }
    try {
      if (mode === 'register') {
        const result = await api<{ verificationRequired: boolean; developmentVerificationUrl?: string }>('/api/auth/register', jsonBody(payload))
        setNotice('Tài khoản đã được tạo. Hãy xác minh email để đăng nhập.')
        setVerificationLink(result.developmentVerificationUrl || '')
        setMode('login')
        return
      }
      const result = await api<{ user: User }>(`/api/auth/${mode}`, jsonBody(payload))
      setUser(result.user)
      if (result.user.role === 'admin') navigate('/admin')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể đăng nhập lúc này.')
    } finally {
      setLoading(false)
    }
  }

  if (user) return <AccountDashboard user={user} orders={orders} setUser={setUser} setOrders={setOrders} />

  return <main className="page-main auth-page"><div className="auth-aside"><p className="eyebrow">MÂY MẶC STUDIO</p><h1>Mặc nhẹ,<br /><em>là chính mình.</em></h1><p>Tạo tài khoản để theo dõi đơn hàng và lưu lại những món đồ yêu thích.</p></div><form className="auth-form" onSubmit={submit}><p className="eyebrow">{mode === 'login' ? 'CHÀO MỪNG BẠN TRỞ LẠI' : 'BẮT ĐẦU TỪ ĐÂY'}</p><h2>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>{notice && <div className="auth-notice"><p>{notice}</p>{verificationLink && <Link to={verificationLink.replace(window.location.origin, '')}>Xác minh email local <ArrowRight size={14} /></Link>}</div>}{mode === 'register' && <label>Họ và tên<input name="name" autoComplete="name" required minLength={2} /></label>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 10 : 1} required />{mode === 'register' && <small>Tối thiểu 10 ký tự</small>}</label>{mode === 'login' && <Link className="forgot-link" to="/forgot-password">Quên mật khẩu?</Link>}{error && <p className="inline-error" role="alert">{error}</p>}<button className="button button-dark auth-submit" disabled={loading}>{loading ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={16} /></button><p className="auth-switch">{mode === 'login' ? 'Bạn mới đến Mây Mặc?' : 'Đã có tài khoản?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); setVerificationLink('') }}>{mode === 'login' ? 'Tạo tài khoản' : 'Đăng nhập'}</button></p></form></main>
}

function AccountDashboard({ user, orders, setUser, setOrders }: {
  user: User
  orders: Order[]
  setUser: (user: User | null) => void
  setOrders: (orders: Order[]) => void
}) {
  const [error, setError] = useState('')

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setOrders([])
  }

  async function cancelOrder(order: Order) {
    setError('')
    try {
      await api(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      const result = await api<{ orders: Order[] }>('/api/orders/mine')
      setOrders(result.orders)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể hủy đơn hàng.')
    }
  }

  return <main className="page-main account-page"><div className="account-heading"><div><p className="eyebrow">XIN CHÀO, {user.name.toUpperCase()}</p><h1>Tài khoản của bạn</h1><p>{user.email}</p></div><div className="account-actions">{user.role === 'admin' && <Link className="button button-outline" to="/admin">Quản trị cửa hàng</Link>}<button className="text-link" onClick={() => void signOut()}>Đăng xuất</button></div></div><section className="account-orders"><div className="section-heading"><div><p className="eyebrow">NHỮNG LẦN GẦN ĐÂY</p><h2>Đơn hàng của bạn</h2></div><Link to="/track" className="text-link">Tra cứu đơn <ArrowRight size={15} /></Link></div>{error && <p className="inline-error">{error}</p>}{orders.length ? <div className="orders-table"><div className="orders-table-head"><span>Mã đơn</span><span>Ngày đặt</span><span>Trạng thái</span><span>Tổng tiền</span></div>{orders.map((order) => <div className="orders-table-row" key={order.id}><strong>{order.code}</strong><span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span><span className={`status-pill status-${order.status}`}>{statusNames[order.status] || order.status}</span><b>{money(order.total)}</b>{order.status === 'pending' && <button className="cancel-order-button" onClick={() => void cancelOrder(order)}>Hủy đơn</button>}</div>)}</div> : <div className="empty-orders"><p>Bạn chưa có đơn hàng nào.</p><Link to="/shop" className="text-link">Bắt đầu khám phá <ArrowRight size={15} /></Link></div>}</section></main>
}

function FavoritesPage() {
  const { favorites } = useStore()
  const { products, loading } = useProducts('limit=48')
  const favoriteProducts = products.filter((product) => favorites.includes(product.slug))
  return <main className="page-main"><div className="page-title"><div><p className="eyebrow">ĐÃ ĐỂ DÀNH</p><h1>Món đồ yêu thích</h1></div></div><ProductGrid products={favoriteProducts} loading={loading} emptyText="Chưa có món đồ yêu thích." /></main>
}

function TrackOrderPage() {
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await api<{ order: Record<string, unknown> }>('/api/orders/track', jsonBody({
        code: String(form.get('code') || ''),
        phone: String(form.get('phone') || ''),
      }))
      setOrder(result.order)
    } catch (requestError) {
      setOrder(null)
      setError(requestError instanceof Error ? requestError.message : 'Không tìm thấy đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="page-main track-page"><p className="eyebrow">MÂY MẶC ĐANG GỬI ĐƠN ĐẾN BẠN</p><h1>Tra cứu đơn hàng</h1><p>Nhập mã đơn hàng và số điện thoại đã đặt.</p><form className="track-form" onSubmit={track}><label>Mã đơn hàng<input name="code" placeholder="Ví dụ: MM..." required /></label><label>Số điện thoại<input name="phone" type="tel" required /></label><button className="button button-dark" disabled={loading}>{loading ? 'Đang tra cứu…' : 'Tra cứu đơn hàng'} <ArrowRight size={16} /></button></form>{error && <p className="inline-error" role="alert">{error}</p>}{order && <div className="track-result"><p className="eyebrow">ĐƠN HÀNG {String(order.code)}</p><h2>{statusNames[String(order.status)] || String(order.status)}</h2><p>Người nhận: {String(order.customerName)} · {String(order.phone)}</p><p>Tổng cộng: <strong>{money(Number(order.total))}</strong></p></div>}</main>
}

function AdminSetupPage() {
  const { setUser } = useStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const result = await api<{ user: User }>('/api/admin/bootstrap', jsonBody({
        setupKey: form.get('setupKey'), name: form.get('name'), email: form.get('email'), password: form.get('password'),
      }))
      setUser(result.user)
      navigate('/admin')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo tài khoản quản trị.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="page-main admin-setup"><p className="eyebrow">THIẾT LẬP LẦN ĐẦU</p><h1>Tạo tài khoản quản trị</h1><p>Chỉ tạo được một lần bằng mã bí mật đã cấu hình trên Cloudflare.</p><form className="auth-form" onSubmit={setup}><label>Mã thiết lập<input name="setupKey" type="password" required /></label><label>Họ và tên<input name="name" required minLength={2} /></label><label>Email<input name="email" type="email" required /></label><label>Mật khẩu<input name="password" type="password" required minLength={12} /></label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? 'Đang thiết lập…' : 'Tạo quản trị viên'} <ArrowRight size={16} /></button></form></main>
}

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [result, setResult] = useState<{ token: string; error: string; message: string } | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    void api('/api/auth/verify-email', jsonBody({ token }))
      .then(() => { if (active) setResult({ token, error: '', message: 'Email đã được xác minh. Bạn có thể đăng nhập.' }) })
      .catch((requestError: unknown) => {
        if (active) setResult({
          token,
          error: requestError instanceof Error ? requestError.message : 'Không thể xác minh email.',
          message: '',
        })
      })
    return () => { active = false }
  }, [token])

  const error = !token ? 'Liên kết xác minh không hợp lệ.' : result?.token === token ? result.error : ''
  const message = result?.token === token ? result.message : token ? 'Đang xác minh email…' : ''
  return <main className="page-main auth-link-page"><div className="success-icon"><Check size={26} /></div><p className="eyebrow">MÂY MẶC STUDIO</p><h1>{error || message}</h1><Link className="button button-dark" to="/account">Đến trang đăng nhập <ArrowRight size={16} /></Link></main>
}

function PasswordRecoveryPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetLink, setResetLink] = useState('')
  const [loading, setLoading] = useState(false)
  const isReset = Boolean(token)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      if (isReset) {
        await api('/api/auth/reset-password', jsonBody({ token, password: form.get('password') }))
        setMessage('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.')
      } else {
        const result = await api<{ developmentResetUrl?: string }>('/api/auth/forgot-password', jsonBody({ email: form.get('email') }))
        setMessage('Nếu email có tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi.')
        setResetLink(result.developmentResetUrl || '')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể xử lý yêu cầu.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="page-main recovery-page"><p className="eyebrow">BẢO MẬT TÀI KHOẢN</p><h1>{isReset ? 'Đặt mật khẩu mới' : 'Khôi phục mật khẩu'}</h1><p>{isReset ? 'Chọn mật khẩu mới có ít nhất 10 ký tự.' : 'Nhập email đã đăng ký để nhận hướng dẫn.'}</p><form className="auth-form" onSubmit={submit}>{isReset ? <label>Mật khẩu mới<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label> : <label>Email<input name="email" type="email" required autoComplete="email" /></label>}{error && <p className="inline-error">{error}</p>}{message && <div className="auth-notice"><p>{message}</p>{resetLink && <Link to={resetLink.replace(window.location.origin, '')}>Đặt lại mật khẩu local <ArrowRight size={14} /></Link>}</div>}<button className="button button-dark" disabled={loading}>{loading ? 'Đang xử lý…' : isReset ? 'Lưu mật khẩu mới' : 'Gửi hướng dẫn'} <ArrowRight size={16} /></button><Link className="text-link" to="/account">Quay lại đăng nhập</Link></form></main>
}

function AdminPage() {
  const { user } = useStore()
  const [summary, setSummary] = useState<{ orders: number; products: number; customers: number; revenue: number } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<(Order & { customerName: string })[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview')
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const navigate = useNavigate()

  async function loadAdmin() {
    try {
      const [nextSummary, nextProducts, nextOrders] = await Promise.all([
        api<typeof summary>('/api/admin/summary'),
        api<{ products: Product[] }>('/api/admin/products?limit=48'),
        api<{ orders: (Order & { customerName: string })[] }>('/api/admin/orders'),
      ])
      setSummary(nextSummary)
      setProducts(nextProducts.products)
      setOrders(nextOrders.orders)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không tải được dữ liệu quản trị.')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAdmin() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (!user || user.role !== 'admin') return <main className="page-main admin-locked"><p className="eyebrow">KHU VỰC QUẢN TRỊ</p><h1>Đăng nhập quản trị để tiếp tục.</h1><Link to="/account" className="button button-dark">Đăng nhập <ArrowRight size={16} /></Link></main>

  async function setProductActive(product: Product, active: boolean) {
    setBusy(true)
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
      await loadAdmin()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật sản phẩm.')
    } finally {
      setBusy(false)
    }
  }

  async function changeOrderStatus(order: Order, status: string) {
    setBusy(true)
    try {
      await api(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await loadAdmin()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật đơn hàng.')
    } finally {
      setBusy(false)
    }
  }

  async function changePaymentStatus(order: Order, paymentStatus: string) {
    setBusy(true)
    try {
      await api(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: order.status, paymentStatus }),
      })
      await loadAdmin()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật thanh toán.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-page">
    <aside className="admin-sidebar"><Link to="/" className="brand"><span className="brand-symbol">M</span><span className="brand-word">MÂY MẶC<small>ADMIN STUDIO</small></span></Link><p className="admin-sidebar-label">CỬA HÀNG</p><button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Tổng quan</button><button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Sản phẩm</button><button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Đơn hàng <span>{orders.filter((order) => order.status === 'pending').length || ''}</span></button><div className="admin-sidebar-bottom"><span>{user.name}</span><button onClick={() => navigate('/account')}>Tài khoản & đăng xuất</button><Link to="/">← Về cửa hàng</Link></div></aside>
    <section className="admin-content"><header className="admin-topbar"><div><p className="eyebrow">MÂY MẶC / QUẢN TRỊ</p><h1>{activeTab === 'overview' ? 'Tổng quan' : activeTab === 'products' ? 'Sản phẩm' : 'Đơn hàng'}</h1></div><button className="button button-outline" onClick={() => void loadAdmin()}>Làm mới <ArrowDown size={15} /></button></header>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {activeTab === 'overview' && <><div className="admin-metrics">{[['Đơn hàng', summary?.orders ?? '—'], ['Sản phẩm đang bán', summary?.products ?? '—'], ['Khách hàng', summary?.customers ?? '—'], ['Giá trị đơn', summary ? money(summary.revenue) : '—']].map(([label, value]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>Cập nhật trực tiếp từ cửa hàng</small></article>)}</div><div className="admin-section"><div className="section-heading"><div><p className="eyebrow">MỚI NHẤT</p><h2>Đơn hàng gần đây</h2></div><button className="text-link" onClick={() => setActiveTab('orders')}>Tất cả đơn <ArrowRight size={15} /></button></div><OrderTable orders={orders.slice(0, 5)} busy={busy} onChange={changeOrderStatus} onPaymentChange={changePaymentStatus} /></div><div className="admin-section"><div className="section-heading"><div><p className="eyebrow">ĐANG HIỂN THỊ</p><h2>Sản phẩm nổi bật</h2></div><button className="text-link" onClick={() => setActiveTab('products')}>Quản lý sản phẩm <ArrowRight size={15} /></button></div><ProductAdminTable products={products.slice(0, 5)} busy={busy} onToggle={setProductActive} /></div></>}
      {activeTab === 'orders' && <div className="admin-section"><div className="section-heading"><div><p className="eyebrow">TỪ KHÁCH HÀNG</p><h2>{orders.length} đơn hàng</h2></div></div><OrderTable orders={orders} busy={busy} onChange={changeOrderStatus} onPaymentChange={changePaymentStatus} /></div>}
      {activeTab === 'products' && <div className="admin-section"><div className="section-heading"><div><p className="eyebrow">CATALOG</p><h2>{products.length} sản phẩm</h2></div><button className="button button-dark" onClick={() => { setEditingProduct(null); setNewProductOpen(!newProductOpen) }}>{newProductOpen || editingProduct ? 'Đóng biểu mẫu' : <><Plus size={15} /> Thêm sản phẩm</>}</button></div>{(newProductOpen || editingProduct) && <AdminProductForm key={editingProduct?.id || 'new-product'} product={editingProduct || undefined} onSaved={async () => { setNewProductOpen(false); setEditingProduct(null); await loadAdmin() }} /> }<ProductAdminTable products={products} busy={busy} onToggle={setProductActive} onEdit={(product) => { setNewProductOpen(false); setEditingProduct(product) }} /></div>}
    </section>
  </main>
}

function OrderTable({ orders, busy, onChange, onPaymentChange }: { orders: (Order & { customerName?: string })[]; busy: boolean; onChange: (order: Order, status: string) => void; onPaymentChange: (order: Order, status: string) => void }) {
  if (!orders.length) return <div className="empty-orders"><p>Chưa có đơn hàng.</p></div>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.code}</strong></td><td>{order.customerName || order.email}</td><td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'}</td><td>{money(order.total)}</td><td><select value={order.paymentStatus} disabled={busy} onChange={(event) => onPaymentChange(order, event.target.value)} aria-label={`Thanh toán đơn ${order.code}`}><option value="unpaid">Chưa thanh toán</option><option value="paid" disabled={order.paymentStatus !== 'paid' && order.status === 'cancelled'}>Đã thanh toán</option><option value="refunded" disabled={order.paymentStatus !== 'refunded' && order.paymentStatus !== 'paid'}>Đã hoàn tiền</option></select></td><td><select value={order.status} disabled={busy} onChange={(event) => onChange(order, event.target.value)} aria-label={`Trạng thái đơn ${order.code}`}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value} disabled={value !== order.status && !statusTransitions[order.status]?.includes(value)}>{label}</option>)}</select></td></tr>)}</tbody></table></div>
}

function ProductAdminTable({ products, busy, onToggle, onEdit }: { products: Product[]; busy: boolean; onToggle: (product: Product, active: boolean) => void; onEdit?: (product: Product) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.image} alt="" /><strong>{product.name}</strong></div></td><td>{product.sku}</td><td>{product.category}</td><td>{money(product.price)}</td><td>{product.stock}</td><td><button className={`active-toggle ${product.active ? '' : 'inactive'}`} disabled={busy} onClick={() => onToggle(product, !product.active)}>{product.active ? 'Đang bán' : 'Tạm ẩn'}</button></td><td>{onEdit && <button className="admin-edit-button" onClick={() => onEdit(product)}>Sửa</button>}</td></tr>)}</tbody></table></div>
}

function AdminProductForm({ product, onSaved }: { product?: Product; onSaved: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '')
    const slug = String(form.get('slug') || '').trim().toLowerCase()
    try {
      const payload = {
        name, slug, sku: form.get('sku'), category: form.get('category'),
        description: form.get('description'), material: form.get('material'), care: form.get('care'),
        price: Number(form.get('price')), oldPrice: Number(form.get('oldPrice')) || null,
        image: form.get('image'), colors: String(form.get('colors')).split(',').map((item) => item.trim()).filter(Boolean),
        sizes: String(form.get('sizes')).split(',').map((item) => item.trim()).filter(Boolean),
        stockPerVariant: Number(form.get('stockPerVariant')), badge: String(form.get('badge') || '').trim() || null,
      }
      await api(product ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        ...jsonBody(payload),
        method: product ? 'PUT' : 'POST',
      })
      await onSaved()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo sản phẩm.')
    } finally {
      setLoading(false)
    }
  }
  const variantsCount = Math.max(1, product?.colors.length || 1) * Math.max(1, product?.sizes.length || 1)
  const averageStock = product ? Math.floor(product.stock / variantsCount) : 5
  return <form className="admin-product-form" onSubmit={submit}><div className="admin-form-grid"><label>Tên sản phẩm<input name="name" defaultValue={product?.name || ''} required /></label><label>Đường dẫn (slug)<input name="slug" defaultValue={product?.slug || ''} placeholder="ao-linen-nang" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label>Mã SKU<input name="sku" defaultValue={product?.sku || ''} required /></label><label>Danh mục<select name="category" defaultValue={product?.category || 'Áo'}>{categories.filter((category) => category !== 'Tất cả').map((category) => <option key={category}>{category}</option>)}</select></label><label>Giá bán (đ)<input name="price" type="number" min="1" defaultValue={product?.price || ''} required /></label><label>Giá gốc (đ)<input name="oldPrice" type="number" min="0" defaultValue={product?.oldPrice || ''} /></label><label className="full-field">Ảnh sản phẩm (URL)<input name="image" type="url" defaultValue={product?.image || ''} required /></label><label className="full-field">Mô tả<textarea name="description" rows={2} defaultValue={product?.description || ''} required minLength={10} /></label><label>Chất liệu<input name="material" defaultValue={product?.material || ''} required /></label><label>Hướng dẫn bảo quản<input name="care" defaultValue={product?.care || ''} required /></label><label>Màu sắc (cách nhau bằng dấu phẩy)<input name="colors" defaultValue={product?.colors.join(', ') || ''} placeholder="Kem, Nâu" required /></label><label>Kích cỡ (cách nhau bằng dấu phẩy)<input name="sizes" defaultValue={product?.sizes.join(', ') || ''} placeholder="S, M, L" required /></label><label>Tồn kho mỗi phân loại<input name="stockPerVariant" type="number" min="0" defaultValue={averageStock} required /></label><label>Nhãn tùy chọn<input name="badge" defaultValue={product?.badge || ''} placeholder="Mẻ mới" /></label></div>{error && <p className="inline-error">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? 'Đang lưu…' : product ? 'Lưu thay đổi' : 'Tạo sản phẩm'} <Check size={15} /></button></form>
}

function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Chào bạn, mình là stylist của Mây Mặc. Hôm nay bạn đang tìm món đồ cho dịp nào?' },
  ])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setDraft('')
    setError('')
    setLoading(true)
    try {
      const result = await api<{ message: string }>('/api/chat', jsonBody({ messages: next.slice(-10) }))
      setMessages((current) => [...current, { role: 'assistant', content: result.message }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chưa thể kết nối stylist.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="chat-widget">{open && <section className="chat-panel" aria-label="Stylist Mây Mặc"><header><div className="chat-avatar"><Sparkles size={16} /></div><div><strong>Stylist Mây Mặc</strong><span>Tư vấn chọn đồ cùng bạn</span></div><button className="icon-button" aria-label="Đóng chat" onClick={() => setOpen(false)}><X size={17} /></button></header><div className="chat-feed" aria-live="polite">{messages.map((message, index) => <p key={`${index}-${message.role}`} className={`chat-bubble ${message.role}`}>{message.content}</p>)}{loading && <p className="chat-bubble assistant">Mình đang nghĩ một chút…</p>}{error && <p className="inline-error">{error}</p>}</div><form className="chat-composer" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1800} placeholder="Hỏi về chất liệu, cách phối..." aria-label="Tin nhắn cho stylist" /><button className="button button-dark" disabled={loading || !draft.trim()} aria-label="Gửi tin nhắn"><ArrowRight size={16} /></button></form><small>Gợi ý từ AI có thể chưa chính xác. Đơn hàng chỉ đặt qua cửa hàng.</small></section>}<button className="chat-launcher" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? <X size={19} /> : <><Sparkles size={17} /> Hỏi stylist</>}</button></div>
}

function NotFoundPage() {
  return <main className="page-main empty-state"><p className="eyebrow">TRANG NÀY CHƯA CÓ TRONG TỦ ĐỒ</p><h1>Không tìm thấy trang.</h1><Link className="button button-dark" to="/">Về trang chủ <ArrowRight size={16} /></Link></main>
}

function AppLayout() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  return <div className={isAdmin ? 'app-shell admin-shell' : 'app-shell'}>{!isAdmin && <Header />}<Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/shop" element={<ShopPage />} />
    <Route path="/product/:slug" element={<ProductPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/order-success/:code" element={<OrderSuccessPage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
    <Route path="/reset-password" element={<PasswordRecoveryPage />} />
    <Route path="/favorites" element={<FavoritesPage />} />
    <Route path="/track" element={<TrackOrderPage />} />
    <Route path="/admin/setup" element={<AdminSetupPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>{!isAdmin && <><Footer /><ChatWidget /> <Link className="mobile-cart-shortcut" to="/cart"><ShoppingBag size={17} /></Link></>}</div>
}

export default function App() {
  return <StoreProvider><AppLayout /></StoreProvider>
}
