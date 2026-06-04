import { EditarArtigoClient } from './EditarArtigoClient'

export default function EditarArtigoPage({ params }: { params: { id: string } }) {
  return <EditarArtigoClient id={params.id} />
}
