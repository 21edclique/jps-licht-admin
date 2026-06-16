import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/store'

// En desarrollo: usa proxy de Vite (cadena vacía = relativo)
// En producción: usa la URL completa de Heroku
const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://jps-licht-api-8cf7a7a0c996.herokuapp.com'
let socketInstance = null

export const useSocket = (eventHandlers = {}) => {
  const { token } = useAuthStore()
  const handlersRef = useRef(eventHandlers)

  useEffect(() => {
    handlersRef.current = eventHandlers
  })

  useEffect(() => {
    if (!token) return

    if (!socketInstance || !socketInstance.connected) {
      if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
      }
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      })

      socketInstance.on('connect', () =>
        console.log('🔌 Socket conectado:', socketInstance.id))
      socketInstance.on('disconnect', (reason) =>
        console.log('🔌 Socket desconectado:', reason))
      socketInstance.on('connect_error', (err) =>
        console.error('🔌 Socket error:', err.message))
    }

    const socket = socketInstance
    const wrappedHandlers = {}
    Object.keys(handlersRef.current).forEach(event => {
      wrappedHandlers[event] = (...args) => handlersRef.current[event]?.(...args)
      socket.on(event, wrappedHandlers[event])
    })

    return () => {
      Object.keys(wrappedHandlers).forEach(event => {
        socket.off(event, wrappedHandlers[event])
      })
    }
  }, [token])

  return socketInstance
}