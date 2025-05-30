function EventCardListLayout({
  children,
}: {
  children: React.ReactNode | React.ReactNode[];
}) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {children}
    </div>
  );
}

export default EventCardListLayout;
