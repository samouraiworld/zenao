interface RoleBasedEditViewModeProps<T extends string[]> {
  roles: T;
  allowedRoles: T;
  view: React.ReactNode | null;
  edit: React.ReactNode | null;
}

export default function RoleBasedEditViewMode<T extends string[]>({
  roles,
  allowedRoles,
  view,
  edit,
}: RoleBasedEditViewModeProps<T>) {
  const isAllowed = roles.some((role) => allowedRoles.includes(role));

  if (isAllowed) {
    return <>{edit}</>;
  }

  return <>{view}</>;
}
