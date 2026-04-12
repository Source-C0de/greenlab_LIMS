import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { mockNotifications, AppNotification } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, "id" | "date" | "read">) => void;
  deleteNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentRole } = useAppContext();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    // In a real app we'd fetch this from via react-query, but for now we load mock data
    setAllNotifications(mockNotifications);
  }, []);

  const notifications = useMemo(() => {
    return allNotifications.filter((n) => !n.roles || n.roles.includes(currentRole));
  }, [allNotifications, currentRole]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const visibleIds = new Set(notifications.map(n => n.id));
    setAllNotifications((prev) => prev.map((n) => visibleIds.has(n.id) ? { ...n, read: true } : n));
  };

  const addNotification = (notification: Omit<AppNotification, "id" | "date" | "read">) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      date: new Date().toISOString(),
      read: false,
    };
    setAllNotifications((prev) => [newNotification, ...prev]);
  };
  
  const deleteNotification = (id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        addNotification,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
