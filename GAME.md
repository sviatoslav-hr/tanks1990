# Game Specification

## World/Environment

- An open procedurally generated world with enemies and obstacles.
- It should also contain dungeons which are also procedurally generated with enemies and nice loot.
TBD...

## Enemies

TBD...

## Score

- Score is calculated based on the number of killed enemies.
- In playing state, the score is displayed at the top of the screen.
- In pause or dead state, the score is displayed to the left of the menu.
- After player died, if the score is higher than the highest score, the highest score will be updated and stored.

## Open Questions

- What size rooms should have? Should the size be fixed or random?
- How many obstacles should be in the room?

### Camera

- Camera should be very flexible to use
- There should be the ability to detach the camera in dev mode and move it positionally as you wish (probably with the mouse)
- There should be a zoom in/out options for the camera and the game should be scaled properly
- There should be some space on the screen for the things like score and maybe buttons like fullscreen
