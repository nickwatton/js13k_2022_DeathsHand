# Death's Hand
## Horizontal scrolling space shooter for JS13K 2022 
http://js13kgames.com

## Game
- The player controls a spaceship, __Death's Hand__, that defends against waves of enemy __Skulls__.
- The Skulls have different power levels indicated by colour - ie they cause more damage and take more hits to die.
- The ship only has one bullet. And it's possible to miss all enemies, so the player does best by fighting close, moving fast, and shooting accurately.
- The ship is shielded, and can ram Skulls. But this causes damage, shown by shield size and colour.  
- The player gains powerups overtime. The shield gets stronger and the ships becomes more manoeuvrable.
	- Ideally this would be on-screen targets, but I ran out of time...
## Technical Approach
- Hand-drawn graphics - I wanted to try for this texture within the size constraints. Coloured shadow effects are used to create visual difference / interest
- Vanilla JavaScript. No frameworks for movement, collison, Events, etc
- Animated enemies, rocket flames, explosions and star-warp effects
- First 10 levels have designed enemy layouts. Subsequent levels are auto-generated
- Event driven with event subscription / dispatch pattern
	- Required Classes so instances could subscribe to dispatched events
  