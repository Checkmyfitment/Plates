import { describe, it, expect } from 'vitest'
import { groupOrders } from './orders'

function makeOrder(overrides) {
  return {
    id: 'order-1',
    cartId: null,
    createdAt: '2026-01-01T00:00:00Z',
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
