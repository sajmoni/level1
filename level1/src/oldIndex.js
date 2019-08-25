import 'core-js/es/array/flat-map';
import uuid from 'uuid/v4';
import { Howl } from 'howler';
import Mousetrap from 'mousetrap';

const DEBUG_BEHAVIOR_ID = '_internal_l1_debug_info';

// TODO: Deprecate
const displayObjects = [];
let behaviors = [];

let _app;

let ratio = 1;
let gameWidth;
let gameHeight;

let lastTimeStamp = null;
let _logging = false;

const log = (text) => {
  if (_logging) {
    // eslint-disable-next-line no-console
    console.warn(text);
  }
};

// TODO: Deprecate
export const add = (
  displayObject,
  {
    parent = _app.stage,
    zIndex = null,
    id = `do-${uuid()}`,
    labels = [],
  } = {
    parent: _app.stage,
    zIndex: null,
    id: `do-${uuid()}`,
    labels: [],
  },
) => {
  parent.addChild(displayObject);
  displayObjects.push(displayObject);

  displayObject.l1 = {
    id,
    zIndex,
    labels,
  };

  displayObject.name = id;

  displayObject.l1.isDestroyed = () => !displayObject.parent;

  /*
    This is done to counteract a potential scale change on the canvas. Since changing the scale
    of a text object will make it blurry.

    This can be removed when Pixi makes it possible to scale text objects.
  */
  // Check if PIXI.Text
  // TODO: Move this functionality to a utility function
  if (displayObject.style) {
    displayObject.l1.originalSize = displayObject.style.fontSize;
    displayObject.style = {
      ...displayObject.style,
      fontSize: displayObject.style.fontSize * ratio,
    };
    displayObject.scale.set(1 / ratio);
  }

  if (zIndex !== undefined && zIndex !== null) {
    updateRenderLayers(parent);
  }
};

// TODO: Deprecate
export const get = (id) => displayObjects.find(displayObject => displayObject.l1.id === id);

// TODO: Deprecate
export const getAll = () => displayObjects;

// TODO: Deprecate
const remove = (displayObject) => {
  // Mutate original array for performance reasons
  const indexToRemove = displayObjects.indexOf(displayObject);
  if (indexToRemove >= 0) {
    displayObjects.splice(indexToRemove, 1);
  }
};

export const init = (app, options = {}) => {
  const {
    debug = false,
    logging = false,
    onError = () => {},
  } = options;
  app.ticker.add(update(onError));

  gameWidth = app.renderer.width;
  gameHeight = app.renderer.height;

  _app = app;

  if (debug) {
    createDebugInformation();
  }
  _logging = logging;
};

const update = (onError) => (deltaTime) => {
  try {
    const before = performance.now();
    behaviors.forEach((behavior) => {
      const {
        data,
      } = behavior;

      if (!behavior.enabled) {
        return;
      }

      if (!behavior.initHasBeenCalled) {
        if (behavior.onInit) {
          behavior.onInit({ data });
        }
        behavior.initHasBeenCalled = true;
      }

      if (behavior.onUpdate) {
        behavior.onUpdate({
          counter: behavior.counter,
          deltaTime,
          data,
        });
      }

      if (behavior.duration > 0 && behavior.counter === behavior.duration && !behavior.finished) {
        behavior.finished = true;
        if (behavior.onComplete) {
          behavior.onComplete({ data });
        }
        if (behavior.loop) {
          resetBehavior(behavior);
        } else if (behavior.removeOnComplete && behavior.enabled) {
          removeBehavior(behavior);
        }
      }

      behavior.counter += 1;
    });
    const after = performance.now();
    lastTimeStamp = after - before;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('l1: Error running behaviors', error);
    onError(error);
  }
};

export const removeBehavior = (behavior) => {
  let behaviorObject;
  if (typeof behavior === 'string') {
    behaviorObject = getBehavior(behavior);
  } else {
    behaviorObject = behavior;
  }
  if (!behaviorObject) {
    log(`level1: Tried to remove non-existent behavior: ${behavior}`);
  } else {
    behaviors = behaviors.filter((b) => b.id !== behaviorObject.id);
    behaviorObject.enabled = false;
    if (behaviorObject.onRemove) {
      behaviorObject.onRemove({ data: behaviorObject.data });
    }
  }
};

export const getAllBehaviors = () => behaviors.filter(b => b.id !== DEBUG_BEHAVIOR_ID);

export const getBehavior = (id) => behaviors.find((behavior) => behavior.id === id);

export const getBehaviorByLabel = (label) => behaviors
  .filter((behavior) => behavior.labels.includes(label));

export const resetBehavior = (behavior) => {
  if (typeof behavior === 'string') {
    behavior = getBehavior(behavior);
  }
  if (!behavior) {
    log(`level1: Tried to reset non-existent behavior: ${behavior}`);
  } else {
    behavior.counter = 0;
    behavior.finished = false;
  }
};

