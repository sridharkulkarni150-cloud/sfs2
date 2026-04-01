'use strict';

import { PART_CATALOG } from '../build/parts.js';

/** @param {CanvasRenderingContext2D} ctx @param {any} part */
export function drawPart(ctx, part) {
  const d = PART_CATALOG[part.type];
  ctx.save();
  ctx.translate(part.x, part.y);
  ctx.rotate(part.rotation || 0);
  ctx.fillStyle = d.color;
  ctx.strokeStyle = '#111933';
  if (part.type === 'nose_cone') {
    ctx.beginPath();
    ctx.moveTo(0, -d.height / 2);
    ctx.lineTo(-d.width / 2, d.height / 2);
    ctx.lineTo(d.width / 2, d.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
    ctx.strokeRect(-d.width / 2, -d.height / 2, d.width, d.height);
  }
  ctx.restore();
}
