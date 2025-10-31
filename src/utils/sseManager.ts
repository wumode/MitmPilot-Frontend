import { useAuthStore } from '@/stores'
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'

/**
 * SSE连接管理器
 * 使用 @microsoft/fetch-event-source 替代原生 EventSource 以支持认证
 */
export class SSEManager {
  private url: string
  private listeners: Map<string, (event: EventSourceMessage) => void> = new Map()
  private abortController: AbortController | null = null
  private isConnecting = false
  private reconnectTimer: number | null = null
  private options: {
    reconnectDelay: number
    maxReconnectAttempts: number
  }

  constructor(url: string, options: Partial<typeof SSEManager.prototype.options> = {}) {
    this.url = url
    this.options = {
      reconnectDelay: 3000,
      maxReconnectAttempts: 3,
      ...options,
    }
  }

  private connect() {
    if (this.isConnecting || this.abortController) {
      return
    }

    this.isConnecting = true
    this.abortController = new AbortController()

    const authStore = useAuthStore()
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    fetchEventSource(this.url, {
      signal: this.abortController.signal,
      headers,
      onopen: async response => {
        this.isConnecting = false
        if (!response.ok) {
          this.handleError(new Error(`Failed to connect: ${response.status} ${response.statusText}`))
        }
      },
      onmessage: event => {
        this.listeners.forEach(listener => {
          listener(event)
        })
      },
      onclose: () => {
        this.isConnecting = false
      },
      onerror: err => {
        this.isConnecting = false
        this.handleError(err)
        // fetchEventSource has its own retry mechanism, but we might want to stop it
        // if the error is something like a 401, to prevent infinite loops.
        // For now, we'll re-throw the error to use its default retry logic.
        throw err
      },
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('SSE fetchEventSource failed:', err)
      }
    })
  }

  private handleError(error: Error) {
    console.error('SSE Error:', error)
    this.close() // Stop the connection on error
  }

  addMessageListener(id: string, listener: (event: EventSourceMessage) => void) {
    this.listeners.set(id, listener)
    if (!this.abortController) {
      this.connect()
    }
  }

  removeMessageListener(id: string) {
    this.listeners.delete(id)
    if (this.listeners.size === 0) {
      this.close()
    }
  }

  close() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.isConnecting = false
  }

  forceReconnect() {
    this.close()
    if (this.listeners.size > 0) {
      this.connect()
    }
  }

  get hasActiveListeners(): boolean {
    return this.listeners.size > 0
  }
}

/**
 * SSE管理器单例
 */
class SSEManagerSingleton {
  private managers: Map<string, SSEManager> = new Map()

  getManager(url: string, options?: ConstructorParameters<typeof SSEManager>[1]): SSEManager {
    const managerKey = url
    if (!this.managers.has(managerKey)) {
      this.managers.set(managerKey, new SSEManager(url, options))
    }
    return this.managers.get(managerKey)!
  }

  getIndependentManager(
    url: string,
    listenerId: string,
    options?: ConstructorParameters<typeof SSEManager>[1],
  ): SSEManager {
    const managerKey = `${url}::${listenerId}`
    if (!this.managers.has(managerKey)) {
      this.managers.set(managerKey, new SSEManager(url, options))
    }
    return this.managers.get(managerKey)!
  }

  closeManager(url: string) {
    const manager = this.managers.get(url)
    if (manager) {
      manager.close()
      this.managers.delete(url)
    }
  }

  closeAllManagers() {
    this.managers.forEach(manager => manager.close())
    this.managers.clear()
  }
}

export const sseManagerSingleton = new SSEManagerSingleton()
