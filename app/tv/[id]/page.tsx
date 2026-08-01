import { showDetails } from '@/lib/tmdb';

const DetailedShowPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const show = await showDetails(Number(id));

  console.log(show);

  return (
    <main>
      <h2>Detailed Show</h2>
    </main>
  );
};

export default DetailedShowPage;
