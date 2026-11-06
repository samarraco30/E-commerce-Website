
import { Heart, ShoppingCart, Star } from 'lucide-react'

export default function ProductCard({
  product,
  wishlist = [],
  onToggleWishlist,
  onQuickView
}) {
  const isWishlisted = wishlist.includes(product.id)

  return (
    <article
      className="buyer-product-card buyer-clickable-product"
      onClick={() => onQuickView?.(product)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onQuickView?.(product)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}`}
    >
      <div className="buyer-product-image">
        <img src={product.images[0]} alt={product.name} />

        <span className="buyer-product-tag">
          {product.tag}
        </span>

        <button
          className={`buyer-wishlist-button ${
            isWishlisted ? 'liked' : ''
          }`}
          onClick={event => {
            event.stopPropagation()
            onToggleWishlist?.(product.id)
          }}
          aria-label={
            isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
          }
        >
          <Heart
            size={19}
            fill={isWishlisted ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      <div className="buyer-product-info">
        <span className="buyer-product-category">
          {product.category}
        </span>

        <h3 className="buyer-product-title">
          {product.name}
        </h3>

        <p className="buyer-product-seller">
          {product.seller}
        </p>

        <div className="buyer-product-rating">
          <Star size={14} fill="currentColor" />
          {product.rating}
          <span>({product.reviews} reviews)</span>
        </div>

        <div className="buyer-product-bottom">
          <div>
            <strong>
              ₱{product.price.toLocaleString('en-PH')}
            </strong>
            <small>{product.unit}</small>
          </div>

          <button
            className="buyer-add-cart"
            onClick={event => {
              event.stopPropagation()
              onQuickView?.(product)
            }}
            aria-label={`View ${product.name} purchase options`}
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}
