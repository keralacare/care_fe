import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Avatar } from "@/components/Common/Avatar";

import routes from "@/Utils/request/api";
import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import { OrganizationUser } from "@/types/organisation/organisation";

interface Props {
  organizationId: string;
  user: OrganizationUser;
  trigger?: React.ReactNode;
}

export default function EditUserRoleSheet({
  organizationId,
  user,
  trigger,
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(user.role.id);

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: query(routes.role.list),
  });

  const { mutate: updateRole } = useMutation({
    mutationFn: (body: { user: string; role: string }) =>
      mutate(routes.organisation.assignUser, {
        pathParams: { id: organizationId },
        body,
      })(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizationUsers", organizationId],
      });
      toast.success("User role updated successfully");
      setOpen(false);
    },
    onError: (error) => {
      const errorData = error.cause as { errors: { msg: string[] } };
      errorData.errors.msg.forEach((er) => {
        toast.error(er);
      });
    },
  });

  const handleUpdateRole = () => {
    if (selectedRole === user.role.id) {
      toast.error("Please select a different role");
      return;
    }

    updateRole({
      user: user.user.id,
      role: selectedRole,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || <Button variant="outline">Edit Role</Button>}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit User Role</SheetTitle>
          <SheetDescription>
            Update the role for this user in the organization.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar
                name={`${user.user.first_name} ${user.user.last_name}`}
                className="h-12 w-12"
              />
              <div className="flex flex-col flex-1">
                <span className="font-medium text-lg">
                  {user.user.first_name} {user.user.last_name}
                </span>
                <span className="text-sm text-gray-500">{user.user.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <span className="text-sm text-gray-500">Username</span>
                <p className="text-sm font-medium">{user.user.username}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Current Role</span>
                <p className="text-sm font-medium">{user.role.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Login</span>
                <p className="text-sm font-medium">
                  {user.user.last_login
                    ? new Date(user.user.last_login).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.results?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex flex-col">
                      <span>{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-gray-500">
                          {role.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleUpdateRole}
            disabled={selectedRole === user.role.id}
          >
            Update Role
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
