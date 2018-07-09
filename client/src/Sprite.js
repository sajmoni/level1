import * as Render from './internal/Render';

/**
 * Flip Sprite horizontally
 * @param {PIXI.Srite|PIXI.AnimatedSprite|PIXI.Text} sprite
 */
// export function flipSprite(sprite) {
//   sprite.anchor.x = 1;
//   sprite.scale.x *= -1;
//   sprite.flipped = !sprite.flipped;
// }

export function show(entity, {
  texture, flipX = false, flipY = false, zIndex = 0,
}) {
  const sprite = Render.getSprite(texture);

  if (flipX) {
    sprite.anchor.x = 1;
    sprite.scale.x *= -1;
    sprite.flipX = flipX;
  }

  if (flipX) {
    sprite.anchor.y = 1;
    sprite.scale.y *= -1;
    sprite.flipY = flipY;
  }

  sprite.zIndex = zIndex;

  Render.add(sprite);

  // Put the body in the middle of sprite
  sprite.anchor.set(0.5);

  entity.asset = sprite;

  return sprite;
}

export function hide(entity) {
  const {
    asset,
  } = entity;

  if (asset) {
    Render.remove(asset);
  }

  entity.asset = null;
}