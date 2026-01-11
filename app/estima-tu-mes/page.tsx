import EstimaTuMesClient from './EstimaTuMesClient';

export const metadata = {
  title: 'Estimá tu mes en 30 segundos | Mi Admi',
  description: 'Respondé 5 preguntas y obtené una estimación orientativa de gastos y saldo mensual en Uruguay.',
};

export default function EstimaTuMesPage() {
  return <EstimaTuMesClient />;
}
