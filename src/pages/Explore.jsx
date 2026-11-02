import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { ProductCard, ShopCard } from '../components/Cards'
import { Empty, Spinner, Tabs } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { CATEGORIES, debounce } from '../lib/utils'

const clean = (s) => s.replace(/[%,()*\\]/g, ' ').trim()

export default function Explore() {
  const [sp, setSp] = useSearchParams()
  const type = sp.get('type') === 'products' ? 'products' : 'shops'
  const q = sp.get('q') || ''
  const category = sp.get('category') || ''
  const city = sp.get('city') || ''
  const rating = Number(sp.get('rating') || 0)
  const sort = sp.get('sort') || 'popular'
  const minP = sp.get('min') || ''
  const maxP = sp.get('max') || ''

  const [text, setText] = useState(q)
  const [state, setState] = useState({ loading: true, rows: [], error: '' })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const setParam = (k, v) => {
    const n = new URLSearchParams(sp)
    if (v === '' || v == null || v === 0) n.delete(k)
    else n.set(k, String(v))
    setSp(n, { replace: true })
  }

  const pushText = useMemo(() => debounce((v) => setParam('q', v), 350), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pushText.cancel(), [pushText])
  useEffect(() => setText(q), [q])

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    ;(async () => {
      const term = clean(q)
      let res
      if (type === 'shops') {
        let qb = supabase.from('shops').select('*').eq('published', true)
        if (term) qb = qb.or(`name.ilike.%${term}%,category.ilike.%${term}%,city.ilike.%${term}%`)
        if (category) qb = qb.eq('category', category)
        if (city) qb = qb.ilike('city', `%${clean(city)}%`)
        if (rating > 0) qb = qb.gte('rating_avg', rating).gt('rating_count', 0)
        if (sort === 'new') qb = qb.order('created_at', { ascending: false })
        else if (sort === 'rating') qb = qb.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false })
        else qb = qb.order('featured', { ascending: false }).order('visit_count', { ascending: false })
        res = await qb.limit(60)
      } else {
        let qb = supabase
          .from('products')
          .select('*, shops!inner(id,slug,name,city,config,published,rating_avg)')
          .eq('active', true)
          .eq('shops.published', true)
        if (term) qb = qb.or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
        if (category) qb = qb.eq('shops.category', category)
        if (city) qb = qb.ilike('shops.city', `%${clean(city)}%`)
        if (rating > 0) qb = qb.gte('shops.rating_avg', rating)
        if (minP !== '' && Number(minP) >= 0) qb = qb.gte('price', Number(minP))
        if (maxP !== '' && Number(maxP) > 0) qb = qb.lte('price', Number(maxP))
        if (sort === 'price_asc') qb = qb.order('price', { ascending: true, nullsFirst: false })
        else if (sort === 'price_desc') qb = qb.order('price', { ascending: false, nullsFirst: false })
        else qb = qb.order('created_at', { ascending: false })
        res = await qb.limit(60)
      }
      if (!alive) return
      setState({ loading: false, rows: res.data || [], error: res.error ? errText(res.error) : '' })
    })()
    return () => {
      alive = false
    }
  }, [type, q, category, city, rating, sort, minP, maxP])

  const activeFilters = [category, city, rating ? 'r' : '', minP, maxP].filter(Boolean).length
  const clear = () => setSp(type === 'products' ? { type: 'products' } : {}, { replace: true })

  return (
    <div className="container page">
      <h1 className="page-title">Explore</h1>

      <div className="explore-bar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              pushText(e.target.value)
            }}
            placeholder={type === 'shops' ? 'Search shops, categories or cities' : 'Search products and services'}
            aria-label="Search"
          />
          {text && (
            <button type="button" className="btn btn-icon btn-ghost" aria-label="Clear search" onClick={() => { setText(''); setParam('q', '') }}>
              <Icon name="x" size={16} />
            </button>
          )}
        </label>
        <button type="button" className="btn btn-ghost filter-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <Icon name="filter" size={18} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
        </button>
      </div>

      <div className="explore-tabs">
        <Tabs
          value={type}
          onChange={(v) => setParam('type', v === 'products' ? 'products' : '')}
          tabs={[
            { value: 'shops', label: 'Shops' },
            { value: 'products', label: 'Products and services' },
          ]}
        />
      </div>

      <div className={`filters ${filtersOpen ? 'is-open' : ''}`}>
        <label className="field">
          <span className="label">Category</span>
          <select className="select" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Location (city)</span>
          <input className="input" value={city} onChange={(e) => setParam('city', e.target.value)} placeholder="e.g. Mumbai" />
        </label>
        <label className="field">
          <span className="label">Minimum rating</span>
          <select className="select" value={rating} onChange={(e) => setParam('rating', e.target.value)}>
            <option value={0}>Any rating</option>
            <option value={3}>3 stars and up</option>
            <option value={4}>4 stars and up</option>
            <option value={4.5}>4.5 stars and up</option>
          </select>
        </label>
        {type === 'products' && (
          <div className="field">
            <span className="label">Price range</span>
            <div className="row tight">
              <input className="input" type="number" min="0" inputMode="decimal" placeholder="Min" value={minP} onChange={(e) => setParam('min', e.target.value)} aria-label="Minimum price" />
              <input className="input" type="number" min="0" inputMode="decimal" placeholder="Max" value={maxP} onChange={(e) => setParam('max', e.target.value)} aria-label="Maximum price" />
            </div>
          </div>
        )}
        <label className="field">
          <span className="label">Sort by</span>
          <select className="select" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
            {type === 'shops' ? (
              <>
                <option value="popular">Most popular</option>
                <option value="rating">Top rated</option>
                <option value="new">Newest</option>
              </>
            ) : (
              <>
                <option value="popular">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </>
            )}
          </select>
        </label>
        {activeFilters > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>

      {state.loading ? (
        <div className="page-loader">
          <Spinner size={28} />
        </div>
      ) : state.error ? (
        <Empty icon="shield" title="Could not load results" text={state.error} />
      ) : state.rows.length === 0 ? (
        <Empty
          icon="search"
          title="Nothing found"
          text="Try a different word, or remove some filters."
          action={
            <button type="button" className="btn btn-primary" onClick={clear}>
              Reset search
            </button>
          }
        />
      ) : type === 'shops' ? (
        <div className="grid-shops">
          {state.rows.map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
        </div>
      ) : (
        <div className="grid-products">
          {state.rows.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              currency={p.shops?.config?.currency || 'INR'}
              shopName={p.shops?.name}
              to={`/shop/${p.shops?.slug}/product/${p.id}`}
            />
          ))}
        </div>
      )}
      <p className="hint center">
        Own a business? <Link to="/auth?mode=register&role=seller">Create your free shop</Link>
      </p>
    </div>
  )
}