function behaviorExists(id) {
  return behaviors.some((behavior) => behavior.id === id);
}

export const addBehavior = (
  {
    id = `behavior-${uuid()}`,
    labels = [],
    duration = 0,
    loop = false,
    removeOnComplete = true,
    onUpdate = null,
    onComplete = null,
    onInit = null,
    onRemove = null,
    enabled = true,
    data = {},
    ...unknownProperties
  },
) => {
  if (behaviorExists(id)) {
    log(`level1: Behavior with id ${id} already exists`);
    removeBehavior(id);
  }

  if (Object.keys(unknownProperties).length > 0) {
    log(`level1: Unknown properties on behavior "${id}": ${Object.keys(unknownProperties)}`);
  }

  if (!Number.isInteger(duration)) {
    log(`level1: behavior "${id}"s duration was not integer, was rounded down to nearest integer`);
  }

  if (!duration && onComplete) {
    log(`level1: behavior "${id}"s has an onComplete callback but no duration. onComplete will never be called`);
  }

  const newBehaviorObject = {
    id,
    labels,
    data,
    finished: false,
    counter: 0,
    duration: Math.round(duration),
    initHasBeenCalled: false,
    loop,
    removeOnComplete,
    onComplete,
    enabled,
    onInit,
    onUpdate,
    onRemove,
  };

  behaviors.push(newBehaviorObject);
  return newBehaviorObject;
};

export function getTexture(filename) {
  const {
    resources,
  } = _app.loader;

  const texture = Object
    .values(resources)
    .filter(resource => resource.textures)
    .flatMap(resource => Object.entries(resource.textures))
    .find(([key]) => key === `${filename}.png`);

  if (!texture) throw new Error(`level1: Texture "${filename}" not found.`);

  return texture[1];
}

export const getAllTextureIds = () => Object
  .values(_app.loader.resources)
  .filter(resource => resource.textures)
  .flatMap(resource => Object.keys(resource.textures))
  .map(key => key.substring(0, key.length - 4));


// Idea: Pass all text objects to resize?
export const resize = (width, height) => {
  ratio = Math.min(
    width / gameWidth,
    height / gameHeight,
  );

  _app
    .stage
    .scale
    .set(ratio);

  _app
    .renderer
    .resize(
      gameWidth * ratio,
      gameHeight * ratio,
    );

  /*
    The following code is needed to counteract the scale change on the whole canvas since
    texts get distorted by PIXI when you try to change their scale.
    Texts instead change size by setting their fontSize.
  */
  // TODO: This needs to be handled differently since the displayObjects array will be removed
  displayObjects
    .forEach((displayObject) => {
      // Check if PIXI.Text
      if (displayObject.style) {
        displayObject.style.fontSize = displayObject.l1.originalSize * ratio;
        displayObject.scale.set(1 / ratio);
      }
    });
};


// TODO: Deprecate
export const destroy = (
  displayObject,
  options = {
    children: true,
  },
) => {
  let id;
  if (typeof displayObject === 'string') {
    id = displayObject;
    displayObject = get(displayObject);
  }
  if (!displayObject) {
    log(`level1: Tried to remove non-existent displayObject: ${id}`);
  } else if (!displayObject.parent) {
    log(`level1: ${displayObject.name} has already been destroyed`);
  } else {
    // Check if it has been added to l1
    if (displayObject.l1) {
      if (options.children) {
        getChildren(displayObject).forEach(remove);
      } else {
        remove(displayObject);
      }
    }

    displayObject.parent.removeChild(displayObject);
    displayObject.destroy(options);
  }
};

// TODO: Deprecate
export const getChildren = (displayObject) => {
  if (displayObject.children.length) {
    if (displayObject.l1) {
      return displayObject.children.flatMap(getChildren).concat(displayObject);
    }
    return displayObject.children.flatMap(getChildren);
  }
  if (displayObject.l1) {
    return [displayObject];
  }
  return [];
};

// TODO: Deprecate
export const updateRenderLayers = (displayObject) => {
  displayObject.children.sort((a, b) => {
    a.l1.zIndex = a.l1.zIndex || 0;
    b.l1.zIndex = b.l1.zIndex || 0;
    return a.l1.zIndex - b.l1.zIndex;
  });
};

