# TODO

## DOING

## NEXT TODO
- [ ] Better dungeon generation
  - [ ] Allow generation in any direction (currently bottom direction is disabled to avoid cyclic paths)
  - [ ] Consider maze-like generation (multiple possible paths)
- [ ] Power ups - needs more thought on what they should be and how they should work
      Examples: Time stop, damage increase, shield, speed increase, etc.
- [ ] Add speed up option for recording playback

## SHOULD BE FIXED
- [ ] During later levels, the pathfinding slows down the game significantly.
      Probably, need to put a smaller limit on the number of iterations for
      pathfinding. Or adjust the limit dynamically based on the number of entities
      in the room.

## BACKLOG

### Features
- [ ] Final boss - describe it first.

### Low priority features
- [ ] Have different types of the projectiles - TBD.
- [ ] Tank armor - TBD. Could be a power up or specisic to a separate tank type.
- [ ] Enemy spawning: Make the enemies spawn in waves, with each wave being stronger than the previous one.

### Sounds And Music
- [ ] Main screen music?

### UX improvements
- [ ] Figure out correct room generation algorithm
- [ ] Add a Screenshake when player dies
- [ ] Add friction to projectile movement
- [ ] Change movement to move only by fractions of cells (e.g. 1/16 of a cell)
      This will be easier to pathfind. And also will *may* the UX by fixing the issue with the player being able to pass through blocks.
- [ ] Display the control hints during the start of the game in a non-intrusive way
      For example, display the controls in the bottom left corner of the screen for a few seconds or have them half-transparent.
      Another option is to display the controls to the right of the menu since that area if free.

### Visual improvements
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
- [ ] Improve Camera handling
    - [ ] Logic to not draw offscreen entities is not working correctly during zooming
    - [ ] Split camera into Player camera and Dev Camera
    - [ ] Zoom towards the mouse position
    - [ ] Add smooth zooming in and out
- [ ] Hot reload for development?
- [ ] Sometimes after moving the camera manually, after trying to reset it, it's not zoomed correctly (slightly zoomed out so the world border is visible)

### Low priority bugs
- [ ] Fix projectile size (it's bigger than it visually is)
- [ ] Disable smoothing in a way that it doesn't cause jittering.
- [ ] Fix tanks moving too fast when the frame rate drops (usually this happens during explosions)
      Update (24.05.2025): This doesn't seem to preproduce anymore or at least it's a lot rarer now.
- [ ] Fix sound explosion delay
- [ ] Fix: `The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.` on page load.
      Probably, need to blur the game and wait the user to click on the game area before starting the audio context.

### Low priority improvements
- [ ] Make enemies shoot only when they see the player
- [ ] Tracks animation speed should be dependent by the speed of the tank.
      This is needed so it feels like track actually reflect the movement.

### Refactoring
- [ ] Outline how objects/classes should access each other (global vars/props/DI etc) (eg Renderer, Input, Sound, EntityManager, Entity etc)
- [ ] Detach simulation out of entities and manager
- [ ] Better way to store images and sprites (how bad Image is?)
- [ ] Better coordinates system (consider defining something like `WorldPosition`)
- [ ] Use transformation matrices for calculating rotation and translation. Consider performance hits
- [ ] Create a separate Sprite class for static objects / non-animated

### Not sure about
- [ ] Try out Entity Component System (ECS)
- [ ] Use states for animations ([see](https://www.youtube.com/watch?v=e3LGFrHqqiI))
