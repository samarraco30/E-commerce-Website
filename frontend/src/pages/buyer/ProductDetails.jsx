import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Heart,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Truck,
  ZoomIn
} from 'lucide-react'
import { useCart } from '../../context/useCart'
import { requireLogin } from '../../utils/auth'
import api from '../../services/api'
import products from '../../data/products'
import '../../styles/buyer/buyer-product-details.css'

const formatPrice = price => `₱${Number(price).toLocaleString('en-PH', {
  minimumFractionDigits: Number(price) % 1 ? 2 : 0,
  maximumFractionDigits: 2
})}`

function RatingStars({ rating, size = 15 }) {
  return (
    <span className="product-rating-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

function ProductReview({ review }) {
  const reviewer = review.buyer || review.reviewer || 'Verified buyer'
  const createdAt = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : ''

  return (
    <article className="product-review-card">
      <div className="product-review-avatar" aria-hidden="true">
        {reviewer.trim().charAt(0).toUpperCase()}
      </div>
      <div className="product-review-body">
        <div className="product-review-heading">
          <div>
            <strong>{reviewer}</strong>
            {createdAt && <span>{createdAt}</span>}
          </div>
          <RatingStars rating={review.rating} size={14} />
        </div>
        {review.title && <h3>{review.title}</h3>}
        <p>{review.body}</p>
        {review.sellerResponse && (
          <div className="product-review-response">
            <strong>Seller response</strong>
            <p>{review.sellerResponse}</p>
          </div>
        )}
      </div>
    </article>
  )
}

export default function ProductDetails({ productId }) {
  const { addItem, addItems } = useCart()
  const navigate = useNavigate()
  const { id } = useParams()
  const resolvedId = String(productId ?? id ?? '')
  const isSellerProduct = resolvedId.startsWith('seller-')
  const sampleProduct = products.find(item => String(item.id) === resolvedId)

  const [sellerProduct, setSellerProduct] = useState(null)
  const [productLoading, setProductLoading] = useState(isSellerProduct)
  const [productError, setProductError] = useState('')
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(isSellerProduct)
  const [reviewsError, setReviewsError] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [cartError, setCartError] = useState('')
  const [added, setAdded] = useState(false)
  const [selectedVariations, setSelectedVariations] = useState({})
  const [variantQuantities, setVariantQuantities] = useState({})
  const [ratingFilter, setRatingFilter] = useState(0)

  useEffect(() => {
    if (!isSellerProduct) return undefined

    let active = true
    api.get('/marketplace/products')
      .then(({ data }) => {
        if (!active) return
        const foundProduct = data.data.find(item => String(item.id) === resolvedId)
        if (!foundProduct) {
          setProductError('This product is no longer available.')
          return
        }
        setSellerProduct({
          ...foundProduct,
          images: foundProduct.images?.length
            ? foundProduct.images
            : [foundProduct.imageUrl].filter(Boolean),
          unit: foundProduct.unit || 'per item',
          details: foundProduct.details || {},
          variations: foundProduct.variations || [],
          variationCombinations: foundProduct.variationCombinations || []
        })
      })
      .catch(requestError => {
        if (active) {
          setProductError(
            requestError.response?.data?.message ||
            'We could not load this product. Please try again.'
          )
        }
      })
      .finally(() => {
        if (active) setProductLoading(false)
      })

    return () => {
      active = false
    }
  }, [isSellerProduct, resolvedId])

  const product = isSellerProduct ? sellerProduct : sampleProduct

  const effectiveVariations = Object.fromEntries(
    (product?.variations || []).map(group => [
      group.name,
      group.options?.includes(selectedVariations[group.name])
        ? selectedVariations[group.name]
        : group.options?.[0] || ''
    ])
  )
  const images = product?.images?.length ? product.images.slice(0, 5) : []

  useEffect(() => {
    if (!isSellerProduct || !product) return undefined

    let active = true
    api.get(`/marketplace/products/${encodeURIComponent(resolvedId)}/reviews`)
      .then(({ data }) => {
        if (active) setReviews(data.data)
      })
      .catch(requestError => {
        if (active) {
          setReviewsError(
            requestError.response?.data?.message ||
            'Customer reviews could not be loaded.'
          )
        }
      })
      .finally(() => {
        if (active) setReviewsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isSellerProduct, product, resolvedId])

  const variationCombination = useMemo(() => (
    product?.variationCombinations?.find(combination =>
      (combination.options || []).every(
        option => effectiveVariations[option.name] === option.value
      )
    )
  ), [product, effectiveVariations])

  const variationGroups = product?.variations || []
  const quantityVariation = variationGroups.at(-1)
  const selectableVariations = variationGroups.slice(0, -1)
  const variantRows = useMemo(() => {
    if (!quantityVariation) return []

    return (quantityVariation.options || []).map(value => {
      const options = [
        ...selectableVariations.map(group => ({
          name: group.name,
          value: effectiveVariations[group.name]
        })),
        { name: quantityVariation.name, value }
      ]
      const combination = product.variationCombinations?.find(candidate =>
        options.length === (candidate.options || []).length &&
        options.every(option => candidate.options.some(candidateOption =>
          candidateOption.name === option.name &&
          candidateOption.value === option.value
        ))
      )
      const key = JSON.stringify(options)

      return {
        key,
        options,
        combination,
        quantity: variantQuantities[key] || 0,
        stock: Number(combination?.stock || 0),
        price: Number(combination?.price ?? product.price ?? 0),
        image: images[combination?.imageIndex ?? selectedImage] || images[0]
      }
    })
  }, [
    effectiveVariations,
    images,
    product,
    quantityVariation,
    selectableVariations,
    selectedImage,
    variantQuantities
  ])

  const selectedStock = variationCombination?.stock ?? product?.stock ?? 0
  const selectedPrice = Number(variationCombination?.price ?? product?.price ?? 0)
  const originalPrice = Number(
    variationCombination?.originalPrice ??
    product?.originalPrice ??
    product?.compareAtPrice ??
    0
  )
  const variantUnitCount = variantRows.reduce((total, row) => total + row.quantity, 0)
  const variantSubtotal = variantRows.reduce((total, row) => total + row.quantity * row.price, 0)
  const variantPriceRange = variantRows.length
    ? [
        Math.min(...variantRows.map(row => row.price)),
        Math.max(...variantRows.map(row => row.price))
      ]
    : [selectedPrice, selectedPrice]
  const minimumOrder = Math.max(1, Number(product?.details?.minimumOrder || 1))
  const purchaseQuantity = quantityVariation ? variantUnitCount : quantity
  const purchaseSubtotal = quantityVariation
    ? variantSubtotal
    : selectedPrice * quantity
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length
    : isSellerProduct ? Number(product?.rating || 0) : 0
  const reviewCounts = useMemo(() => (
    Object.fromEntries([5, 4, 3, 2, 1].map(rating => [
      rating,
      reviews.filter(review => Number(review.rating) === rating).length
    ]))
  ), [reviews])
  const visibleReviews = ratingFilter
    ? reviews.filter(review => Number(review.rating) === ratingFilter)
    : reviews
  const relatedProducts = useMemo(() => {
    const candidates = [
      ...products.filter(item => String(item.id) !== resolvedId),
      ...(sellerProduct ? [] : [])
    ]
    return candidates
      .sort((left, right) =>
        Number(right.category === product?.category) -
        Number(left.category === product?.category)
      )
      .slice(0, 4)
  }, [product?.category, resolvedId, sellerProduct])

  const setVariation = (name, value) => {
    setSelectedVariations(current => ({ ...current, [name]: value }))
    setAdded(false)
  }

  const handlePurchase = (buyNow = false) => {
    setCartError('')
    if (!requireLogin(navigate, `/buyer/products/${resolvedId}`)) return

    try {
      if (quantityVariation) {
        if (variantUnitCount < minimumOrder) {
          setCartError(`Choose at least ${minimumOrder} ${product.unit} in total.`)
          return
        }

        const selectedRows = variantRows.filter(row => row.quantity > 0)
        const invalidRow = selectedRows.find(row => !row.combination || row.quantity > row.stock)
        if (invalidRow) {
          setCartError('One or more selected variations are no longer available.')
          return
        }

        const entries = selectedRows.map(row => ({
          product: {
            ...product,
            price: row.price,
            stock: row.stock,
            productStock: product.stock,
            selectedVariations: row.options,
            variantSku: row.combination.sku,
            variationImageIndex: row.combination.imageIndex
          },
          quantity: row.quantity
        }))
        const wasAdded = addItems(entries)
        if (!wasAdded) {
          setCartError('Sign in before adding this product to your cart.')
          return
        }
      } else {
        const cartProduct = {
          ...product,
          stock: selectedStock,
          selectedVariations: Object.entries(effectiveVariations)
            .filter(([, value]) => value)
            .map(([name, value]) => ({ name, value })),
          variantSku: variationCombination?.sku
        }
        const wasAdded = addItem(cartProduct, quantity)
        if (!wasAdded) {
          setCartError('Sign in before adding this product to your cart.')
          return
        }
      }
      setAdded(true)
      if (buyNow) navigate('/buyer/checkout')
    } catch (error) {
      setCartError(error.message || 'This product could not be added to your cart.')
    }
  }

  if (productLoading) {
    return <div className="buyer-product-state" role="status">Loading product details…</div>
  }

  if (!product) {
    return (
      <div className="buyer-product-state buyer-product-not-found" role="alert">
        <h1>Product not found</h1>
        <p>{productError || 'This product may have been removed or does not exist.'}</p>
        <Link to="/buyer/products">Browse all products</Link>
      </div>
    )
  }

  const details = product.details || {}
  const specifications = [
    ['Category', product.category],
    ['Unit', product.unit],
    ['SKU', variationCombination?.sku || product.sku],
    ['Brand', details.brand],
    ['Origin', details.originBarangay],
    ['Weight', details.weight ? `${details.weight} ${details.weightUnit || ''}`.trim() : ''],
    ['Packaging', details.packagingType],
    ['Producer', details.producerName],
    ['Production method', details.productionMethod],
    ['Minimum order', details.minimumOrder ? `${details.minimumOrder} ${product.unit}` : '']
  ].filter(([, value]) => value)

  return (
    <div className="buyer-product-details-page">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/buyer/products">Shop All</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/buyer/products?category=${encodeURIComponent(product.category || '')}`}>
          {product.category || 'Products'}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="product-main-layout" aria-label="Product details">
        <div className="product-gallery">
          <div className="product-thumbnails" aria-label="Product images">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={`product-thumbnail ${selectedImage === index ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedImage(index)
                  setIsZoomed(false)
                }}
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={selectedImage === index}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`product-main-image ${isZoomed ? 'is-zoomed' : ''}`}
            onClick={() => setIsZoomed(value => !value)}
            aria-label={isZoomed ? 'Zoom out of product image' : 'Zoom in on product image'}
          >
            {images[selectedImage] && (
              <img src={images[selectedImage]} alt={product.name} />
            )}
            <span className="product-image-zoom-hint">
              <ZoomIn size={15} />
              {isZoomed ? 'Click to zoom out' : 'Click to zoom'}
            </span>
          </button>
        </div>

        <div className="product-purchase-panel">
          <div className="product-eyebrow">{product.category}</div>
          <h1>{product.name}</h1>

          <a className="product-rating-summary" href="#customer-reviews">
            <RatingStars rating={averageRating} />
            <strong>{averageRating ? averageRating.toFixed(1) : 'New'}</strong>
            <span>({reviews.length} reviews)</span>
          </a>

          <div className="product-price-block">
            <strong>
              {quantityVariation && variantPriceRange[0] !== variantPriceRange[1]
                ? `${formatPrice(variantPriceRange[0])}–${formatPrice(variantPriceRange[1])}`
                : formatPrice(quantityVariation ? variantPriceRange[0] : selectedPrice)}
            </strong>
            {!quantityVariation && originalPrice > selectedPrice && (
              <del>{formatPrice(originalPrice)}</del>
            )}
            <span>{product.unit}</span>
          </div>

          <p className="product-short-description">{product.description}</p>

          {selectableVariations.map(group => (
            <fieldset className="product-variation" key={group.name}>
              <legend>
                {group.name}
                <strong>{effectiveVariations[group.name]}</strong>
              </legend>
              <div className="product-variation-options">
                {group.options?.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={effectiveVariations[group.name] === option ? 'is-selected' : ''}
                    onClick={() => setVariation(group.name, option)}
                    aria-pressed={effectiveVariations[group.name] === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          {quantityVariation ? (
            <section className="product-variant-quantity-list">
              <div className="product-variant-list-heading">
                <h2>{quantityVariation.name}</h2>
                <span>Choose quantities for each option</span>
              </div>
              {variantRows.map(row => (
                <div className="product-variant-quantity-row" key={row.key}>
                  <img
                    src={row.image}
                    alt=""
                    className="product-variant-image"
                  />
                  <div className="product-variant-description">
                    <strong>{row.options.at(-1)?.value}</strong>
                    <span>{row.stock > 0 ? `${row.stock} available` : 'Out of stock'}</span>
                    <b>{formatPrice(row.price)}</b>
                  </div>
                  <div className="product-quantity-control product-variant-quantity-control">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.options.at(-1)?.value} quantity`}
                      onClick={() => setVariantQuantities(current => ({
                        ...current,
                        [row.key]: Math.max(0, (current[row.key] || 0) - 1)
                      }))}
                      disabled={row.quantity <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-live="polite">{row.quantity}</output>
                    <button
                      type="button"
                      aria-label={`Increase ${row.options.at(-1)?.value} quantity`}
                      onClick={() => {
                        setVariantQuantities(current => ({
                          ...current,
                          [row.key]: Math.min(row.stock, (current[row.key] || 0) + 1)
                        }))
                        setAdded(false)
                      }}
                      disabled={row.quantity >= row.stock}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <strong className="product-variant-line-total">
                    {formatPrice(row.quantity * row.price)}
                  </strong>
                </div>
              ))}
              <div className="product-variant-summary">
                <span>
                  Total quantity
                  {minimumOrder > 1 && <small>Minimum order: {minimumOrder} {product.unit}</small>}
                </span>
                <strong>{variantUnitCount} {product.unit}</strong>
              </div>
            </section>
          ) : (
            <>
              <div className="product-stock-line">
                <span className={selectedStock > 0 ? 'is-in-stock' : 'is-out-of-stock'}>
                  {selectedStock > 0 ? 'In stock' : 'Out of stock'}
                </span>
                {selectedStock > 0 && <span>{selectedStock} available</span>}
              </div>
              <div className="product-quantity-row">
                <span>Quantity</span>
                <div className="product-quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(value => Math.min(selectedStock, value + 1))}
                    disabled={quantity >= selectedStock}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            className={`product-wishlist ${wishlisted ? 'is-active' : ''}`}
            onClick={() => setWishlisted(value => !value)}
            aria-pressed={wishlisted}
          >
            <Heart size={17} fill={wishlisted ? 'currentColor' : 'none'} />
            {wishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>
          {cartError && <p className="product-cart-error" role="alert">{cartError}</p>}

          <div className="product-policies">
            <div>
              <Truck size={19} />
              <span>
                <strong>Shipping</strong>
                {details.shippingNotes || product.storefront?.shippingPolicy || 'Ships from Sta. Maria, Bulacan. Estimated delivery: 3–5 business days.'}
              </span>
            </div>
            <div>
              <RotateCcw size={19} />
              <span>
                <strong>Returns &amp; refunds</strong>
                {product.storefront?.returnPolicy || 'Contact the seller if your order arrives damaged or differs from its listing. Return eligibility depends on marketplace policy.'}
              </span>
            </div>
            <div>
              <ShieldCheck size={19} />
              <span>
                <strong>Shop with confidence</strong>
                Local seller listing from Sta. Maria, Bulacan.
              </span>
            </div>
          </div>

          <div className="product-seller">
            <span className="product-seller-icon"><Store size={20} /></span>
            <span>
              <small>Sold by</small>
              <strong>{product.seller || 'ALT F4 local seller'}</strong>
              <small><MapPin size={12} />{product.location || 'Sta. Maria, Bulacan'}</small>
            </span>
            <Check size={17} aria-label="Marketplace seller" />
          </div>
        </div>
      </section>

      <section className="product-information-sections" aria-label="More about this product">
        <article className="product-info-card">
          <h2>Detailed product description</h2>
          <p>{product.description}</p>
          {details.productStory && <p>{details.productStory}</p>}
        </article>

        <article className="product-info-card">
          <h2>Product specifications</h2>
          {specifications.length ? (
            <dl className="product-specifications">
              {specifications.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>Product specifications have not been provided by the seller.</p>
          )}
        </article>

        <section className="product-info-card product-reviews-section" id="customer-reviews">
          <div className="product-reviews-header">
            <div>
              <span className="product-section-eyebrow">From the community</span>
              <h2>Customer reviews</h2>
            </div>
            <div className="product-reviews-average">
              <strong>{averageRating ? averageRating.toFixed(1) : '—'}</strong>
              <RatingStars rating={averageRating} />
              <span>{reviews.length} verified {reviews.length === 1 ? 'review' : 'reviews'}</span>
            </div>
          </div>

          {reviewsLoading && <p className="product-review-message" role="status">Loading reviews…</p>}
          {reviewsError && <p className="product-review-message is-error" role="alert">{reviewsError}</p>}

          {!reviewsLoading && !reviewsError && (
            <div className="product-reviews-layout">
              <div className="product-rating-filters" aria-label="Filter reviews by rating">
                <button
                  type="button"
                  className={ratingFilter === 0 ? 'is-active' : ''}
                  onClick={() => setRatingFilter(0)}
                  aria-pressed={ratingFilter === 0}
                >
                  All reviews <span>{reviews.length}</span>
                </button>
                {[5, 4, 3, 2, 1].map(rating => (
                  <button
                    type="button"
                    key={rating}
                    className={ratingFilter === rating ? 'is-active' : ''}
                    onClick={() => setRatingFilter(rating)}
                    aria-pressed={ratingFilter === rating}
                  >
                    <span>{rating} <Star size={13} fill="currentColor" /></span>
                    <span>{reviewCounts[rating]}</span>
                  </button>
                ))}
              </div>

              <div className="product-review-list">
                {visibleReviews.length ? visibleReviews.map(review => (
                  <ProductReview key={review.id} review={review} />
                )) : (
                  <p className="product-review-empty">
                    {reviews.length
                      ? `There are no ${ratingFilter}-star reviews yet.`
                      : 'No customer reviews yet. Be the first to share your experience after your order is delivered.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      {relatedProducts.length > 0 && (
        <section className="product-related-section">
          <div className="product-related-heading">
            <div>
              <span className="product-section-eyebrow">Made for you</span>
              <h2>You may also like</h2>
            </div>
            <Link to="/buyer/products">Shop all <ArrowRight size={15} /></Link>
          </div>
          <div className="product-related-grid">
            {relatedProducts.map(related => (
              <Link
                className="product-related-card"
                key={related.id}
                to={`/buyer/products/${related.id}`}
              >
                <img src={related.images?.[0]} alt={related.name} />
                <span>{related.category}</span>
                <strong>{related.name}</strong>
                <span className="product-related-price">{formatPrice(related.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="product-purchase-dock">
        <div className="product-purchase-dock-summary">
          <span>
            {quantityVariation ? 'Selected items' : 'Quantity'}
            <small>
              {purchaseQuantity} {product.unit}
              {minimumOrder > 1 ? ` · minimum ${minimumOrder}` : ''}
            </small>
          </span>
          <strong>{formatPrice(purchaseSubtotal)}</strong>
        </div>
        <div className="product-purchase-dock-actions">
          <button
            type="button"
            className="product-add-to-cart"
            onClick={() => handlePurchase(false)}
            disabled={quantityVariation ? variantUnitCount < 1 : selectedStock < 1}
          >
            <ShoppingCart size={17} />
            {added ? 'Added to Cart' : 'Add to Cart'}
          </button>
          <button
            type="button"
            className="product-buy-now"
            onClick={() => handlePurchase(true)}
            disabled={quantityVariation ? variantUnitCount < 1 : selectedStock < 1}
          >
            <ShoppingBag size={17} />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  )
}
