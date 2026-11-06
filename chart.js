/* Minimal canvas line chart — no frameworks */
window.DeskChart = {
  draw(canvas, candles, opts) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!candles || candles.length < 2) {
      ctx.fillStyle = "#333";
      ctx.fillText("no candles yet", 12, h / 2);
      return;
    }
    const prices = candles.map(c => Number(c.p)).filter(x => Number.isFinite(x));
    if (!prices.length) return;
    const min = Math.min(...prices), max = Math.max(...prices);
    const span = (max - min) || 1;
    ctx.strokeStyle = (opts && opts.color) || "#64d2ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = (i / (candles.length - 1)) * (w - 8) + 4;
      const y = h - 4 - ((Number(c.p) - min) / span) * (h - 8);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (opts && opts.exitLine != null) {
      const y = h - 4 - ((opts.exitLine - min) / span) * (h - 8);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#ff9f0a";
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
};