// TODO: Make sure this works and document it. Probably won't be worth the time though...
export const loadAssetsFromServer = (path) => new Promise((resolve) => {
  fetch(`/${path}`)
    .then(data => data.text())
    .then(html => {
      // Create a dom element from the response in order to find the right node
      const el = document.createElement('html');
      el.innerHTML = html;
      const inAssetFolder = [...el.querySelectorAll(`a[href^='/${path}']`)];
      if (inAssetFolder.length > 0) {
        const { loader } = _app;
        let subFolders = [];

        inAssetFolder
          .map((f) => f.innerHTML)
          .forEach((fileName) => {
            if (fileName === '../') {
              return;
            }

            // Check if the fileName is a folder
            if (fileName.lastIndexOf('/') === fileName.length - 1) {
              subFolders = subFolders.concat(fileName.substring(0, fileName.length - 1));
              // Else we have a file that we should load
            } else {
              const name = fileName.substring(0, fileName.lastIndexOf('.'));
              if (name.length === 0) {
                log(`level1: Asset loader ignoring ${fileName} due to empty file name`);
              } else if (fileName.substring(fileName.lastIndexOf('.'), fileName.length) === '.json') {
                loader.add(`${path}/${fileName}`);
              }
              log(`level1: Asset loader ignoring ${fileName} due to only supporting .json files`);
            }
          });
        Promise.all(subFolders.map((subfolder) => loadAssetsFromServer(`${path}/${subfolder}`))).then(resolve);
      } else {
        log('level1: No assets detected in assets folder');
        resolve();
      }
    });
});

export const toRadians = angle => angle * (Math.PI / 180);

export const grid = ({
  x, y, marginX, marginY, itemsPerRow,
}) => (index) => {
  const row = Math.floor(index / itemsPerRow);
  const column = index % itemsPerRow;
  return {
    x: x + (column * marginX),
    y: y + (row * marginY),
  };
};

export const getRandomInRange = (from, to) => Math.floor((Math.random() * (to - from)) + from);

// makeDraggable
const startEvents = [
  'mousedown',
  'touchstart',
];

const endEvents = [
  'pointerup',
  'pointerupoutside',
];

const moveEvents = [
  'pointermove',
];

const noop = () => {};

export const makeDraggable = (displayObject, options = {}) => {
  const {
    onDragStart = noop,
    onDragEnd = noop,
    onDragMove = noop,
    disabler = () => false,
  } = options;

  displayObject.interactive = true;

  startEvents.forEach((event) => {
    displayObject.on(event, onDragStartInternal(displayObject, onDragStart, disabler));
  });

  endEvents.forEach((event) => {
    displayObject.on(event, onDragEndInternal(displayObject, onDragEnd, disabler));
  });

  moveEvents.forEach((event) => {
    displayObject.on(event, onDragMoveInternal(displayObject, onDragMove, disabler));
  });
};

const onDragMoveInternal = (displayObject, onDragMove, disabler) => () => {
  if (disabler()) {
    return;
  }

  if (displayObject.dragging) {
    const { x, y } = displayObject.l1.dragData.getLocalPosition(displayObject.parent);
    onDragMove({ x, y });
  }
};

const onDragStartInternal = (displayObject, onDragStart, disabler) => (event) => {
  if (disabler()) {
    return;
  }

  displayObject.l1.dragData = event.data;
  displayObject.dragging = true;

  const { x, y } = displayObject.l1.dragData.getLocalPosition(displayObject.parent);

  onDragStart({ x, y });
};

const onDragEndInternal = (displayObject, onDragEnd, disabler) => () => {
  if (disabler() || !displayObject.l1.dragData) {
    return;
  }

  const { x, y } = displayObject.l1.dragData.getLocalPosition(displayObject.parent);

  onDragEnd({ x, y });

  displayObject.dragging = false;
  displayObject.l1.dragData = null;
};

// makeDraggable end

// TODO: Rename to getGameScale
export const getScale = () => ratio;

export const angle = ({
  x1, y1, x2, y2,
}) => {
  const xDistance = x2 - x1;
  const yDistance = y2 - y1;
  let _angle = Math.atan(yDistance / xDistance);
  if (x1 - x2 < 0) {
    _angle += Math.PI;
  }
  return _angle;
};

// Convert #ff00ff to 0xff00ff
export const convertColorHex = color => `0x${color.substring(1, color.length)}`;

export const distance = ({
  x1, y1, x2, y2,
}) => Math.hypot(Math.abs(x2 - x1), Math.abs(y2 - y1));

/*
  This is required to be used for any scale change of Text
*/
// TODO: Evaluate how to do this better
export const scaleText = (displayObject, fontSize) => {
  displayObject.l1.originalSize = fontSize;
  displayObject.style.fontSize = fontSize * ratio;
};

export const getGlobalPosition = (displayObject) => {
  const global = displayObject.toGlobal({ x: 0, y: 0 });

  return {
    x: global.x / ratio,
    y: global.y / ratio,
  };
};

const getWidth = (displayObject) => (displayObject.hitArea && displayObject.hitArea.width)
  || displayObject.width;
const getHeight = (displayObject) => (displayObject.hitArea && displayObject.hitArea.height)
  || displayObject.height;

