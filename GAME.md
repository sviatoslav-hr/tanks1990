# Game Specification

## World/Environment

For simplicity, world is dimensional and consists of square blocks.
Also, all entities can only move in 4 directions (North, South, East, West).
And since I don’t want to craft the levels manually, they are procedurally generated.
The generation algorithm should be based on the seed, so the world could be regenerated with the same seed.
(The seed should be stored in the query string of the URL, so the game could be shared with the same seed.)

Each level is basically a closed room with a bunch of enemies inside.
Since we have measure the completion time, there is a limited and fixed number of rooms.
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

Player is spawned in the center of the first room.
At the start of the game, player has a basic tank (the weakest tank?).
Player can improve the tank (see power-ups).
Player controls the tank either with a keyboard (WASD) or with a gamepad.

*Consider making this game playable on a phone or tablet. I this case I would need to make my own onscreen controls.


## Power-ups

Player tank can be improved in such ways:
- Damage output (tank turret)
- DPM - shoots faster (tank turret)
- Movement speed (tank body)
- More HP (tank body)

* There also could be a missile upgrade that would flight straight to the closest enemy tank.

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

## Final Boss

The Final Boss is also a tank (I know, surprisingly).
It will have 3 phases.
In each phase Boss will use different skills/abilities, maybe? Not sure what those are supposed to be, yet.

After killing the boss, the time of finishing the game will be displayed. The fastest completion time should be saved and displayed somewhere (probably, on menu screen).

*I need to consider having a local leaderboard with best completion times. But this is very low priority, the game should be close to being finished before I even consider this.

## Score

* Not sure if score still makes sense. Originally score was added when enemies were spawning infinitely, but they don't anymore. There will always be the same number of enemies, so what purpose does score serve? It seems to be an artifast of the past.

- Score is calculated based on the number of killed enemies.
- In playing state, the score is displayed at the top of the screen.
- In pause or dead state, the score is displayed to the left of the menu.
- After player died, if the score is higher than the highest score, the highest score will be updated and stored.

## Open Questions

- How many obstacles should be in the room?

### Camera

- Camera should be very flexible to use
- There should be the ability to detach the camera in dev mode and move it positionally as you wish (probably with the mouse)
- There should be a zoom in/out options for the camera and the game should be scaled properly
- There should be some space on the screen for the things like score and maybe buttons like fullscreen
