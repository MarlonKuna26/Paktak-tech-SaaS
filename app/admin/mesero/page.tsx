import { redirect } from 'next/navigation';

export default async function WaiterPage(props: {
  searchParams?: Promise<{ tableId?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const query = searchParams.tableId
    ? `?tableId=${searchParams.tableId}&view=comandero`
    : '?view=comandero';

  redirect(`/admin/mesas${query}`);
}
