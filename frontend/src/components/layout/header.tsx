'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, LogOut, User, Settings, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SessionsDialog } from '@/components/auth/sessions-dialog';

/**
 * Header Component
 *
 * Best Practices:
 * - User profile dropdown
 * - Notifications indicator
 * - Logout functionality
 * - Responsive design
 * - Accessible menu items
 */

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isSessionsDialogOpen, setIsSessionsDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.firstName || !user?.lastName) return 'U';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  // Format user role for display
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <header className="fixed top-0 right-0 z-20 h-16 w-[calc(100%-16rem)] border-b bg-background px-6">
      <div className="flex h-full items-center justify-between">
        {/* Page Title / Breadcrumb - Can be enhanced later */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">
            {user?.company?.name || 'Property Management'}
          </h1>
          <Badge variant="secondary">{user?.role ? formatRole(user.role) : 'User'}</Badge>
        </div>

        {/* Right Section - Notifications & User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {/* Notification badge - can be made dynamic */}
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={undefined} alt={user?.firstName || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSessionsDialogOpen(true)}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Active Sessions</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sessions Dialog */}
      <SessionsDialog
        open={isSessionsDialogOpen}
        onOpenChange={setIsSessionsDialogOpen}
      />
    </header>
  );
}
