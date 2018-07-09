import { World, Events } from 'matter-js';
import * as Core from './internal/Core';
import syncEntityWithBody from './behaviors/syncEntityWithBody';

export function addBody(entity, body) {
  const engine = getEngine();
  World.add(engine.world, [body]);

  body.entity = entity;
  entity.body = body;
  entity.hasBody = true;

  entity.behaviors.syncEntityWithBody = syncEntityWithBody();

  return body;
}

export function removeBody(body) {
  const engine = getEngine();
  World.remove(engine.world, [body]);
}

export function getEngine() {
  return Core.getPhysicsEngine();
}

/*
  addCollision(entityType: string, otherTypes: array[string], onCollision: (bodyA, bodyB) => void, collisionType: string);
*/
export function addCollision(entityType, otherTypes, onCollision, collisionType = 'collisionActive') {
  const engine = Core.getPhysicsEngine();

  const getTypes = (body) => body.entity && body.entity.types;

  const collisionCheck = (typesA, typesB) => {
    const entityHasCollisionType = typesA.some((t) => t === entityType);
    const otherTypeShouldCollide = typesB.some((t) => otherTypes.includes(t));

    return entityHasCollisionType && otherTypeShouldCollide;
  };

  Events.on(engine, collisionType, ({ pairs }) => {
    pairs.forEach(({ bodyA, bodyB }) => {
      const typesA = getTypes(bodyA);
      const typesB = getTypes(bodyB);
      if (!typesA || !typesB) throw new Error('Trying to check collision on entities ');

      if (collisionCheck(typesA, typesB) || collisionCheck(typesB, typesA)) {
        onCollision(bodyA, bodyB);
      }
    });
  });
}

export function removeCollision() {
  // TODO
}

export function removeAllCollisions() {
  const engine = Core.getPhysicsEngine();
  Events.off(engine);
}