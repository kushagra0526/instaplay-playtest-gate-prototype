const G = {
  reset() {
    this.cols = 18; this.rows = 32; this.dir = [1, 0]; this.next = [1, 0]; this.acc = 0;
    this.body = [[5, 16], [4, 16], [3, 16]];
    /*IF:instant*/this.body = [[0, 16], [1, 16], [2, 16]]; this.dir = [-1, 0]; this.next = [-1, 0];/*FI*/
    this.food = this.place();
  },
  place() { return [Math.floor(rand() * this.cols), Math.floor(rand() * this.rows)]; },
  update(dt, inp) {
    let gain = 0, dead = false;
    const want = inp.left ? [-1, 0] : inp.right ? [1, 0] : inp.up ? [0, -1] : inp.down ? [0, 1] : null;
    if (want && !(want[0] === -this.dir[0] && want[1] === -this.dir[1])) this.next = want;
    this.acc += dt;
    while (this.acc >= @@STEP@@) {
      this.acc -= @@STEP@@; this.dir = this.next;
      let h = [this.body[0][0] + this.dir[0], this.body[0][1] + this.dir[1]];
      /*IFNOT:never*/if (h[0] < 0 || h[1] < 0 || h[0] >= this.cols || h[1] >= this.rows || this.body.some(s => s[0] === h[0] && s[1] === h[1])) { dead = true; break; }/*FI*/
      /*IF:never*/h = [(h[0] + this.cols) % this.cols, (h[1] + this.rows) % this.rows];/*FI*/
      this.body.unshift(h);
      if (h[0] === this.food[0] && h[1] === this.food[1]) { gain++; this.food = this.place(); } else this.body.pop();
    }
    return { gain, dead };
  },
  draw(c) {
    c.fillStyle = '@@HZ@@'; c.fillRect(this.food[0] * 20 + 2, this.food[1] * 20 + 2, 16, 16);
    c.fillStyle = '@@FG@@'; for (const s of this.body) c.fillRect(s[0] * 20 + 1, s[1] * 20 + 1, 18, 18);
  }
};
