
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/useCart'
import { requireLogin } from '../../utils/auth'
import '../../styles/buyer/buyer-product-quickview.css'
import {
  X,
  Heart,
  Star,
  MapPin,
  Store,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from 'lucide-react'

export default function ProductQuickView({
  product,
  onClose
}) {
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(() => Math.max(1, Number(product?.details?.minimumOrder || 1)))
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const [cartError, setCartError] = useState('')
  const [selectedVariations, setSelectedVariations] = useState({})

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!product) return null

  const images = product.images?.length
    ? product.images
    : [product.image]

  const selectedOptions = Object.entries(selectedVariations)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const hasCompleteSelection = selectedOptions.length === (product.variations || []).length
  const selectedCombination = hasCompleteSelection
    ? (product.variationCombinations || []).find(combination =>
        JSON.stringify([...combination.options].sort((left, right) => left.name.localeCompare(right.name))) === JSON.stringify(selectedOptions)
      )
    : null
  const price = Number(selectedCombination?.price ?? product.price)
  const stock = Number(selectedCombination?.stock ?? product.stock ?? 0)
  const minimumOrder = Math.max(1, Number(product.details?.minimumOrder || 1))
  const maximumOrder = Math.min(stock, Number(product.details?.maximumOrder || stock))
  const subtotal = price * quantity
  const activeImageIndex = Number.isInteger(selectedCombination?.imageIndex)
    ? selectedCombination.imageIndex
    : selectedImage

  const changeImage = direction => {
    setSelectedImage(current =>
      (current + direction + images.length) % images.length
    )
  }

  const addToCart = () => {
    if (!requireLogin(navigate, `/buyer/products/${product.id}`)) return
    try {
      setCartError('')
      if ((product.variations || []).some(variation => !selectedVariations[variation.name])) {
        setCartError('Choose an option for each product variation.')
        return
      }
      if (product.variationCombinations?.length && !selectedCombination) {
        setCartError('That product variation combination is unavailable.')
        return
      }
      addItem({
        ...product,
        price,
        stock,
        image: images[activeImageIndex] || images[0],
        variationImageIndex: selectedCombination?.imageIndex ?? null,
        variantSku: selectedCombination?.sku ?? null,
        selectedVariations: selectedOptions
      }, quantity)
      setAdded(true)
    } catch (error) {
      setCartError(error.message)
    }
  }

  const buyNow = () => {
    if (!requireLogin(navigate, `/buyer/products/${product.id}`)) return
    try {
      if ((product.variations || []).some(variation => !selectedVariations[variation.name])) {
        setCartError('Choose an option for each product variation.')
        return
      }
      if (product.variationCombinations?.length && !selectedCombination) {
        setCartError('That product variation combination is unavailable.')
        return
      }
      addItem({
        ...product,
        price,
        stock,
        image: images[activeImageIndex] || images[0],
        variationImageIndex: selectedCombination?.imageIndex ?? null,
        variantSku: selectedCombination?.sku ?? null,
        selectedVariations: selectedOptions
      }, quantity, { showNotice: false })
      onClose()
      navigate('/buyer/checkout')
    } catch (error) {
      setCartError(error.message)
    }
  }

  const toggleWishlist = () => {
    setWishlisted(current => !current)
  }

  return (
    <div
      className="buyer-quickview-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="buyer-quickview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-quickview-title"
      >
        <button
          className="buyer-quickview-close"
          onClick={onClose}
          aria-label="Close product details"
        >
          <X size={21} />
        </button>

        <div className="buyer-quickview-content">

          {/* PRODUCT IMAGES */}
          <div className="buyer-quickview-gallery">
            <div className="buyer-quickview-main-image">
              <img
                src={images[activeImageIndex] || images[0]}
                alt={product.name}
              />

              {images.length > 1 && (
                <>
                  <button
                    className="buyer-image-arrow previous"
                    onClick={() => changeImage(-1)}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    className="buyer-image-arrow next"
                    onClick={() => changeImage(1)}
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {(product.variations || []).map(variation => (
              <label className="buyer-quickview-variation" key={variation.name}>
                {variation.name}
                <select value={selectedVariations[variation.name] || ''} onChange={event => {
                  setQuantity(minimumOrder)
                  setAdded(false)
                  setCartError('')
                  setSelectedVariations(current => ({ ...current, [variation.name]: event.target.value }))
                }}>
                  <option value="">Choose {variation.name.toLowerCase()}</option>
                  {variation.options.map(option => {
                    const partial = { ...selectedVariations, [variation.name]: option }
                    const available = !product.variationCombinations?.length || product.variationCombinations.some(combination =>
                      combination.options.every(({ name, value }) => !partial[name] || partial[name] === value)
                        && Number(combination.stock) > 0
                    )
                    return <option key={option} value={option} disabled={!available}>{option}{available ? '' : ' (out of stock)'}</option>
                  })}
                </select>
              </label>
            ))}

            <div className="buyer-quickview-thumbnails">
              {images.map((image, index) => (
                <button
                  key={image}
                  className={
                    activeImageIndex === index ? 'active' : ''
                  }
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT INFORMATION */}
          <div className="buyer-quickview-info">

            <div className="buyer-quickview-topline">
              <span>{product.category}</span>

              <button
                className={`buyer-quickview-wishlist ${
                  wishlisted ? 'active' : ''
                }`}
                onClick={toggleWishlist}
                aria-label="Toggle wishlist"
              >
                <Heart
                  size={20}
                  fill={wishlisted ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <h2 id="buyer-quickview-title">
              {product.name}
            </h2>

            <div className="buyer-quickview-rating">
              <Star size={15} fill="currentColor" />
              <strong>{product.rating}</strong>
              <span>{product.reviews} reviews</span>
              <span className="quickview-separator">|</span>
              <span>{product.sold} sold</span>
            </div>

            <div className="buyer-quickview-price">
              ₱{price.toLocaleString('en-PH')}
              <small>{product.unit}</small>
            </div>

            <div className="buyer-quickview-stock">
              {stock > 0 ? (
                <>
                  <CheckCircle size={15} />
                  {stock} pieces available
                </>
              ) : (
                <span className="out-of-stock">
                  Out of stock
                </span>
              )}
            </div>

            <div className="buyer-quickview-description">
              <h3>Product Description</h3>
              <p>{product.description}</p>
            </div>
            {product.subcategory && <p><strong>Subcategory:</strong> {product.subcategory}</p>}
            {product.sku && <p><strong>SKU:</strong> {product.sku}</p>}
            {product.details && (
              <dl className="buyer-product-details">
                {product.details.productType && <><dt>Product type</dt><dd>{product.details.productType}</dd></>}
                {product.details.brand && <><dt>Brand / producer</dt><dd>{product.details.brand}</dd></>}
                {product.details.producerName && <><dt>Producer name</dt><dd>{product.details.producerName}</dd></>}
                {product.details.originBarangay && <><dt>Origin</dt><dd>{product.details.originBarangay}, Sta. Maria, Bulacan</dd></>}
                {product.details.weight && <><dt>Weight</dt><dd>{product.details.weight} {product.details.weightUnit || ''}</dd></>}
                {product.details.dimensions && (product.details.dimensions.length || product.details.dimensions.width || product.details.dimensions.height) && <><dt>Dimensions</dt><dd>{product.details.dimensions.length || '-'} x {product.details.dimensions.width || '-'} x {product.details.dimensions.height || '-'} cm</dd></>}
                {product.details.packagingType && <><dt>Packaging</dt><dd>{product.details.packagingType}</dd></>}
                {product.details.minimumOrder && <><dt>Order quantity</dt><dd>{product.details.minimumOrder}{product.details.maximumOrder ? ` to ${product.details.maximumOrder}` : '+'}</dd></>}
                {product.details.expirationDate && <><dt>Expiration</dt><dd>{product.details.expirationDate}</dd></>}
                {product.details.shelfLife && <><dt>Shelf life</dt><dd>{product.details.shelfLife}</dd></>}
                {product.details.shippingNotes && <><dt>Shipping notes</dt><dd>{product.details.shippingNotes}</dd></>}
                {product.details.productSource && <><dt>Producer source</dt><dd>{product.details.productSource}</dd></>}
                {product.details.productionMethod && <><dt>Production method</dt><dd>{product.details.productionMethod}</dd></>}
                {product.details.productStory && <><dt>Producer story</dt><dd>{product.details.productStory}</dd></>}
              </dl>
            )}
            {product.videoUrl && (
              <video className="buyer-product-video" controls preload="metadata" src={product.videoUrl} poster={product.details?.videoCoverIndex != null && product.details.videoCoverIndex !== '' ? images[Number(product.details.videoCoverIndex)] : undefined}>
                Your browser does not support product video.
              </video>
            )}
            {product.producerImages?.length > 0 && (
              <section className="buyer-producer-gallery">
                <h3>Producer and origin gallery</h3>
                <div>{product.producerImages.map((image, index) => <img key={image} src={image} alt={`Product producer and origin ${index + 1}`} />)}</div>
              </section>
            )}

            {product.storefront?.bannerUrl && <img className="buyer-quickview-shop-banner" src={product.storefront.bannerUrl} alt="" />}
            <div className="buyer-quickview-seller">
              <div className="buyer-quickview-seller-icon">
                {product.storefront?.logoUrl
                  ? <img src={product.storefront.logoUrl} alt="" />
                  : <Store size={21} />}
              </div>

              <div>
                <strong>{product.seller}</strong>
                {product.storefront?.description && <p>{product.storefront.description}</p>}
                <span>
                  <MapPin size={13} />
                  {product.location}
                </span>
                {product.storefront?.shopPhone && <span>{product.storefront.shopPhone}</span>}
                {product.storefront?.shopEmail && <span>{product.storefront.shopEmail}</span>}
              </div>
            </div>
            {(product.storefront?.shippingPolicy || product.storefront?.returnPolicy) && (
              <details className="buyer-quickview-shop-policies">
                <summary>Shipping and returns policies</summary>
                {product.storefront.shippingPolicy && <p><strong>Shipping:</strong> {product.storefront.shippingPolicy}</p>}
                {product.storefront.returnPolicy && <p><strong>Returns:</strong> {product.storefront.returnPolicy}</p>}
              </details>
            )}

            <div className="buyer-quickview-quantity">
              <span>Quantity</span>

              <div className="buyer-quantity-control">
                <button
                  onClick={() =>
                    setQuantity(current => Math.max(minimumOrder, current - 1))
                  }
                  disabled={quantity <= minimumOrder}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>

                <span>{quantity}</span>

                <button
                  onClick={() =>
                    setQuantity(current =>
                      Math.min(maximumOrder, current + 1)
                    )
                  }
                  disabled={quantity >= maximumOrder}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="buyer-quickview-subtotal">
              <span>Subtotal</span>
              <strong>
                ₱{subtotal.toLocaleString('en-PH')}
              </strong>
            </div>

            {added && (
              <div className="buyer-cart-success" role="status">
                <CheckCircle size={16} />
                Successfully added to your cart!
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate('/buyer/cart')
                  }}
                >
                  View cart
                </button>
              </div>
            )}
            {cartError && (
              <div className="buyer-cart-error" role="alert">
                {cartError}
              </div>
            )}

            <div className="buyer-quickview-actions">
              <button
                className="buyer-quickview-add"
                onClick={addToCart}
                disabled={stock <= 0 || maximumOrder < minimumOrder}
              >
                <ShoppingCart size={17} />
                Add to Cart
              </button>

              <button
                className="buyer-quickview-buy"
                onClick={buyNow}
                disabled={stock <= 0 || maximumOrder < minimumOrder}
              >
                <Zap size={17} />
                Buy Now
              </button>
            </div>

            <p className="buyer-quickview-note">
              Demonstration listing. Actual product availability
              will be verified through the marketplace database.
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
