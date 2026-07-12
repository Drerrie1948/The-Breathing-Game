# The Breathing Game — prototype

A mobile-first endless runner prototype using a locally bundled Three.js renderer for true 3D perspective, lighting, geometry, and camera turns.

## Run it

Open `index.html` directly, or serve this folder with any small local web server.

## Controls

- Swipe or arrow keys left/right to change lanes
- Swipe up or press up to jump
- Swipe down or press down to slide

Jump over the smaller sign-holding monkeys and barricades. Obstacle formations can block two lanes at once, so changing lanes is essential.

Challenge rows appear every 25 in-game meters. Each row always has at least one valid route, highlighted by a trail of blue **Fent** syringe pickups.

Every 250 meters, the road ends at a T-junction. Swipe toward an open street to trigger the 90-degree camera turn; some junctions visibly block one direction. Missing the junction ends the run.

## Audio attribution

“Vervet Monkey (Chlorocebus pygerythrus)” recorded by Roland McVicker, provided by the British Library via Wikimedia Commons, licensed under CC BY 4.0. The game uses short excerpts with randomized start points and minor playback-speed variation.

This first pass is a browser prototype. For Play Store release, it can be wrapped with Capacitor after the game loop, art direction, naming, audio, and content rating are finalized.
