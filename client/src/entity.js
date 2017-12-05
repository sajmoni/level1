import { World, Events } from 'matter-js';

import * as Core from './core-internal';
import * as Render from './render-internal';
import * as Collision from './collision-internal';
import syncSpriteWithBodyBehavior from './behaviours/syncSpriteWithBody';

export function create(id) {
  if (!id) throw new Error('Entity.create(id) takes a unique id as an argument');
  const behaviors = {};
  const entity = {
    id,
    type: '',
    sprite: null,
    hasBody: false,
    behaviors,
    run: (entity) => { // eslint-disable-line no-shadow
      Object.keys(behaviors).forEach((b) => {
        const behavior = behaviors[b];
        if (behavior.init) {
          behavior.init(behavior, entity);
          delete behavior.init;
        }
        if (!behavior.run) throw new Error(`Behaviour ${b} on entity ${id} has no run function`);
        behavior.run(behavior, entity);
      });

      // Display hitboxes
      const { body, sprite } = entity;
      if (body.parts) {
        Render.displayBodyBounds(body);
      } else if (sprite) {
        Render.displaySpriteBounds(sprite);
      }
    },
  };

  const defaultBody = {
    entity,
  };
  entity.body = defaultBody;

  Core.add(entity);
  return entity;
}

function applyOptions(sprite, options) {
  if (options) {
    const { zIndex } = options;
    sprite.zIndex = zIndex || 0;
  }
}

/*
OPTIONS:
{
  zIndex: 999
}
*/
export function addSprite(entity, filename, options) {
  const sprite = Render.getSprite(filename);

  applyOptions(sprite, options);
  Render.add(sprite);
  entity.sprite = sprite;
  return sprite;
}

export function addAnimation(entity, filenames, animationSpeed = 0.05, options) {
  const sprite = Render.getAnimation(filenames, animationSpeed);

  applyOptions(sprite, options);
  Render.add(sprite);
  sprite.play();
  entity.sprite = sprite;
  return sprite;
}

export function addBody(entity, body, syncSpriteWithBody = true) {
  const engine = Core.getPhysicsEngine();
  World.add(engine.world, [body]);
  body.entity = entity;
  entity.body = body;
  entity.hasBody = true;
  if (syncSpriteWithBody) {
    entity.behaviors.syncSpriteWithBody = syncSpriteWithBodyBehavior();
  }
  return body;
}

export function removeBody(body) {
  const engine = Core.getPhysicsEngine();
  World.remove(engine.world, [body]);
}

export function destroy(entity) {
  Core.remove(entity);
  const { sprite, animation, body, hasBody } = entity;
  if (sprite) Render.remove(sprite);
  if (animation) Render.remove(animation);
  if (hasBody) removeBody(body);
}

/* 
  Collision types:
  collisionStart
  collisionEnd
*/

/*
  addCollision(entityType: string, otherTypes: array[string], onCollision: (bodyA, bodyB) => void, collisionType: string);
*/
export function addCollision(entityType, otherTypes, onCollision, collisionType = 'collisionActive') {
  const engine = Core.getPhysicsEngine();
  const getType = body => body.entity && body.entity.type;
  const collisionCheck = (typeToCheck, otherType) => typeToCheck === entityType && otherTypes.includes(otherType);
  Events.on(engine, collisionType, ({ pairs }) => {
    pairs.forEach(({ bodyA, bodyB }) => {
      const typeA = getType(bodyA);
      const typeB = getType(bodyB);
      if (!typeA || !typeB) return;

      if (collisionCheck(typeA, typeB) || collisionCheck(typeB, typeA)) {
        onCollision(bodyA, bodyB);
      }
    });
  });
}

// Remove collision?

// export function addCollisions(entityTypes, otherTypes, onCollision, collisionType = 'collisionActive') {
//   entityTypes.forEach((entityType) => addCollision(entityType, otherTypes, onCollision, collisionType));
// }

export function getAll() {
  return Core.getEntities();
}

export function getById(id) {
  return Core.getById(id);
}

export function get(id) {
  return Core.getById(id);
}

export function getByType(type) {
  return Core.getByType(type);
}

// Sprite collision
export function isColliding(entity, otherEntity) {
  if (Core.isPhysicsEnabled()) {
    console.warn('Entity.isColliding is for sprite collision detection. If using physics use Entity.addCollision instead');
  }
  return Collision.isColliding(entity, otherEntity);
}

export function overlappingRectangleArea(entity, otherEntity) {
  return Collision.overlappingRectangleArea(entity, otherEntity);
}
