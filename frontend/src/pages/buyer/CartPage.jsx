import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '../../context/useCart'
import '../../styles/buyer/buyer-cart.css'

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart()
  const shippingFee = [...new Map(items.map(item => [item.sellerId ?? 'sample', Number(item.shippingFee ?? 60)])).values()]
    .reduce((total, fee) => total + fee, 0)

  return (
    <section className="buyer-cart-page">
      <div className="buyer-cart-heading">
        <span className="buyer-eyebrow">YOUR ALT F4 ORDER</span>
        <h1>Shopping Cart</h1>
        <p>Review your local marketplace finds before checkout.</p>
      </div>

      {items.length === 0 ? (
        <div className="buyer-cart-empty">
          <ShoppingBag size={36} />
          <h2>Your cart is empty</h2>
          <p>Browse local products and add something you love.</p>
          <Link to="/buyer/products" className="buyer-cart-primary">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="buyer-cart-layout">
          <div className="buyer-cart-items">
            <div className="buyer-cart-list-heading">
              <strong>{items.length} {items.length === 1 ? 'item' : 'items'}</strong>
              <button type="button" onClick={clearCart}>Clear cart</button>
            </div>

            {items.map(item => (
              <article className="buyer-cart-item" key={item.cartKey || item.id}>
                <img src={item.image} alt={item.name} />

                <div className="buyer-cart-item-details">
                  <span>{item.category}</span>
                  <h2>{item.name}</h2>
                  <p>{item.seller}</p>
                  {item.selectedVariations?.map(variation => <small key={variation.name}>{variation.name}: {variation.value}</small>)}
                  <strong>₱{item.price.toLocaleString('en-PH')}</strong>
                </div>

                <div className="buyer-cart-item-actions">
                  <div className="buyer-cart-quantity" aria-label={`Quantity for ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartKey || `${item.id}:[]`, item.quantity - 1)}
                      disabled={item.quantity <= (item.minOrder || 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartKey || `${item.id}:[]`, item.quantity + 1)}
                      disabled={item.quantity >= Math.min(item.stock, item.maxOrder || item.stock)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <strong className="buyer-cart-line-total">
                    ₱{(item.price * item.quantity).toLocaleString('en-PH')}
                  </strong>
                  <button
                    type="button"
                    className="buyer-cart-remove"
                    onClick={() => removeItem(item.cartKey || `${item.id}:[]`)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}

            <Link to="/buyer/products" className="buyer-cart-continue">
              Continue shopping
            </Link>
          </div>

          <aside className="buyer-cart-summary">
            <h2>Order summary</h2>
            <div>
              <span>Subtotal</span>
              <strong>₱{subtotal.toLocaleString('en-PH')}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>₱{shippingFee.toLocaleString('en-PH')}</strong>
            </div>
            <div className="buyer-cart-grand-total">
              <span>Estimated total</span>
              <strong>₱{(subtotal + shippingFee).toLocaleString('en-PH')}</strong>
            </div>
            <p>Shipping fees are set per seller. Pay by cash on delivery.</p>
            <Link to="/buyer/checkout" className="buyer-cart-checkout">
              Continue to checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}
