// 4D animated wallpaper using moving blobs and gradients
(function() {
  const canvas = document.createElement('canvas');
  canvas.className = 'wallpaper-4d-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  });

  // Blob config
  const blobs = [
    { x: 0.3, y: 0.3, r: 180, dx: 0.0012, dy: 0.0015, color: '#2563eb' },
    { x: 0.7, y: 0.4, r: 140, dx: -0.001, dy: 0.0013, color: '#a21caf' },
    { x: 0.5, y: 0.7, r: 220, dx: 0.0011, dy: -0.001, color: '#f59e0b' },
    { x: 0.8, y: 0.8, r: 120, dx: -0.0012, dy: -0.0011, color: '#059669' }
  ];

  function draw() {
    ctx.clearRect(0, 0, width, height);
    blobs.forEach(blob => {
      const grad = ctx.createRadialGradient(
        blob.x * width, blob.y * height, blob.r * 0.2,
        blob.x * width, blob.y * height, blob.r
      );
      grad.addColorStop(0, blob.color + 'cc');
      grad.addColorStop(1, blob.color + '00');
      ctx.beginPath();
      ctx.arc(blob.x * width, blob.y * height, blob.r, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  function animate() {
    blobs.forEach(blob => {
      blob.x += blob.dx;
      blob.y += blob.dy;
      if (blob.x < 0.1 || blob.x > 0.9) blob.dx *= -1;
      if (blob.y < 0.1 || blob.y > 0.9) blob.dy *= -1;
    });
    draw();
    requestAnimationFrame(animate);
  }

  animate();
})();
