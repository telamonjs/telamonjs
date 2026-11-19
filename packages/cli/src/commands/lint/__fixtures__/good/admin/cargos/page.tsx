import { redirect } from 'next/navigation'

export default function CargosPage() {
  redirect('/admin/administracao?tab=cargos')
}
