import cron from 'node-cron';
import { calcularAtrasos } from './jobs/calcular-atrasos';

console.log('🛠️  Worker iniciado');

cron.schedule('5 0 * * *', async () => {
  console.log('▶️  Executando: calcular-atrasos');
  try {
    await calcularAtrasos();
    console.log('✅ calcular-atrasos finalizado');
  } catch (err) {
    console.error('❌ Erro em calcular-atrasos:', err);
  }
});

process.on('SIGINT', () => {
  console.log('Worker encerrado');
  process.exit(0);
});
