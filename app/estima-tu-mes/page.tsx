import EstimaTuMesClient from './EstimaTuMesClient';

import { createSeoMetadata } from '../../lib/seo';

export const metadata = createSeoMetadata({
  title: 'Estimá tus gastos del mes',
  description: 'Respondé preguntas simples y obtené una estimación gratuita de tus gastos, ahorro y saldo mensual en Uruguay.',
  path: '/estima-tu-mes',
  keywords: ['estimador de gastos mensuales', 'calculadora de presupuesto Uruguay'],
});

export default function EstimaTuMesPage() {
  return <EstimaTuMesClient />;
}
