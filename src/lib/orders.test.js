import { describe, it, expect } from 'vitest'
import { groupOrders, ordersToIncomeCSV } from './orders'

function makeOrder(overrides) {
  return {
    id: 'order-1',
    cartId: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeIncomeOrder(overrides) {
  return {
    status: 'completed',
    createdAt: '2026-01-01T00:00:00Z',
    listingTitle: 'Chicken tamales',
    buyerName: 'A neighbor',
    quantity: 1,
    priceAtOrder: 5,
    ...overrides,
  }
}

describe('groupOrders', () => {
  it('puts a single-item order in its own group keyed by its own id', () => {
    const order = makeOrder({ id: 'a' })
    const groups = groupOrders([order])
    expect(groups).toHaveLength(1)
    expect(groups[0].groupId).toBe('a')
    expect(groups[0].cartId).toBeNull()
    expect(groups[0].orders).toEqual([order])
  })

  it('collapses multiple rows sharing a cartId into one group', () => {
    const a = makeOrder({ id: 'a', cartId: 'cart-1' })
    const b = makeOrder({ id: 'b', cartId: 'cart-1' })
    const groups = groupOrders([a, b])
    expect(groups).toHaveLength(1)
    expect(groups[0].groupId).toBe('cart-1')
    expect(groups[0].orders).toEqual([a, b])
  })

  it('keeps orders from different carts in separate groups', () => {
    const a = makeOrder({ id: 'a', cartId: 'cart-1' })
    const b = makeOrder({ id: 'b', cartId: 'cart-2' })
    const groups = groupOrders([a, b])
    expect(groups).toHaveLength(2)
  })

  it('sorts groups newest-first by their first order', () => {
    const older = makeOrder({ id: 'a', createdAt: '2026-01-01T00:00:00Z' })
    const newer = makeOrder({ id: 'b', createdAt: '2026-01-02T00:00:00Z' })
    const groups = groupOrders([older, newer])
    expect(groups.map((g) => g.groupId)).toEqual(['b', 'a'])
  })
})

describe('ordersToIncomeCSV', () => {
  it('excludes anything that is not completed', () => {
    const csv = ordersToIncomeCSV([makeIncomeOrder({ status: 'pending' })])
    expect(csv).toBe('Date,Item,Buyer,Quantity,Price,Total\n,,,,Grand total,0.00')
  })

  it('computes a row total from quantity times price, and a grand total across rows', () => {
    const csv = ordersToIncomeCSV([
      makeIncomeOrder({ quantity: 2, priceAtOrder: 10 }),
      makeIncomeOrder({ quantity: 1, priceAtOrder: 6 }),
    ])
    const lines = csv.split('\n')
    expect(lines[1]).toContain('2,10.00,20.00')
    expect(lines[2]).toContain('1,6.00,6.00')
    expect(lines[3]).toBe(',,,,Grand total,26.00')
  })

  it('sorts rows oldest first', () => {
    const csv = ordersToIncomeCSV([
      makeIncomeOrder({ listingTitle: 'Newer dish', createdAt: '2026-01-02T00:00:00Z' }),
      makeIncomeOrder({ listingTitle: 'Older dish', createdAt: '2026-01-01T00:00:00Z' }),
    ])
    const lines = csv.split('\n')
    expect(lines[1]).toContain('Older dish')
    expect(lines[2]).toContain('Newer dish')
  })

  it('quotes a field that contains a comma', () => {
    const csv = ordersToIncomeCSV([makeIncomeOrder({ listingTitle: 'Rice, beans, and plantains' })])
    expect(csv).toContain('"Rice, beans, and plantains"')
  })
})
