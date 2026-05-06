'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/app/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  titre: string
  message: string
  lien?: string | null
  lu: boolean
  createdAt: Date
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = async () => {
    const data = await getNotifications()
    setNotifications(data as Notification[])
    const count = await getUnreadCount()
    setUnreadCount(count)
  }

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        const data = await getNotifications()
        if (mounted) setNotifications(data as any[])
        const count = await getUnreadCount()
        if (mounted) setUnreadCount(count)
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }

    loadData()
    
    const interval = setInterval(loadData, 10000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    fetchNotifications()
  }

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.lu) {
      await markAsRead(notif.id)
      fetchNotifications()
    }
    
    if (notif.lien) {
      setIsOpen(false)
      router.push(notif.lien)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                      !notif.lu ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm ${!notif.lu ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                        {notif.titre}
                      </p>
                      {!notif.lu && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>}
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
