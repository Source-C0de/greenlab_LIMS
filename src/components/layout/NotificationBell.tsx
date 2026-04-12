import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";
import { useNotifications } from "@/context/NotificationContext";
import { Link } from "wouter";
import { AppNotification } from "@/mock-data";

export function NotificationBell() {
  const { language } = useAppContext();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const isRtl = language === "ar";
  
  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {isRtl ? "الإشعارات" : "Notifications"}
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 mt-0.5 text-xs">
                {unreadCount} {isRtl ? "جديد" : "New"}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {isRtl ? "تحديد الكل كمقروء" : "Mark all as read"}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isRtl ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="relative">
                {notification.link ? (
                  <Link href={notification.link} className="block">
                    <NotificationItem 
                      notification={notification} 
                      isRtl={isRtl} 
                      onClick={() => markAsRead(notification.id)} 
                    />
                  </Link>
                ) : (
                  <NotificationItem 
                    notification={notification} 
                    isRtl={isRtl} 
                    onClick={() => markAsRead(notification.id)} 
                  />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  function NotificationItem({ notification, isRtl, onClick }: { notification: AppNotification, isRtl: boolean, onClick: () => void }) {
    return (
      <DropdownMenuItem 
        className={`flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50 ${!notification.read ? 'bg-muted/20' : ''}`}
        onClick={onClick}
      >
        <div className="mt-0.5 shrink-0">
          {getIcon(notification.type)}
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-none ${!notification.read ? '' : 'text-muted-foreground'}`}>
              {isRtl ? notification.titleAr : notification.title}
            </p>
            {!notification.read && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"></span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {isRtl ? notification.messageAr : notification.message}
          </p>
          <div className="flex items-center text-[10px] text-muted-foreground pt-1">
            <Clock className="w-3 h-3 mr-1" />
            {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
          </div>
        </div>
      </DropdownMenuItem>
    );
  }
}
