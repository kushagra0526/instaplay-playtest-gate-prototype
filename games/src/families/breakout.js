const G = {
  reset() {
    this.px = W / 2; this.bx = W / 2; this.by = 520;
    this.vx = (rand() < 0.5 ? -1 : 1) * @@BV@@ * (0.4 + rand() * 0.4); this.vy = -@@BV@@;
    /*IF:instant*/this.by = 620; this.vy = @@BV@@;/*FI*/
    this.bricks = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) this.bricks.push({ x: 12 + c * 56, y: 80 + r * 24, alive: true });
  },
  update(dt, inp) {
    let gain = 0, dead = false;
    this.px += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * @@PSPEED@@ * dt;
    this.px = Math.max(40, Math.min(W - 40, this.px));
    this.bx += this.vx * dt; this.by += this.vy * dt;
    if (this.bx < 6 || this.bx > W - 6) { this.vx = -this.vx; this.bx = Math.max(6, Math.min(W - 6, this.bx)); }
    if (this.by < 6) this.vy = Math.abs(this.vy);
    if (this.vy > 0 && this.by > 590 && this.by < 604 && Math.abs(this.bx - this.px) < 44) { this.vy = -Math.abs(this.vy); this.vx += (this.bx - this.px) * 4; }
    for (const b of this.bricks) if (b.alive && this.bx > b.x && this.bx < b.x + 52 && this.by > b.y && this.by < b.y + 20) { b.alive = false; this.vy = -this.vy; gain++; break; }
    if (this.bricks.every(b => !b.alive)) this.bricks.forEach(b => { b.alive = true; });
    if (this.by > H) {
      /*IFNOT:never*/dead = true;/*FI*/
      /*IF:never*/this.vy = -Math.abs(this.vy); this.by = H;/*FI*/
    }
    return { gain, dead };
  },
  draw(c) {
    c.fillStyle = '@@HZ@@'; for (const b of this.bricks) if (b.alive) c.fillRect(b.x, b.y, 52, 20);
    c.fillStyle = '@@FG@@'; c.fillRect(this.px - 40, 596, 80, 10);
    c.beginPath(); c.arc(this.bx, this.by, 6, 0, Math.PI * 2); c.fill();
  }
};
