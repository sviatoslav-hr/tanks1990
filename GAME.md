# Game Specification

## World/Environment

For simplicity, world is dimensional and consists of square blocks.
Also, all entities can only move in 4 directions (North, South, East, West).
And since I don’t want to craft the levels manually, they are procedurally generated.
The generation algorithm should be based on the seed, so the world could be regenerated with the same seed.
(The seed should be stored in the query string of the URL, so the game could be shared with the same seed.)

Each level is basically a closed room with a bunch of enemies inside.
There is a limited number of rooms.
Enemies start to spawn as soon as player enters the room.
Last room should contain a "final boss".
There should be something fun after beating the final boss.

There should be a reward for clearing a room:
- There is a random chance of the next room being a "safe reward room".
- Killing enemies should give the player drops/power-ups.

All rooms are connected. In order to get access to the next room, the currect room should be cleared.
- After the room is cleared, the hallway to the next room opens.
- The player can go back to the previous room.
  Once the player enters the next room, the hallway between the two rooms is closed.


## Player
...

## Power-ups

## Enemies

There only one enemy type - a tank.
But there should be different types of tanks:
- Basic tank - moves and shoots
- Fast tank - moves faster than the basic tank, but has less HP
- Slow tank - moves slower than the basic tank, but has more HP

There also should be different turret types:
- Basic turret - shoots straight
- Fast turret - shoots faster than the basic turret, but has less damage
- Slow turret - shoots slower than the basic turret, but has more damage

There could be different combinations of tanks and turrets, which is randomly defined.
At the start of the game, player should only face the basic tanks.
As the player progresses, the game should spawn different types of tanks and with different turrets.

...

## Final Boss
...

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
