# TODO:

-   [ ] **Sounds**
    -   [x] find sounds (see [opengameart](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12&sort_by=count&sort_order=DESC))
    -   [x] shooting
    -   [x] explosion on being killed
    -   [ ] power ups?
    -   [ ] background music?
    -   [ ] main screen music?
-   [ ] **Animations**
    -   [x] **explosion on being killed (split the sprite into pieces and move them away)**
    -   [ ] Use sprite image for explosion animation instead of circle
    -   [ ] spawning
    -   [x] shield
    -   [ ] shooting
    -   [ ] improve movement animation
-   [ ] consider using interface instead of class for `Vector2`
-   [ ] sprite for bullets
-   [ ] add zoom in/out option
-   [ ] spawn random power-ups
-   [ ] **Setup map**
    -   [ ] Spawn random obstacles
    -   [ ] map editor?
-   [ ] **Power ups**
    -   [ ] about about what power ups there should be
        -   [ ] time stop
        -   [ ] damage increase (against stronger enemies?)
        -   [ ] shield
    -   [ ] spawn them randomly and draw as colored rects
    -   [ ] make them affect the player and enemies
    -   [ ] create assets
-   [ ] add health and display it on top of tanks?
-   [ ] Use transformation matrices
-   [ ] implement Entity Component System (ECS)
-   [ ] **move the camera instead and keep the player in the center** increase boundaries of the world
-   [ ] cache best score instead of fetching it each frame
-   [ ] freeze Death menu for a sec
-   [ ] consider using states for animations ([see](https://www.youtube.com/watch?v=e3LGFrHqqiI))
-   [ ] make movement more realistic (speed decreases over time unless entity is moving)