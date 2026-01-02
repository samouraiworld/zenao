interface RoleBasedViewModeProps<T extends string[]> {
  roles: T;
  allowedRoles: T;
  fallback?: React.ReactNode | null;
  children: React.ReactNode | null;
}

export default function RoleBasedViewMode<T extends string[]>({
  roles,
  allowedRoles,
  fallback = null,
  children,
}: RoleBasedViewModeProps<T>) {
  const isAllowed = roles.some((role) => allowedRoles.includes(role));

  if (isAllowed) {
    return <>{children}</>;
  }

  return fallback;
}
