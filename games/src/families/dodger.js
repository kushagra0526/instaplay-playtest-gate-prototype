const G = {
  reset() {
    this.px = W / 2; this.blocks = []; this.t = 0; this.spawn = 0.3;
    /*IF:instant*/this.blocks.push({ x: this.px - 15, y: 560, w: 30, h: 30, v: 0 });/*FI*/
  },
  update(dt, inp) {
    let gain = 0, dead = false;
    this.t += dt;
    this.px += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * @@PSPEED@@ * dt;
    this.px = Math.max(16, Math.min(W - 16, this.px));
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = Math.max(0.25, 0.7 - this.t * 0.01);
      const w = 24 + rand() * 30;
      this.blocks.push({ x: rand() * (W - w), y: -w, w, h: w, v: @@BSPEED@@ + rand() * 80 + this.t * 4 });
    }
    for (const b of this.blocks) b.y += b.v * dt;
    const before = this.blocks.length;
    this.blocks = this.blocks.filter(b => b.y < H);
    gain += before - this.blocks.length;
    /*IFNOT:never*/for (const b of this.blocks) if (b.x < this.px + 14 && b.x + b.w > this.px - 14 && b.y < 594 && b.y + b.h > 566) dead = true;/*FI*/
    return { gain, dead };
  },
  draw(c) {
    c.fillStyle = '@@FG@@'; c.fillRect(this.px - 14, 566, 28, 28);
    c.fillStyle = '@@HZ@@'; for (const b of this.blocks) c.fillRect(b.x, b.y, b.w, b.h);
  }
};