export const isColliding = (displayObject, otherDisplayObject) => {
  const {
    x: entityX,
    y: entityY,
  } = getGlobalPosition(displayObject);

  const entityWidth = getWidth(displayObject);
  const entityHeight = getHeight(displayObject);

  const {
    x: otherEntityX,
    y: otherEntityY,
  } = getGlobalPosition(otherDisplayObject);

  const otherEntityWidth = getWidth(otherDisplayObject);
  const otherEntityHeight = getHeight(otherDisplayObject);

  return (entityX + entityWidth >= otherEntityX
    && otherEntityX + otherEntityWidth >= entityX
    && entityY + entityHeight >= otherEntityY
    && otherEntityY + otherEntityHeight >= entityY);
};

export const getOverlappingArea = (displayObject, otherDisplayObject) => {
  if (!isColliding(displayObject, otherDisplayObject)) {
    return 0;
  }

  const {
    x: entityX,
    y: entityY,
  } = getGlobalPosition(displayObject);

  const entityWidth = getWidth(displayObject);
  const entityHeight = getHeight(displayObject);

  const {
    x: otherEntityX,
    y: otherEntityY,
  } = getGlobalPosition(otherDisplayObject);

  const otherEntityWidth = getWidth(otherDisplayObject);
  const otherEntityHeight = getHeight(otherDisplayObject);

  const minX = Math.max(entityX, otherEntityX);
  const maxX = Math.min(entityX + entityWidth, otherEntityX + otherEntityWidth);
  const dX = maxX - minX;

  const minY = Math.max(entityY, otherEntityY);
  const maxY = Math.min(entityY + entityHeight, otherEntityY + otherEntityHeight);
  const dY = maxY - minY;

  return dX * dY;
};

export const displayHitBoxes = (displayObject, graphics) => addBehavior({
  id: `${(displayObject.l1 && displayObject.l1.id) || displayObject.name}-displayHitBoxes`,
  onInit: () => {
    add(graphics);
  },
  onUpdate: () => {
    if (displayObject && !displayObject.l1.isDestroyed()) {
      const width = getWidth(displayObject);
      const height = getHeight(displayObject);

      const { x, y } = getGlobalPosition(displayObject, ratio);

      graphics
        .clear()
        .lineStyle(2, 0xFFFFFF, 1)
        .moveTo(x, y)
        .lineTo(x + width, y)
        .lineTo(x + width, y + height)
        .lineTo(x, y + height)
        .lineTo(x, y);
    }
  },
});

/*
  Check Howler docs for available options
*/
const getSound = (filePath, options) => new Howl({
  src: [filePath],
  ...options,
});

export const sound = (options) => {
  const {
    src,
    volume,
    loop,
  } = options;

  const _sound = getSound(src, { volume, loop });

  _sound.play();

  return _sound;
};

// LABELS

// TODO: Deprecate
export const addLabel = (displayObject, label) => {
  displayObject.l1.labels.push(label);
};

// TODO: Deprecate
export const removeLabel = (displayObject, label) => {
  displayObject.l1.labels = displayObject.l1.labels.filter(_label => _label !== label);
};

// TODO: Deprecate
export const getByLabel = (label) => displayObjects
  .filter(displayObject => displayObject.l1.labels.includes(label));

// TODO: Remove display objects
const createDebugInformation = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  container.style.backgroundColor = 'rgba(0,0,0,0.5)';
  container.style.position = 'absolute';
  container.style.top = '0px';
  container.style.zIndex = 1;
  container.style.color = 'white';

  addBehavior({
    id: DEBUG_BEHAVIOR_ID,
    duration: 30,
    loop: true,
    data: {
      timeStamps: [],
    },
    onComplete: ({ data }) => {
      const averageLoopDuration = data.timeStamps
        .reduce((acc, ts) => acc + ts, 0)
        / data.timeStamps.length;
      container
        .innerHTML = `fps: ${Math.ceil(_app.ticker.FPS)} b: ${getAllBehaviors().length} do: ${getAll().length} Loop duration: ${averageLoopDuration.toFixed(5)}`;
      data.timeStamps = [];
    },
    onUpdate: ({ data }) => {
      data.timeStamps.push(lastTimeStamp);
    },
  });
};

export const getLoopDuration = () => lastTimeStamp;

/* Keyboard input */
const pressed = {};

export function isKeyDown(keyCode) {
  return pressed[keyCode];
}

function onKeyDown(event) {
  pressed[event] = true;
}

function onKeyUp(event) {
  pressed[event] = false;
}

export function addKey(key) {
  Mousetrap.bind(key, () => {
    onKeyDown(key);
  }, 'keydown');
  Mousetrap.bind(key, () => {
    onKeyUp(key);
  }, 'keyup');
}