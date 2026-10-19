var G = {
  reset: function () {
    this.y = 0; this.vy = 0; this.obs = []; this.sp = 1.0; this.v = @@RUNV@@;
    /*IF:instant*/this.obs.push({ x: 60, w: 30, h: 50, passed: false });/*FI*/
  },
  update: function (dt, c) {
    var gain = 0, dead = false, i, o;
    this.v += 6 * dt;
    if ((c.action || c.up) && this.y === 0) this.vy = @@JUMP@@;
    this.vy -= @@GRAV@@ * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) this.vy = 0;
    this.sp -= dt;
    if (this.sp <= 0) { this.sp = 0.9 + rand() * 0.9; this.obs.push({ x: W + 20, w: 18 + rand() * 22, h: 30 + rand() * 40, passed: false }); }
    for (i = 0; i < this.obs.length; i++) { o = this.obs[i]; o.x -= this.v * dt; if (!o.passed && o.x + o.w < 60) { o.passed = true; gain++; } }
    this.obs = this.obs.filter(function (q) { return q.x > -80; });
    /*IFNOT:never*/for (i = 0; i < this.obs.length; i++) { o = this.obs[i]; if (o.x < 84 && o.x + o.w > 60 && this.y < o.h) dead = true; }/*FI*/
    return { gain: gain, dead: dead };
  },
  draw: function (c) {
    c.fillStyle = '#555'; c.fillRect(0, 560, W, 4);
    c.fillStyle = '@@HZ@@'; for (var i = 0; i < this.obs.length; i++) { var o = this.obs[i]; c.fillRect(o.x, 560 - o.h, o.w, o.h); }
    c.fillStyle = '@@FG@@'; c.fillRect(60, 530 - this.y, 24, 30);
  }
};
