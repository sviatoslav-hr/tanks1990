# TODO

## DOING

## NEXT TODO
- [ ] Pathfinding: Double check/reimplement the pathfinding to fully implements A* algorithm
- [ ] Add animation/SFX to room door opening to hint player that's where he needs to go next

## SHOULD BE FIXED
- [ ] Recording speed mult doesn't really speed up the recording
- [ ] Mute is not working across sessions (does not reproduce locally)
- [ ] Battle music starts regardless muted or not
- [ ] **Movement improvement!** (Choose one approach)
    a. Change movement to move only by fractions of cells (e.g. 1/16 of a cell)
        This will be easier to pathfind. And also will *may* the UX by fixing the issue with the player being able to pass through blocks.
    b. Make tank model behave like it's more "rounded" so it sort of squeezes between blocks
- [ ] Pathfinding: During later levels, the pathfinding slows down the game significantly.
      Probably, need to put a smaller limit on the number of iterations for
      pathfinding. Or adjust the limit dynamically based on the number of entities
      in the room.
- [ ] Pathfinding: Sometimes enemies build a path including a bunch of unnecessary turns (zigzag pattern)
- [ ] Pathfinding: When enemy is right next to a target, but the turret is not aligned with the target, it's not smart enough to adjust it's position.

## BACKLOG

### Features
- [ ] Final boss - describe it first.

### Refactoring
- [ ] Turn OOP code into procedural
  - Wave
  - State
  - Sounds
- [ ] Revisit events
- [ ] Outline how objects/classes should access each other (global vars/props/DI etc) (eg Renderer, Input, EntityManager, Entity etc)
- [ ] Better way to store images and sprites (how bad Image is?)
- [ ] Room creation code is too complex and intermingled... (see #roomgen)
- [ ] Better coordinates system (consider defining something like `WorldPosition`)
- [ ] Use transformation matrices for calculating rotation and translation. Consider performance hits
- [ ] Create a separate Sprite class for static objects / non-animated
- [ ] Look into where the menu is used/passed and check if menu can be detached from there (via events?)
- [ ] Cleanup color variables (.css and .color files)

### Low priority features
- [ ] Add a visual effect when the pickup is consumed
- [ ] Add a sound effect when the pickup is consumed by played
- [ ] Display somewhere what and how many "buffs" player has applied
- [ ] Have different types of the projectiles - TBD.
- [ ] Tank armor - TBD. Could be a power up or specific to a separate tank type.

### Sounds And Music
- [ ] Main screen music?
- [ ] Better hit sound

### UX improvements
- [ ] Add a Screen-shake when player dies
- [ ] Add friction to projectile movement

### Visual improvements
- [ ] Add a visual/sound effect when shield is going to disappear
- [ ] Add bouncing animation to pickups so they look more alive
- [ ] Make a proper sprite for the tank explosion effect
- [ ] Add some fire effect inside of the explosion (doesn't look like explosion otherwise)
- [ ] Fire effect to gun (when projectile is fired/spawned)
- [ ] Spawning effect for the tanks (Shining/teleporting effect?)
- [ ] Animation for opening the next room
      It might be best to have a piece of wall just collapse and become immediately passable so player doesn't have to wait for the animation to finish.
- [ ] More random obstacles/more variety
- [ ] Pick a better font for the menu (see kenney.nl)
- [ ] Improve controls hints [kenney.nl](https://kenney.nl/assets/input-prompts)

### Dev Mode improvements
- [ ] Add a limit for notifications to be displayed at once or collapse spamming ones
- [ ] Improve Camera handling
    - [ ] Logic to not draw offscreen entities is not working correctly during zooming
    - [ ] Zoom towards the mouse position
    - [ ] Add smooth zooming in and out
- [ ] Hot reload for development?

### Low priority bugs
- [ ] Fix projectile size (it's bigger than it visually is)
- [ ] Disable smoothing in a way that it doesn't cause jittering.
- [ ] Fix tanks moving too fast when the frame rate drops (usually this happens during explosions)
      Update (24.05.2025): This doesn't seem to preproduce anymore or at least it's a lot rarer now.
- [ ] Fix: `The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.` on page load.
      Probably, need to blur the game and wait the user to click on the game area before starting the audio context.
- [ ] Fix sound explosion delay - not sure it reproduces anymore.

### Low priority improvements
- [ ] Make enemies shoot only when they see the player
- [ ] Tracks animation speed should be dependent by the speed of the tank.
      This is needed so it feels like track actually reflect the movement.

### Not sure about
- [ ] Try out Entity Component System (ECS)
- [ ] Use states for animations ([see](https://www.youtube.com/watch?v=e3LGFrHqqiI))
- [ ] Should power ups be chosen randomly or should they be preselected (like enemies in waves)?
