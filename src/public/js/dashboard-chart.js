// Desenha o gráfico do painel. Só apresentação: os números já vêm calculados pelo servidor.
(function () {
  var canvas = document.getElementById('grafico-movimentacoes');
  var source = document.getElementById('dados-grafico');
  // Sem Chart.js (CDN indisponível), o painel continua com os totais em texto.
  if (!canvas || !source || typeof window.Chart === 'undefined') return;

  var data = JSON.parse(source.textContent || '{}');
  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Entradas', data: data.entries, backgroundColor: '#2e7d4f' },
        { label: 'Saídas', data: data.exits, backgroundColor: '#c0392b' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
})();
