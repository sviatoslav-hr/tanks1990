# TODO:

## Requirements

World:
- An open procedurally generated world with enemies and obstacles.
- It should also contain dungeons which are also procedurally generated with enemies and nice loot.

Camera:
- Camera should be very flexible to use
- There should be the ability to detach the camera in dev mode and move it positionally as you wish (probably with the mouse)
- There should be a zoom in/out options for the camera and the game should be scaled properly
- There should be some space on the screen for the things like score and maybe buttons like fullscreen


## IN_PROGRESS
- [ ] **Rework the score UI!!!**
    - [x] Allocate space on the screen for other info
    - [x] Display score somewhere on the screen while game is active
    - [ ] Display score on pause screen
    - [ ] Display score on the death screen
    - [ ] Display best score on the death screen
- [ ] Improve Camera handling
    - [x] Renderer should render stuff based on the camera position
    - [x] Add the ability to move the camera
    - [x] Don't draw stuff that is not visible on the screen
    - [x] Add the ability to zoom in/out
    - [x] Make the canvas the size of the whole page
    - [ ] Split camera into Player camera and Dev Camera
    - [ ] Zoom towards the mouse position
    - [ ] Add smooth zooming in and out
    - [ ] When camera follows the player, it should move a bit in front of the player to allow the player to see what's ahead
    - [ ] Screenshake when player dies?
- [ ] World boundaries
    - [ ] Determine based on max numbers in js what are the limitations of the world (boundaries)

## TODO
- [ ] Make enemies shoot only when they see the player
- [ ] Define game plan / trajectory / future development / main goal / idea
- [ ] Define custom RNG and use it everywhere instead of `Math.random()`
- [ ] Add friction to projectile movement
- [ ] Hot reload for development?

## FIXME
- [ ] Sometimes after moving the camera manually, after trying to reset it, it's not zoomed correctly (slightly zoomed out so the world border is visible)
- [ ] Enemy explosion effect is gray instead of green (cannot reproduce)
- [ ] Explosion effect image data may grab some black pixels from the boundary
- [ ] Enemies sometimes stuck when they need to move around the block (probably because of the collision detection and precision issues)
- [ ] Fix projectile size (it's bigger than it visually is)
- [ ] Fix sound explosion delay
- [ ] Cache best score instead of fetching it each frame
- [ ] Fix enemy tank stuck between blocks and rotating like crazy
- [ ] Better collision detection (see Handmade Hero series)
- [ ] Fix: `The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.` on page load

## REFACTOR
- [ ] Should just every entity have the `Renderer` reference as a field?
- [ ] Should `World` contain entities or only environment?
- [ ] Restructure coordinates system (consider defining something like `WorldPosition`)
- [ ] Better way to store images and sprites (how bad Image is?)
- [ ] Revisit entire *infinite mode* implementation
- [ ] Use transformation matrices for calculating rotation and translation
- [ ] Create a separate Sprite class for static objects / non-animated
- [ ] Consider using interface instead of class for `Vector2`

## Visuals
- [ ] Consider using [kenney.nl assets](https://kenney.nl/assets/top-down-tanks-redux)
- [ ] Add fire effect to gun
- [ ] Add some fire effect inside of the explosion (doesn't look like explosion otherwise)
- [ ] Add more particles [kenney.nl](https://kenney.nl/assets/particle-pack)

## Sounds
- [ ] Background music?
- [ ] Main screen music?

## Animations
- [ ] Use sprite image for explosion animation instead of circle
- [ ] Spawning
- [ ] Shooting
- [ ] Improve movement animation
- [ ] Improve explosion animation
- [ ] Rewrite the animation system to use progress values (0-1) instead of dt updates (look into ExplosionEffect)
- [ ] Consider using states for animations ([see](https://www.youtube.com/watch?v=e3LGFrHqqiI))

## New feature Ideas
- [ ] Power ups?
- [ ] Add Literal fullscreen button (in options or literally below the canvas)
- [ ] Add health and display it on top of tanks?
- [ ] Spawn random power-ups
- [ ] Add zoom in/out option
- [ ] More random obstacles/more variety
- [ ] Separate turret from tank and make it rotate independently
- [ ] Show error notifications in dev mode
    - [ ] Custom logger
- [ ] **Improvements**
    - [ ] Display UI hints
        - [ ] Improve controls hints [kenney.nl](https://kenney.nl/assets/input-prompts)
- [ ] **Power ups**
    - [ ] Think about what power ups there should be
        - [ ] Time stop
        - [ ] Damage increase (against stronger enemies?)
        - [ ] Shield
    - [ ] Spawn them randomly and draw as colored rects
    - [ ] Make them affect the player and enemies
    - [ ] Create assets
- [ ] Menu improvements
    - [x] Fix menu UI and UX
    - [x] Make menu resize with the game window
    - [ ] Add animation for menu showing up and exiting
    - [ ] Use font from kenney.nl
    - [ ] Freeze Death menu for a sec (so after dying you don't immediately start a new game accidentally)
- [ ] Revisit scaling (maybe scale manually instead of relying on CSS)

## IDK
- [ ] Setup ESLint
- [ ] Implement Entity Component System (ECS)

## DONE
- [x] FIX: After ~30s of playing, all tanks gain too much speed and start moving like crazy
      It was happening when frame rate dropped to about 30fps. It looks like the acceleration was frame rate dependent. Change the implementation of the acceleration so we can now specify the stopping time.
- [x] Define dev mode
- [x] Merge `Renderer` and `Context` classes. Remove game-specific code from `Renderer`.
- [x] Refactor sounds from globals to a class instance
- [x] Refactor storage, add custom wrapper
- [x] Introduce a concept of Camera so it's a separate thing
- [x] ***`Fix enemies stuck at the blocks or at each other like dumbasses. FIX ENEMY AI!!!`***
- [x] **Add developer panel**
- [x] Make movement more realistic, add inertian and friction (speed decreases over time unless entity is moving)
- [x] **Add projectile trail**
- [x] FIXME: Pause is not pausing
- [x] REFACTOR: Move `Projectile` out of `Tank` class and make it less dependent on `Tank`
- [x] REFACTOR: Define `World` class
- [x] REFACTOR: make `dt` be in seconds instead of milliseconds
- [x] Sprite for bullets
- [x] Add options to menu
- [x] Animation: polish explosion animation
- [x] FIXME: fix player not being able to pass past two blocks even though there is a gap
- [x] Static objects on map
    - [x] Create a static object (data type)
    - [x] Crate a sprite for a static objects
    - [x] Spawn random blocks (static objects) that cannot be passed through
    - [x] Update enemy ai: when enemy is facing the block, it should rotate ?
- [x] Add smoke to explosions
- [x] Find sounds (see [opengameart](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12&sort_by=count&sort_order=DESC))
- [x] Shooting
- [x] Explosion on being killed
- [x] **explosion on being killed (split the sprite into pieces and move them away)**
- [x] Shield
