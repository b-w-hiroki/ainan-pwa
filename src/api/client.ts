import {
  type DemoOrder,
  type ExchangeRequest,
  advanceOrder,
  cancelOrder,
  executeExchange,
  validateExchangeRequest,
} from '../lib/demoApi'

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export const apiClient = {
  async validateExchange(req: ExchangeRequest): Promise<{ ok: true } | { ok: false; message: string }> {
    await wait(80)
    const error = validateExchangeRequest(req)
    if (error) return { ok: false, message: error }
    return { ok: true }
  },

  async createExchangeOrder(req: ExchangeRequest): Promise<DemoOrder> {
    await wait(120)
    return executeExchange(req)
  },

  async advanceOrderStatus(order: DemoOrder): Promise<DemoOrder> {
    await wait(60)
    return advanceOrder(order)
  },

  async cancelOrder(order: DemoOrder): Promise<DemoOrder | null> {
    await wait(80)
    return cancelOrder(order)
  },
}
