import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield, UserCog } from "lucide-react";
import { Header } from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type UserWithRoles = {
  id: string;
  email: string;
  roles: AppRole[];
};

const AVAILABLE_ROLES: AppRole[] = ["admin", "faculty", "employer", "student", "pending_faculty", "pending_employer"];

export default function RoleManagement() {
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.href = "/";
      return;
    }

    if (isAdmin) {
      fetchUsersWithRoles();
      setupRealtimeSubscription();
    }
  }, [isAdmin, loading]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("role-management-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          fetchUsersWithRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsersWithRoles = async () => {
    try {
      setIsLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .order("email");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        roles: (userRoles || [])
          .filter((ur) => ur.user_id === profile.id)
          .map((ur) => ur.role),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase.rpc("admin_assign_role", {
        _user_id: userId,
        _role: role,
      });

      if (error) throw error;

      toast.success(`Role "${role}" assigned successfully`);
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast.error(error.message || "Failed to assign role");
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase.rpc("admin_remove_role", {
        _user_id: userId,
        _role: role,
      });

      if (error) throw error;

      toast.success(`Role "${role}" removed successfully`);
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast.error(error.message || "Failed to remove role");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Role Management</h1>
          </div>
          <p className="text-muted-foreground">
            Assign and manage user roles across the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Users & Roles
            </CardTitle>
            <CardDescription>
              View all users and manage their role assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead>Assign Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No roles</span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="gap-1">
                              {role}
                              <button
                                onClick={() => removeRole(user.id, role)}
                                className="ml-1 hover:text-destructive"
                                aria-label={`Remove ${role} role`}
                              >
                                ×
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select onValueChange={(role) => assignRole(user.id, role as AppRole)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ROLES.filter(
                            (role) => !user.roles.includes(role)
                          ).map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
