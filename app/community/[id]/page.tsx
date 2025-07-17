type PageProps = {
  params: Promise<{ id: string }>;
};

async function CommunityPage({ params: _ }: PageProps) {
  return <div>Page</div>;
}

export default CommunityPage;
