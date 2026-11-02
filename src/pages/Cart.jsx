import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { Empty } from '../components/ui'
import { useCart } from '../state/cart'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'
import { formatPrice } from '../lib/utils'

export default function Cart() {
  const cart = useCart()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const currency = cart.shop?.currency || 'INR'

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <Empty
          icon="cart"
          title="Your cart is empty"
          text="Browse shops and add something you like."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore shops
            </Link>
          }
        />
      </div>
    )
  }

  const checkout = () => {
    if (!user) {
      toast.info('Log in or create a free buyer account to place your order.')
      navigate('/auth?mode=login&role=buyer&next=/checkout')
      return
    }
    if (profile && profile.role !== 'buyer') {
      toast.error('Seller accounts cannot place orders. Please use a buyer account.')
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="container page narrow">
      <h1 className="page-title">Your cart</h1>
      <p className="muted">
        From <Link to={`/shop/${cart.shop.slug}`}>{cart.shop.name}</Link>
      </p>
      <div className="card stack">
        {cart.items.map((i) => (
          <div key={i.key} className="cart-row">
            <div className="cart-img">{i.image ? <img src={i.image} alt="" /> : <Icon name="image" />}</div>
            <div className="cart-info">
              <strong>{i.name}</strong>
              {i.variation && <small className="muted">{i.variation}</small>}
              <small className="muted">{formatPrice(i.price, currency)} each</small>
            </div>
            <div className="qty">
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => cart.setQty(i.key, i.qty - 1)} aria-label="Decrease">
                <Icon name="minus" size={16} />
              </button>
              <span>{i.qty}</span>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => cart.setQty(i.key, i.qty + 1)} aria-label="Increase">
                <Icon name="plus" size={16} />
              </button>
            </div>
            <strong className="cart-line">{formatPrice(i.price * i.qty, currency)}</strong>
            <button type="button" className="btn btn-icon btn-ghost" onClick={() => cart.remove(i.key)} aria-label={`Remove ${i.name}`}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        <div className="cart-total">
          <span>Total</span>
          <strong>{formatPrice(cart.total, currency)}</strong>
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-accent btn-lg grow" onClick={checkout}>
            Continue to checkout
          </button>
          <button type="button" className="btn btn-ghost" onClick={cart.clear}>
            Empty cart
          </button>
        </div>
      </div>
    </div>
  )
}
